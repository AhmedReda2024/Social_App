import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeedPostData } from '../../../features/feed/model/feed.interface';
import { PostsService } from '../../../features/feed/services/posts.service';
import { SinglePostComponent } from './single-post.component';

describe('SinglePostComponent', () => {
  let component: SinglePostComponent;
  let fixture: ComponentFixture<SinglePostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePostComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('post', createPost());
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('formats generated profile photo posts without duplicating the body', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({ body: 'updated profile picture.', image: 'profile.jpg' }),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ahmed Reda updated profile picture.');
    expect(text.match(/updated profile picture\./g)?.length).toBe(1);
    expect(fixture.nativeElement.querySelector('img[src="profile.jpg"]')).toBeTruthy();
  });

  it('emits the deleted post id after deletion succeeds', () => {
    const postsService = TestBed.inject(PostsService);
    vi.spyOn(postsService, 'deletePost').mockReturnValue(of({ success: true }));
    vi.spyOn(postsService, 'changeFilter').mockImplementation(() => {});
    const deletedSpy = vi.fn();
    component.postDeleted.subscribe(deletedSpy);

    component.confirmDelete();

    expect(deletedSpy).toHaveBeenCalledWith('post-1');
  });

  it('renders a shared post as a nested original-post card', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({
        body: 'Worth sharing',
        isShare: true,
        sharedPost: {
          _id: 'original-1',
          id: 'original-1',
          body: 'Original post body',
          image: 'original.jpg',
          user: {
            _id: 'user-2',
            name: 'Original Author',
            username: 'original_author',
            photo: 'author.jpg',
          },
        },
      }),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Worth sharing');
    expect(text).toContain('Original Author');
    expect(text).toContain('Original post body');
    expect(fixture.nativeElement.querySelector('img[src="original.jpg"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/post-details/original-1"]')).toBeTruthy();
  });

  it('renders an unavailable placeholder when the original shared post is missing', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({
        isShare: true,
        sharedPost: null,
        sharedPostUnavailable: true,
      }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Original post is unavailable');
  });

  it('links the post author to their public profile', () => {
    fixture.componentRef.setInput('post', createPost());
    fixture.detectChanges();

    const authorLink = fixture.nativeElement.querySelector(
      'a[aria-label="View Ahmed Reda profile"]',
    ) as HTMLAnchorElement | null;

    expect(authorLink?.getAttribute('href')).toBe('/profile/user-1');
  });

  it('links the original shared-post author to their public profile', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({
        isShare: true,
        sharedPost: {
          _id: 'original-1',
          id: 'original-1',
          body: 'Original post body',
          image: '',
          user: {
            _id: 'user-2',
            name: 'Original Author',
            username: 'original_author',
            photo: 'author.jpg',
          },
        },
      }),
    );
    fixture.detectChanges();

    const authorLink = fixture.nativeElement.querySelector(
      'a[aria-label="View Original Author profile"]',
    ) as HTMLAnchorElement | null;

    expect(authorLink?.getAttribute('href')).toBe('/profile/user-2');
  });

  it('opens the share modal from the post action', () => {
    const shareButton = fixture.nativeElement.querySelector(
      'button[aria-label="Share this post"]',
    ) as HTMLButtonElement;

    shareButton.click();
    fixture.detectChanges();

    expect(component.isShareModalOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-share-post-modal')).toBeTruthy();
  });

  it('shares the original post when the displayed post is already shared', () => {
    fixture.componentRef.setInput(
      'post',
      createPost({
        id: 'shared-wrapper',
        isShare: true,
        sharedPost: {
          _id: 'original-1',
          id: 'original-1',
          body: 'Original post body',
          image: 'original.jpg',
          user: {
            _id: 'user-2',
            name: 'Original Author',
            username: 'original_author',
            photo: 'author.jpg',
          },
        },
      }),
    );
    fixture.detectChanges();

    expect(component.shareTarget().id).toBe('original-1');
    expect(component.shareTarget().user.name).toBe('Original Author');
  });

  it('updates the count and refreshes the active feed after sharing', () => {
    const postsService = TestBed.inject(PostsService);
    vi.spyOn(postsService, 'changeFilter').mockImplementation(() => {});

    component.onPostShared();

    expect(component.post.sharesCount).toBe(1);
    expect(component.isShareModalOpen()).toBe(false);
    expect(postsService.changeFilter).toHaveBeenCalledWith(postsService.currentFilter());
  });

  function createPost(overrides: Partial<FeedPostData> = {}): FeedPostData {
    return {
      _id: 'post-1',
      id: 'post-1',
      image: '',
      body: 'A normal post',
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
      commentsCount: 0,
      topComment: null,
      sharesCount: 0,
      likesCount: 0,
      isShare: false,
      bookmarked: false,
      ...overrides,
    };
  }
});
