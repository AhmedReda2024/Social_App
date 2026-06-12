import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CommentsService } from '../../core/services/comments/comments.service';
import { PostsService } from '../feed/services/posts.service';
import { PostDetailsComponent } from './post-details.component';

describe('PostDetailsComponent', () => {
  let component: PostDetailsComponent;
  let fixture: ComponentFixture<PostDetailsComponent>;

  const post = {
    _id: 'post-1',
    id: 'post-1',
    body: 'Test post',
    image: '',
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostDetailsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'post-1' })) },
        },
        {
          provide: Location,
          useValue: { back: vi.fn() },
        },
        {
          provide: PostsService,
          useValue: {
            getSinglePost: vi.fn().mockReturnValue(of({ data: { post } })),
            getRelativeTime: vi.fn().mockReturnValue('1 hour ago'),
          },
        },
        {
          provide: CommentsService,
          useValue: {
            getPostComments: vi.fn().mockReturnValue(of({ data: { comments: [] } })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the existing empty state immediately after the post is deleted', () => {
    component.onPostDeleted();
    fixture.detectChanges();

    expect(component.isError()).toBe(true);
    expect(component.isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Post not found');
    expect(fixture.nativeElement.textContent).toContain('Go Back');
    expect(fixture.nativeElement.querySelector('app-single-post')).toBeNull();
  });
});
