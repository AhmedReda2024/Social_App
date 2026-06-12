import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { FeedPostData } from '../../../features/feed/model/feed.interface';
import { PostsService } from '../../../features/feed/services/posts.service';
import { SharePostModalComponent } from './share-post-modal.component';

describe('SharePostModalComponent', () => {
  let component: SharePostModalComponent;
  let fixture: ComponentFixture<SharePostModalComponent>;
  let postsService: PostsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharePostModalComponent],
      providers: [
        {
          provide: PostsService,
          useValue: { sharePost: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePostModalComponent);
    component = fixture.componentInstance;
    postsService = TestBed.inject(PostsService);
    fixture.componentRef.setInput('post', createPost());
    fixture.detectChanges();
  });

  it('renders the selected post preview and dialog labels', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');

    expect(dialog.getAttribute('aria-labelledby')).toBe('share-post-title');
    expect(fixture.nativeElement.textContent).toContain('Ahmed Reda');
    expect(fixture.nativeElement.textContent).toContain('@ahmed_reda');
    expect(fixture.nativeElement.textContent).toContain('A normal post');
    expect(fixture.nativeElement.querySelector('img[src="post.jpg"]')).toBeTruthy();
  });

  it('allows an empty message and trims a supplied message', () => {
    vi.spyOn(postsService, 'sharePost').mockReturnValue(
      of({ success: true, message: 'Shared', data: { post: createPost() } }),
    );
    const sharedSpy = vi.fn();
    component.shared.subscribe(sharedSpy);

    component.submit();

    expect(postsService.sharePost).toHaveBeenNthCalledWith(1, 'post-1', {});

    component.message.set('   Worth sharing   ');
    component.submit();

    expect(postsService.sharePost).toHaveBeenNthCalledWith(2, 'post-1', {
      body: 'Worth sharing',
    });
    expect(sharedSpy).toHaveBeenCalledTimes(2);
    expect(component.message()).toBe('');
  });

  it('shows loading and prevents duplicate submissions', () => {
    const response = new Subject<any>();
    vi.spyOn(postsService, 'sharePost').mockReturnValue(response);

    component.submit();
    component.submit();
    fixture.detectChanges();

    expect(postsService.sharePost).toHaveBeenCalledTimes(1);
    expect(component.isSharing()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Sharing...');
    expect(fixture.nativeElement.querySelector('[data-share-submit]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-share-cancel]').disabled).toBe(true);
  });

  it('keeps the modal message available after a failed request', () => {
    vi.spyOn(postsService, 'sharePost').mockReturnValue(
      throwError(() => new Error('Request failed')),
    );
    const sharedSpy = vi.fn();
    component.shared.subscribe(sharedSpy);
    component.message.set('Keep this');

    component.submit();

    expect(component.isSharing()).toBe(false);
    expect(component.message()).toBe('Keep this');
    expect(sharedSpy).not.toHaveBeenCalled();
  });

  it('closes by cancel, backdrop, and Escape only when idle', () => {
    const closedSpy = vi.fn();
    component.closed.subscribe(closedSpy);

    component.close();
    component.onBackdropClick(new MouseEvent('click'));
    component.onEscape();

    expect(closedSpy).toHaveBeenCalledTimes(3);

    component.isSharing.set(true);
    component.close();
    component.onBackdropClick(new MouseEvent('click'));
    component.onEscape();

    expect(closedSpy).toHaveBeenCalledTimes(3);
  });

  function createPost(overrides: Partial<FeedPostData> = {}): FeedPostData {
    return {
      _id: 'post-1',
      id: 'post-1',
      image: 'post.jpg',
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
