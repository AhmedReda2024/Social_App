import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ProfileData } from '../../core/models/profile.interface';
import { SuggestionsService } from '../../core/services/suggestions/suggestions.service';
import { FeedPostData, PostsListResponse } from '../feed/model/feed.interface';
import { PostsService } from '../feed/services/posts.service';
import { PublicProfileComponent } from './public-profile.component';

describe('PublicProfileComponent', () => {
  let component: PublicProfileComponent;
  let fixture: ComponentFixture<PublicProfileComponent>;
  let authService: FakeAuthService;
  let suggestionsService: FakeSuggestionsService;
  let postsService: {
    mapPosts: (response: PostsListResponse) => FeedPostData[];
    setFollowingUserVisibility: ReturnType<typeof vi.fn>;
  };
  const paramMap = new BehaviorSubject(convertToParamMap({ userId: 'user-2' }));

  class FakeAuthService {
    currentUser = signal<ProfileData | null>({ ...profile, _id: 'current-user' });
    adjustFollowingCount = vi.fn((delta: number) => {
      this.currentUser.update((user) =>
        user
          ? {
              ...user,
              followingCount: Math.max(
                0,
                (user.followingCount ?? user.following?.length ?? 0) + delta,
              ),
            }
          : user,
      );
    });
    getUserProfile = vi.fn(() =>
      of({
        success: true,
        message: 'success',
        data: { user: profile, isFollowing: false },
      }),
    );
    getUserPosts = vi.fn(() => of(postsResponse));
  }

  class FakeSuggestionsService {
    followAndUnfollowUser = vi.fn(() =>
      of({
        success: true,
        message: 'success',
        data: { following: true },
      }),
    );
  }

  beforeEach(async () => {
    authService = new FakeAuthService();
    suggestionsService = new FakeSuggestionsService();
    postsService = {
      mapPosts: (response: PostsListResponse) =>
        Array.isArray(response.data) ? response.data : (response.data.posts ?? []),
      setFollowingUserVisibility: vi.fn(),
    };
    paramMap.next(convertToParamMap({ userId: 'user-2' }));

    await TestBed.configureTestingModule({
      imports: [PublicProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap } },
        { provide: AuthService, useValue: authService },
        { provide: SuggestionsService, useValue: suggestionsService },
        { provide: PostsService, useValue: postsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads and renders the requested user profile and posts', () => {
    expect(authService.getUserProfile).toHaveBeenCalledWith('user-2');
    expect(authService.getUserPosts).toHaveBeenCalledWith('user-2', 1, 10);
    expect(fixture.nativeElement.textContent).toContain('Mona Ali');
    expect(fixture.nativeElement.textContent).toContain('@mona');
    expect(fixture.nativeElement.textContent).toContain('Public profile post');
    expect(fixture.nativeElement.textContent).toContain('Follow');
  });

  it('uses the Vibely name in the profile activity label', () => {
    const content = fixture.nativeElement.textContent as string;

    expect(content).toContain('Active on Vibely');
    expect(content).not.toContain('Active on Route Posts');
  });

  it('updates follow state and follower count while the request is pending', () => {
    const request = new Subject<{
      success: boolean;
      message: string;
      data: { following: boolean };
    }>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();
    fixture.detectChanges();

    expect(component.isFollowing()).toBe(true);
    expect(component.followersCount()).toBe(5);
    expect(authService.currentUser()?.followingCount).toBe(4);
    expect(authService.adjustFollowingCount).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.textContent).toContain('Following');
    expect(fixture.nativeElement.textContent).not.toContain('Updating...');
    expect(fixture.nativeElement.querySelector('.fa-circle-notch')).toBeTruthy();

    request.next({ success: true, message: 'success', data: { following: true } });
    request.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Following');
  });

  it('shows the unfollow result immediately while the request is pending', () => {
    const request = new Subject<{
      success: boolean;
      message: string;
      data: { following: boolean };
    }>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);
    component.isFollowing.set(true);
    component.followersCount.set(4);

    component.toggleFollow();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.public-profile-follow-button',
    ) as HTMLButtonElement;
    expect(component.isFollowing()).toBe(false);
    expect(component.followersCount()).toBe(3);
    expect(authService.currentUser()?.followingCount).toBe(2);
    expect(authService.adjustFollowingCount).toHaveBeenCalledWith(-1);
    expect(postsService.setFollowingUserVisibility).toHaveBeenCalledWith('user-2', false);
    expect(button.textContent).toContain('Follow');
    expect(button.textContent).not.toContain('Updating...');
    expect(button.querySelector('.fa-circle-notch')).toBeTruthy();

    request.next({ success: true, message: 'success', data: { following: false } });
    request.complete();
  });

  it('restores following-feed posts when an unfollow request fails', () => {
    suggestionsService.followAndUnfollowUser.mockReturnValue(throwError(() => new Error('failed')));
    component.isFollowing.set(true);

    component.toggleFollow();

    expect(postsService.setFollowingUserVisibility).toHaveBeenNthCalledWith(1, 'user-2', false);
    expect(postsService.setFollowingUserVisibility).toHaveBeenNthCalledWith(2, 'user-2', true);
  });

  it('reconciles following-feed visibility with the server response', () => {
    const request = new Subject<{
      success: boolean;
      message: string;
      data: { following: boolean };
    }>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();
    expect(postsService.setFollowingUserVisibility).toHaveBeenCalledWith('user-2', true);

    request.next({ success: true, message: 'success', data: { following: false } });
    request.complete();

    expect(postsService.setFollowingUserVisibility).toHaveBeenLastCalledWith('user-2', false);
  });

  it('rolls follow state back and shows an inline error when the request fails', () => {
    suggestionsService.followAndUnfollowUser.mockReturnValue(throwError(() => new Error('failed')));

    component.toggleFollow();
    fixture.detectChanges();

    expect(component.isFollowing()).toBe(false);
    expect(component.followersCount()).toBe(4);
    expect(authService.currentUser()?.followingCount).toBe(3);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(1, 1);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(2, -1);
    expect(fixture.nativeElement.textContent).toContain(
      'We could not update this follow. Please try again.',
    );
  });

  it('redirects the authenticated user to their private profile route', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    paramMap.next(convertToParamMap({ userId: 'current-user' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/profile']);
  });

  it('loads the next posts page once and prevents duplicate pending follow requests', () => {
    component.totalPages.set(2);
    component.loadMore();
    expect(authService.getUserPosts).toHaveBeenCalledWith('user-2', 2, 10);

    const request = new Subject<{
      success: boolean;
      message: string;
      data: { following: boolean };
    }>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();
    component.toggleFollow();

    expect(suggestionsService.followAndUnfollowUser).toHaveBeenCalledTimes(1);
  });
});

const profile: ProfileData = {
  _id: 'user-2',
  name: 'Mona Ali',
  username: 'mona',
  email: 'mona@example.com',
  photo: '/assets/images/default-profile.png',
  cover: null,
  followersCount: 4,
  followingCount: 3,
  postsCount: 1,
};

const post: FeedPostData = {
  _id: 'post-2',
  id: 'post-2',
  image: '',
  body: 'Public profile post',
  privacy: 'public',
  user: {
    _id: 'user-2',
    name: 'Mona Ali',
    username: 'mona',
    photo: '/assets/images/default-profile.png',
  },
  sharedPost: null,
  likes: [],
  createdAt: '2026-06-05T16:22:00.000Z',
  commentsCount: 0,
  topComment: null,
  sharesCount: 0,
  likesCount: 0,
  isShare: false,
  bookmarked: false,
};

const postsResponse: PostsListResponse = {
  success: true,
  message: 'success',
  data: { posts: [post] },
  meta: {
    pagination: {
      currentPage: 1,
      limit: 10,
      total: 1,
      numberOfPages: 1,
    },
  },
};
