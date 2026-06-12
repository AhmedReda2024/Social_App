import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FeedPostData } from '../model/feed.interface';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PostsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostsService);
    httpController = TestBed.inject(HttpTestingController);

    const initialFeedRequest = httpController.expectOne(
      `${environment.base_url}/posts/feed?limit=10&page=1&only=following`,
    );
    initialFeedRequest.flush({
      success: true,
      message: 'success',
      data: { posts: [] },
      meta: { pagination: { currentPage: 1, numberOfPages: 1 } },
    });
  });

  afterEach(() => {
    httpController.verify();
  });

  it('requests the current user posts', () => {
    service.getMyPosts(2, 15).subscribe();

    const request = httpController.expectOne(
      (candidate) => candidate.url === `${environment.base_url}/posts/feed`,
    );
    expect(request.request.params.get('only')).toBe('me');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('15');
    request.flush({ success: true, message: 'success', data: { posts: [] } });
  });

  it('requests saved posts', () => {
    service.getSavedPosts(3, 5).subscribe();

    const request = httpController.expectOne(
      `${environment.base_url}/users/bookmarks?page=3&limit=5`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'success', data: { bookmarks: [] } });
  });

  it('shares a post with the supplied message body', () => {
    service.sharePost('post-1', { body: 'Worth sharing' }).subscribe();

    const request = httpController.expectOne(`${environment.base_url}/posts/post-1/share`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ body: 'Worth sharing' });
    request.flush({
      success: true,
      message: 'Post shared successfully',
      data: { post: { id: 'shared-post-1' } },
    });
  });

  it('shares a post without a body when no message is supplied', () => {
    service.sharePost('post-1', {}).subscribe();

    const request = httpController.expectOne(`${environment.base_url}/posts/post-1/share`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      success: true,
      message: 'Post shared successfully',
      data: { post: { id: 'shared-post-1' } },
    });
  });

  it('removes direct posts and shares by an unfollowed user from the following feed', () => {
    service.changeFilter('following');
    const request = httpController.expectOne(
      `${environment.base_url}/posts/feed?limit=10&page=1&only=following`,
    );
    request.flush(
      createFeedResponse([
        createPost('post-1', 'user-2'),
        createPost('post-2', 'user-3', 'user-2'),
        createPost('post-3', 'user-2', 'user-3'),
      ]),
    );

    service.setFollowingUserVisibility('user-2', false);

    expect(service.posts().map((post) => post.id)).toEqual(['post-2']);
  });

  it('restores hidden following-feed posts when the user is followed again', () => {
    service.changeFilter('following');
    const request = httpController.expectOne(
      `${environment.base_url}/posts/feed?limit=10&page=1&only=following`,
    );
    request.flush(createFeedResponse([createPost('post-1', 'user-2')]));

    service.setFollowingUserVisibility('user-2', false);
    expect(service.posts()).toHaveLength(0);

    service.setFollowingUserVisibility('user-2', true);

    expect(service.posts().map((post) => post.id)).toEqual(['post-1']);
  });

  it('does not hide the user posts from the community feed', () => {
    service.changeFilter('community');
    const request = httpController.expectOne(`${environment.base_url}/posts?limit=10&page=1`);
    request.flush(createFeedResponse([createPost('post-1', 'user-2')]));

    service.setFollowingUserVisibility('user-2', false);

    expect(service.posts().map((post) => post.id)).toEqual(['post-1']);
  });
});

function createFeedResponse(posts: FeedPostData[]) {
  return {
    success: true,
    message: 'success',
    data: { posts },
    meta: { pagination: { currentPage: 1, numberOfPages: 1 } },
  };
}

function createPost(id: string, userId: string, sharedPostUserId?: string): FeedPostData {
  return {
    _id: id,
    id,
    image: '',
    body: id,
    privacy: 'public',
    user: {
      _id: userId,
      name: userId,
      username: userId,
      photo: '',
    },
    sharedPost: sharedPostUserId
      ? {
          _id: `${id}-shared`,
          user: {
            _id: sharedPostUserId,
            name: sharedPostUserId,
            username: sharedPostUserId,
            photo: '',
          },
        }
      : null,
    likes: [],
    createdAt: '2026-06-12T12:00:00.000Z',
    commentsCount: 0,
    topComment: null,
    sharesCount: 0,
    likesCount: 0,
    isShare: !!sharedPostUserId,
    bookmarked: false,
  };
}
