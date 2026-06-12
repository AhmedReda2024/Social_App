import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, scan, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  FeedPostData,
  PostsListResponse,
  SharePostRequest,
  SharePostResponse,
} from '../model/feed.interface';
import { IPostDataResponse } from '../../../core/models/ipost-data.interface';

interface LoadAction {
  filter: string;
  page: number;
  append: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private readonly httpClient = inject(HttpClient);

  // Active filter, page, and load tracking signals
  currentFilter = signal<string>('following');
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  isLoading = signal<boolean>(false);
  isPageLoading = signal<boolean>(false);
  private readonly hiddenFollowingUserIds = signal<ReadonlySet<string>>(new Set());

  // Trigger stream for dynamic infinite scroll actions
  private readonly actionSubject = new BehaviorSubject<LoadAction>({
    filter: 'following',
    page: 1,
    append: false,
  });

  // Completely reactive posts signal combining tab switching and infinite scroll page appends from server
  private readonly loadedPosts = toSignal(
    this.actionSubject.pipe(
      switchMap((action) => {
        let url = `${environment.base_url}/posts/feed?limit=10&page=${action.page}&only=${action.filter}`;

        if (action.filter === 'community') {
          url = `${environment.base_url}/posts?limit=10&page=${action.page}`;
        } else if (action.filter === 'saved') {
          url = `${environment.base_url}/users/bookmarks?limit=10&page=${action.page}`;
        }

        // Set isLoading to true if it is the first page of a feed (tab switch or reload)
        if (action.page === 1) {
          this.isLoading.set(true);
        }

        return this.httpClient.get<any>(url).pipe(
          map((res) => ({ res, action })),
          catchError(() => {
            this.isLoading.set(false);
            this.isPageLoading.set(false);
            return of({ res: { data: [] }, action });
          }),
          tap(() => {
            this.isLoading.set(false);
            this.isPageLoading.set(false);
          }),
        );
      }),
      scan((acc: FeedPostData[], current) => {
        const postsList =
          current.res.data?.posts || current.res.data?.bookmarks || current.res.data || [];
        const mapped = postsList.map((p: any) => {
          const postData = p.post ? p.post : p;
          const isSavedTab = current.action.filter === 'saved';
          const userId = this.getCurrentUserId();
          const isLiked =
            postData.likes?.some((like: any) => {
              if (typeof like === 'string') return like === userId;
              return (like._id || like.id) === userId;
            }) || !!postData.isLiked;
          return {
            ...postData,
            bookmarked: isSavedTab ? true : !!postData.bookmarked,
            isLiked: isLiked,
            relativeTime: this.getRelativeTime(postData.createdAt),
          };
        });

        // Update active page metrics
        const pagination = current.res.meta?.pagination;
        this.currentPage.set(pagination?.currentPage || 1);
        this.totalPages.set(pagination?.numberOfPages || 1);

        if (current.action.append) {
          // Avoid duplicate posts by matching unique id properties
          const existingIds = new Set(acc.map((item) => item.id));
          const newUnique = mapped.filter((item: any) => !existingIds.has(item.id));
          return [...acc, ...newUnique];
        }
        return mapped;
      }, []),
    ),
    { initialValue: [] },
  );

  readonly posts = computed(() => {
    const posts = this.loadedPosts();
    if (this.currentFilter() !== 'following') {
      return posts;
    }

    const hiddenUserIds = this.hiddenFollowingUserIds();
    return hiddenUserIds.size ? posts.filter((post) => !hiddenUserIds.has(post.user?._id)) : posts;
  });

  setFollowingUserVisibility(userId: string, following: boolean): void {
    this.hiddenFollowingUserIds.update((hiddenUserIds) => {
      const nextHiddenUserIds = new Set(hiddenUserIds);
      following ? nextHiddenUserIds.delete(userId) : nextHiddenUserIds.add(userId);
      return nextHiddenUserIds;
    });
  }

  changeFilter(filter: string): void {
    this.currentFilter.set(filter);
    this.currentPage.set(1);
    this.totalPages.set(1);
    this.isPageLoading.set(false);
    this.actionSubject.next({ filter, page: 1, append: false });
  }

  loadNextPage(): void {
    const filter = this.currentFilter();
    const nextPage = this.currentPage() + 1;

    // Trigger next page query only if more pages are available and not currently loading
    if (nextPage <= this.totalPages() && !this.isPageLoading()) {
      this.isPageLoading.set(true);
      this.actionSubject.next({ filter, page: nextPage, append: true });
    }
  }

  getRelativeTime(createdAt: string): string {
    if (!createdAt) return '';
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();

    if (diffMs < 60000) return 'just now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo`;

    return `${Math.floor(diffMonths / 12)}y`;
  }

  private getCurrentUserId(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.user || decoded.id || decoded._id || '';
      }
    } catch {}
    return '';
  }

  toggleBookmark(postId: string): Observable<any> {
    return this.httpClient.put<any>(`${environment.base_url}/posts/${postId}/bookmark`, {});
  }

  toggleLikePost(postId: string): Observable<any> {
    return this.httpClient.put<any>(`${environment.base_url}/posts/${postId}/like`, null);
  }

  getPostsLikes(postId: string, page = 1, limit = 20): Observable<any> {
    return this.httpClient.get<any>(
      `${environment.base_url}/posts/${postId}/likes?page=${page}&limit=${limit}`,
    );
  }

  deletePost(postId: string): Observable<any> {
    return this.httpClient.delete<any>(`${environment.base_url}/posts/${postId}`);
  }

  updatePost(postId: string, body: string): Observable<any> {
    return this.httpClient.put<any>(`${environment.base_url}/posts/${postId}`, { body });
  }

  createPost(formData: FormData): Observable<any> {
    return this.httpClient.post<any>(`${environment.base_url}/posts`, formData);
  }

  getSinglePost(postId: string): Observable<IPostDataResponse> {
    return this.httpClient.get<IPostDataResponse>(`${environment.base_url}/posts/${postId}`);
  }

  getMyPosts(page = 1, limit = 10): Observable<PostsListResponse> {
    const params = new HttpParams().set('only', 'me').set('page', page).set('limit', limit);

    return this.httpClient.get<PostsListResponse>(`${environment.base_url}/posts/feed`, { params });
  }

  getSavedPosts(page = 1, limit = 10): Observable<PostsListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);

    return this.httpClient.get<PostsListResponse>(`${environment.base_url}/users/bookmarks`, {
      params,
    });
  }

  mapPosts(response: PostsListResponse, saved = false): FeedPostData[] {
    const data = response.data;
    const source = Array.isArray(data) ? data : saved ? (data.bookmarks ?? []) : (data.posts ?? []);

    return source.map((item) => {
      const post = 'post' in item ? item.post : item;
      const userId = this.getCurrentUserId();
      const isLiked =
        post.likes?.some((like: any) => {
          if (typeof like === 'string') return like === userId;
          return (like._id || like.id) === userId;
        }) || !!post.isLiked;

      return {
        ...post,
        bookmarked: saved ? true : !!post.bookmarked,
        isLiked,
        relativeTime: this.getRelativeTime(post.createdAt),
      };
    });
  }

  sharePost(postId: string, data: SharePostRequest): Observable<SharePostResponse> {
    return this.httpClient.post<SharePostResponse>(
      `${environment.base_url}/posts/${postId}/share`,
      data,
    );
  }
}
