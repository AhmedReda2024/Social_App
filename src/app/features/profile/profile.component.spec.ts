import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ProfileData } from '../../core/models/profile.interface';
import { FeedPostData, PostsListResponse } from '../feed/model/feed.interface';
import { PostsService } from '../feed/services/posts.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let postsService: FakePostsService;
  let authService: FakeAuthService;

  class FakeAuthService {
    currentUser = signal<ProfileData | null>(null);

    loadProfile() {
      const response = {
        success: true,
        message: 'success',
        data: {
          user: {
            _id: 'user-1',
            name: 'Ahmed Reda',
            username: 'ahmed_reda',
            email: 'ahmed@example.com',
            photo: '/assets/images/default-profile.png',
            cover: 'https://example.com/cover.jpg',
            followersCount: 4,
            followingCount: 2,
            bookmarksCount: 1,
          },
        },
      };
      this.currentUser.set(response.data.user);
      return of(response);
    }

    uploadProfilePhoto = vi.fn(() => of({ success: true }));
    uploadCoverPhoto = vi.fn(() => of({ success: true }));
    deleteCoverPhoto = vi.fn(() => of({ success: true }));
  }

  class FakePostsService {
    savedRequests = 0;
    currentFilter = signal('following');

    changeFilter(filter: string) {
      this.currentFilter.set(filter);
    }

    getMyPosts() {
      return of({
        success: true,
        message: 'success',
        data: { posts: [] },
        meta: { pagination: { currentPage: 1, numberOfPages: 1, total: 2 } },
      });
    }

    getSavedPosts() {
      this.savedRequests++;
      return of({
        success: true,
        message: 'success',
        data: { bookmarks: [] },
        meta: { pagination: { currentPage: 1, numberOfPages: 1, total: 1 } },
      });
    }

    mapPosts(_response: PostsListResponse, saved = false): FeedPostData[] {
      return [
        {
          _id: saved ? 'saved-post-1' : 'post-1',
          id: saved ? 'saved-post-1' : 'post-1',
          image: '',
          body: saved ? 'Saved post body' : 'My post body',
          privacy: 'public',
          user: {
            _id: 'user-1',
            name: 'Ahmed Reda',
            username: 'ahmed_reda',
            photo: '/assets/images/default-profile.png',
          },
          sharedPost: null,
          likes: [],
          createdAt: '2026-06-05T16:22:00.000Z',
          commentsCount: 7,
          topComment: null,
          sharesCount: 0,
          likesCount: 3,
          isShare: false,
          bookmarked: saved,
        },
      ];
    }
  }

  beforeEach(async () => {
    postsService = new FakePostsService();
    authService = new FakeAuthService();

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: PostsService, useValue: postsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the authenticated profile and API totals', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ahmed Reda');
    expect(text).toContain('@ahmed_reda');
    expect(text).toContain('ahmed@example.com');
    expect(component.myPostsTotal()).toBe(2);
    expect(postsService.savedRequests).toBe(0);
    expect(text).toContain('My post body');
    expect(text).toContain('3 likes');
    expect(text).toContain('7 comments');
    expect(fixture.nativeElement.querySelector('a[href="/post-details/post-1"]')).toBeTruthy();
  });

  it('renders an updated following count from the shared authenticated profile state', () => {
    authService.currentUser.update((user) => (user ? { ...user, followingCount: 1 } : user));
    fixture.detectChanges();

    const statCards = fixture.nativeElement.querySelectorAll('.stat-card');

    expect(statCards[1].textContent).toContain('Following');
    expect(statCards[1].querySelector('strong').textContent.trim()).toBe('1');
  });

  it('loads saved posts only when the Saved Posts tab is opened', () => {
    component.changeTab('saved');
    fixture.detectChanges();

    expect(postsService.savedRequests).toBe(1);
    expect(component.savedPostsTotal()).toBe(1);

    component.changeTab('posts');
    component.changeTab('saved');
    expect(postsService.savedRequests).toBe(1);
  });

  it('renders cover controls and formats generated photo posts', () => {
    component.myPosts.set([
      {
        ...postsService.mapPosts({} as PostsListResponse)[0],
        body: 'updated cover photo.',
        image: 'https://example.com/new-cover.jpg',
      },
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Change cover');
    expect(text).toContain('updated cover photo.');
    expect(
      fixture.nativeElement.querySelector('img[src="https://example.com/new-cover.jpg"]'),
    ).toBeTruthy();
  });

  it('shows inline cover upload progress and preserves the dialog after failure', () => {
    const request = new Subject<{ success: boolean }>();
    authService.uploadCoverPhoto.mockReturnValue(request);
    component.coverPreview.set('blob:cover-preview');
    component.isCoverDialogOpen.set(true);
    (component as any).coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });

    component.saveCover();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[aria-labelledby="cover-editor-title"]');
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(dialog.textContent).toContain('Saving cover...');

    request.error(new Error('upload failed'));
    fixture.detectChanges();

    expect(component.isCoverDialogOpen()).toBe(true);
    expect(component.coverPreview()).toBe('blob:cover-preview');
    expect(fixture.nativeElement.textContent).toContain(
      'We could not update your cover photo. Please try again.',
    );
  });

  it('keeps the remove dialog open and shows an inline error when removal fails', () => {
    const request = new Subject<{ success: boolean }>();
    authService.deleteCoverPhoto.mockReturnValue(request);
    component.openRemoveCoverDialog();

    component.removeCover();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Removing cover...');

    request.error(new Error('remove failed'));
    fixture.detectChanges();

    expect(component.isRemoveCoverDialogOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'We could not remove your cover photo. Please try again.',
    );
  });

  it('builds profile routes for own and other post authors', () => {
    expect(component.postAuthorRoute('user-1')).toEqual(['/profile']);
    expect(component.postAuthorRoute('user-2')).toEqual(['/profile', 'user-2']);
  });
});
