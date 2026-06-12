import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { UserSuggestionData } from '../../../core/models/suggestion.interface';
import { SuggestionsService } from '../../../core/services/suggestions/suggestions.service';

export type SuggestionCardVariant = 'compact' | 'full';

@Component({
  selector: 'app-suggestion-card',
  imports: [RouterLink],
  templateUrl: './suggestion-card.component.html',
  styleUrl: './suggestion-card.component.css',
})
export class SuggestionCardComponent implements OnInit {
  @Input({ required: true }) suggestion!: UserSuggestionData;
  @Input() variant: SuggestionCardVariant = 'compact';
  @Output() readonly followed = new EventEmitter<string>();

  private readonly suggestionsService = inject(SuggestionsService);
  private readonly authService = inject(AuthService);

  readonly isFollowing = signal(false);
  readonly followersCount = signal(0);
  readonly isFollowPending = signal(false);

  ngOnInit(): void {
    this.followersCount.set(this.suggestion.followersCount);
  }

  toggleFollow(): void {
    if (this.isFollowPending()) {
      return;
    }

    const previousFollowing = this.isFollowing();
    const previousFollowers = this.followersCount();
    const optimisticFollowing = !previousFollowing;
    const followingCountDelta = optimisticFollowing ? 1 : -1;

    this.isFollowPending.set(true);
    this.isFollowing.set(optimisticFollowing);
    this.followersCount.set(Math.max(0, previousFollowers + followingCountDelta));
    this.authService.adjustFollowingCount(followingCountDelta);

    this.suggestionsService.followAndUnfollowUser(this.suggestion._id).subscribe({
      next: (response) => {
        const serverFollowing = response.data.following;
        if (serverFollowing !== optimisticFollowing) {
          this.authService.adjustFollowingCount(-followingCountDelta);
        }

        this.isFollowing.set(serverFollowing);
        this.followersCount.set(
          Math.max(
            0,
            previousFollowers +
              (serverFollowing === previousFollowing ? 0 : serverFollowing ? 1 : -1),
          ),
        );
        this.isFollowPending.set(false);

        if (serverFollowing && !previousFollowing) {
          this.followed.emit(this.suggestion._id);
        }
      },
      error: () => {
        this.isFollowing.set(previousFollowing);
        this.followersCount.set(previousFollowers);
        this.authService.adjustFollowingCount(-followingCountDelta);
        this.isFollowPending.set(false);
      },
    });
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/images/default-profile.png';
  }
}
