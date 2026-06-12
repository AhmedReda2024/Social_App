import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserSuggestionData } from '../../core/models/suggestion.interface';
import { SuggestionsService } from '../../core/services/suggestions/suggestions.service';
import { SuggestionCardComponent } from '../../shared/components/suggestion-card/suggestion-card.component';

@Component({
  selector: 'app-suggestions',
  imports: [RouterLink, SuggestionCardComponent],
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.css',
})
export class SuggestionsComponent implements OnInit {
  private readonly pageSize = 20;
  private readonly suggestionsService = inject(SuggestionsService);
  private readonly excludedSuggestionIds = new Set<string>();

  readonly suggestions = signal<UserSuggestionData[]>([]);
  readonly searchQuery = signal('');
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly loadError = signal(false);
  readonly currentLimit = signal(this.pageSize);
  readonly hasMore = signal(true);
  readonly filteredSuggestions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.suggestions();
    }

    return this.suggestions().filter(
      (suggestion) =>
        suggestion.name.toLowerCase().includes(query) ||
        suggestion.username.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    this.currentLimit.set(this.pageSize);
    this.isLoading.set(true);
    this.loadError.set(false);

    this.suggestionsService.getFollowSuggestions(this.pageSize).subscribe({
      next: (response) => {
        const suggestions = this.filterExcluded(response.data.suggestions);
        this.suggestions.set(this.uniqueSuggestions(suggestions));
        this.hasMore.set(response.data.suggestions.length >= this.pageSize);
        this.isLoading.set(false);
      },
      error: () => {
        this.suggestions.set([]);
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  loadMoreSuggestions(): void {
    if (this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    const nextLimit = this.currentLimit() + this.pageSize;
    this.isLoadingMore.set(true);

    this.suggestionsService.getFollowSuggestions(nextLimit).subscribe({
      next: (response) => {
        const suggestions = this.filterExcluded(response.data.suggestions);
        this.suggestions.set(this.uniqueSuggestions([...this.suggestions(), ...suggestions]));
        this.currentLimit.set(nextLimit);
        this.hasMore.set(response.data.suggestions.length >= nextLimit);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoadingMore.set(false);
      },
    });
  }

  onSuggestionFollowed(userId: string): void {
    this.excludedSuggestionIds.add(userId);
    this.suggestions.update((suggestions) =>
      suggestions.filter((suggestion) => suggestion._id !== userId),
    );
    this.refillSuggestions();
  }

  private refillSuggestions(): void {
    const limit = this.currentLimit();

    this.suggestionsService.getFollowSuggestions(limit).subscribe({
      next: (response) => {
        const suggestions = this.filterExcluded(response.data.suggestions);
        this.suggestions.set(this.uniqueSuggestions(suggestions));
        this.hasMore.set(response.data.suggestions.length >= limit);
      },
    });
  }

  private filterExcluded(suggestions: UserSuggestionData[]): UserSuggestionData[] {
    return suggestions.filter((suggestion) => !this.excludedSuggestionIds.has(suggestion._id));
  }

  private uniqueSuggestions(suggestions: UserSuggestionData[]): UserSuggestionData[] {
    return Array.from(
      new Map(suggestions.map((suggestion) => [suggestion._id, suggestion])).values(),
    );
  }
}
