import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuggestionsService } from '../../../../core/services/suggestions/suggestions.service';
import { UserSuggestionData } from '../../../../core/models/suggestion.interface';
import { SuggestionCardComponent } from '../../../../shared/components/suggestion-card/suggestion-card.component';

@Component({
  selector: 'app-suggested-friends',
  imports: [RouterLink, SuggestionCardComponent],
  templateUrl: './suggested-friends.component.html',
  styleUrl: './suggested-friends.component.css',
})
export class SuggestedFriendsComponent implements OnInit {
  private readonly suggestionLimit = 5;
  private readonly suggestionsService = inject(SuggestionsService);
  private readonly excludedSuggestionIds = new Set<string>();

  readonly suggestedFriends = signal<UserSuggestionData[]>([]);
  readonly searchQuery = signal('');
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly filteredFriends = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.suggestedFriends();
    }

    return this.suggestedFriends().filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) || friend.username.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.getSuggestedFriends();
  }

  getSuggestedFriends(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    this.suggestionsService.getFollowSuggestions(this.suggestionLimit).subscribe({
      next: (res) => {
        this.suggestedFriends.set(this.filterExcluded(res.data.suggestions));
        this.isLoading.set(false);
      },
      error: () => {
        this.suggestedFriends.set([]);
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  onSuggestionFollowed(userId: string): void {
    this.excludedSuggestionIds.add(userId);
    this.suggestedFriends.update((suggestions) =>
      suggestions.filter((suggestion) => suggestion._id !== userId),
    );

    this.suggestionsService.getFollowSuggestions(this.suggestionLimit).subscribe({
      next: (response) => {
        this.suggestedFriends.set(this.filterExcluded(response.data.suggestions));
      },
    });
  }

  private filterExcluded(suggestions: UserSuggestionData[]): UserSuggestionData[] {
    return suggestions.filter((suggestion) => !this.excludedSuggestionIds.has(suggestion._id));
  }
}
