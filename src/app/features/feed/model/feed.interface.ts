export interface FeedResponse {
  success: boolean;
  message: string;
  data: FeedData;
  meta: Meta;
}

export interface FeedData {
  posts: FeedPostData[];
}

export interface FeedPostData {
  _id: string;
  image: string;
  body: string;
  privacy: string;
  user: FeedUser;
  sharedPost: SharedPostData | null;
  sharedPostUnavailable?: boolean;
  likes: any[];
  createdAt: string;
  commentsCount: number;
  topComment: any;
  sharesCount: number;
  likesCount: number;
  isShare: boolean;
  id: string;
  bookmarked: boolean;
  isLiked?: boolean;
  relativeTime?: string;
  isOptimisticPending?: boolean;
}

export interface SharedPostData {
  _id: string;
  id?: string;
  body?: string;
  image?: string;
  user?: FeedUser;
}

export interface FeedUser {
  _id: string;
  name: string;
  username: string;
  photo: string;
}

export interface Meta {
  feedMode: string;
  pagination: Pagination;
}

export interface Pagination {
  currentPage: number;
  limit: number;
  total: number;
  numberOfPages: number;
}

export interface PostsListResponse {
  success: boolean;
  message: string;
  data:
    | FeedPostData[]
    | {
        posts?: FeedPostData[];
        bookmarks?: Array<FeedPostData | { post: FeedPostData }>;
      };
  meta?: {
    pagination?: Partial<Pagination>;
  };
}

export interface SharePostRequest {
  body?: string;
}

export interface SharePostResponse {
  success: boolean;
  message: string;
  data?: {
    post?: FeedPostData;
  };
}
