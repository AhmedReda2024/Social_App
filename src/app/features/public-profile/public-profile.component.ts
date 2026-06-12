import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ProfileData } from '../../core/models/profile.interface';
import { SuggestionsService } from '../../core/services/suggestions/suggestions.service';
import { SinglePostComponent } from '../../shared/components/single-post/single-post.component';
import { FeedPostData, PostsListResponse } from '../feed/model/feed.interface';
import { PostsService } from '../feed/services/posts.service';

@Component({
  selector: 'app-public-profile',
  imports: [SinglePostComponent],
  templateUrl: './public-profile.component.html',
  styleUrl: './public-profile.component.css',
})
export class PublicProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly postsService = inject(PostsService);
  private readonly suggestionsService = inject(SuggestionsService);
  private readonly pageSize = 10;
  private readonly subscriptions = new Subscription();

  readonly profile = signal<ProfileData | null>(null);
  readonly posts = signal<FeedPostData[]>([]);
  readonly userId = signal('');
  readonly isFollowing = signal(false);
  readonly followersCount = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalPosts = signal(0);
  readonly isProfileLoading = signal(true);
  readonly isPostsLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly isFollowPending = signal(false);
  readonly profileError = signal(false);
  readonly postsError = signal(false);
  readonly followError = signal<string | null>(null);
  readonly hasMorePosts = computed(() => this.currentPage() < this.totalPages());

  private readonly redirectAuthenticatedProfile = effect(() => {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?._id ?? currentUser?.id ?? '';
    const routeUserId = this.userId();

    if (routeUserId && currentUserId && routeUserId === currentUserId) {
      void this.router.navigate(['/profile']);
    }
  });

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const userId = params.get('userId') ?? '';
        const currentUser = this.authService.currentUser();
        const currentUserId = currentUser?._id ?? currentUser?.id ?? '';

        if (userId && currentUserId && userId === currentUserId) {
          void this.router.navigate(['/profile']);
          return;
        }

        this.userId.set(userId);
        this.resetProfileState();

        if (!userId) {
          this.profileError.set(true);
          this.isProfileLoading.set(false);
          this.isPostsLoading.set(false);
          return;
        }

        this.loadProfile(userId);
        this.loadPosts(userId);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleFollow(): void {
    const userId = this.userId();
    if (!userId || this.isFollowPending()) {
      return;
    }

    const previousFollowing = this.isFollowing();
    const previousFollowers = this.followersCount();
    const optimisticFollowing = !previousFollowing;
    const followingCountDelta = optimisticFollowing ? 1 : -1;

    this.followError.set(null);
    this.isFollowPending.set(true);
    this.isFollowing.set(optimisticFollowing);
    this.followersCount.set(Math.max(0, previousFollowers + (optimisticFollowing ? 1 : -1)));
    this.authService.adjustFollowingCount(followingCountDelta);
    this.postsService.setFollowingUserVisibility(userId, optimisticFollowing);

    this.suggestionsService.followAndUnfollowUser(userId).subscribe({
      next: (response) => {
        const serverFollowing = response.data.following;
        if (serverFollowing !== optimisticFollowing) {
          this.authService.adjustFollowingCount(-followingCountDelta);
          this.postsService.setFollowingUserVisibility(userId, serverFollowing);
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
      },
      error: () => {
        this.isFollowing.set(previousFollowing);
        this.followersCount.set(previousFollowers);
        this.authService.adjustFollowingCount(-followingCountDelta);
        this.postsService.setFollowingUserVisibility(userId, previousFollowing);
        this.isFollowPending.set(false);
        this.followError.set('We could not update this follow. Please try again.');
      },
    });
  }

  retryProfile(): void {
    const userId = this.userId();
    if (userId) {
      this.loadProfile(userId);
    }
  }

  retryPosts(): void {
    const userId = this.userId();
    if (userId) {
      this.loadPosts(userId);
    }
  }

  loadMore(): void {
    if (!this.hasMorePosts() || this.isLoadingMore()) {
      return;
    }

    this.loadPosts(this.userId(), this.currentPage() + 1, true);
  }

  coverBackground(cover?: string | null): string {
    const overlay = 'linear-gradient(180deg, rgb(15 23 42 / 15%), rgb(15 23 42 / 38%))';
    return cover
      ? `${overlay}, url("${cover.replaceAll('"', '\\"')}")`
      : 'radial-gradient(circle at 88% 18%, rgb(125 184 223 / 75%), transparent 36%), linear-gradient(115deg, #172238 0%, #244c77 55%, #4b82ad 100%)';
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/images/default-profile.png';
  }

  private resetProfileState(): void {
    this.profile.set(null);
    this.posts.set([]);
    this.currentPage.set(1);
    this.totalPages.set(1);
    this.totalPosts.set(0);
    this.profileError.set(false);
    this.postsError.set(false);
    this.followError.set(null);
    this.isProfileLoading.set(true);
    this.isPostsLoading.set(true);
    this.isLoadingMore.set(false);
    this.isFollowPending.set(false);
  }

  private loadProfile(userId: string): void {
    this.isProfileLoading.set(true);
    this.profileError.set(false);

    this.authService.getUserProfile(userId).subscribe({
      next: (response) => {
        if (this.userId() !== userId) {
          return;
        }

        this.profile.set(response.data.user);
        this.isFollowing.set(response.data.isFollowing);
        this.followersCount.set(
          response.data.user.followersCount ?? response.data.user.followers?.length ?? 0,
        );
        this.isProfileLoading.set(false);
      },
      error: () => {
        if (this.userId() !== userId) {
          return;
        }

        this.profileError.set(true);
        this.isProfileLoading.set(false);
      },
    });
  }

  private loadPosts(userId: string, page = 1, append = false): void {
    append ? this.isLoadingMore.set(true) : this.isPostsLoading.set(true);
    this.postsError.set(false);

    this.authService.getUserPosts(userId, page, this.pageSize).subscribe({
      next: (response) => {
        if (this.userId() !== userId) {
          return;
        }

        const incoming = this.postsService.mapPosts(response);
        this.posts.set(append ? this.mergePosts(this.posts(), incoming) : incoming);
        this.updatePagination(response, page);
        this.isPostsLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        if (this.userId() !== userId) {
          return;
        }

        this.postsError.set(true);
        this.isPostsLoading.set(false);
        this.isLoadingMore.set(false);
      },
    });
  }

  private updatePagination(response: PostsListResponse, requestedPage: number): void {
    const pagination = response.meta?.pagination;
    this.currentPage.set(pagination?.currentPage ?? requestedPage);
    this.totalPages.set(pagination?.numberOfPages ?? 1);
    this.totalPosts.set(pagination?.total ?? this.posts().length);
  }

  private mergePosts(current: FeedPostData[], incoming: FeedPostData[]): FeedPostData[] {
    const ids = new Set(current.map((post) => post.id || post._id));
    return [...current, ...incoming.filter((post) => !ids.has(post.id || post._id))];
  }
}
