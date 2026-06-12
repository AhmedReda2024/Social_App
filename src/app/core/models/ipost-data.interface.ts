export interface IPostDataResponse {
  success: boolean;
  message: string;
  data: PostData;
}

export interface PostData {
  post: IPostData;
}

export interface IPostData {
  _id: string;
  body: string;
  image: string;
  privacy: string;
  user: User;
  sharedPost: SharedPostData | null;
  sharedPostUnavailable?: boolean;
  likes: string[];
  createdAt: string;
  commentsCount: number;
  topComment: TopComment;
  sharesCount: number;
  likesCount: number;
  isShare: boolean;
  id: string;
  bookmarked: boolean;
  relativeTime?: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface SharedPostData {
  _id: string;
  id?: string;
  body?: string;
  image?: string;
  user?: User;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  photo: string;
}

export interface TopComment {
  _id: string;
  content: string;
  commentCreator: CommentCreator;
  post: string;
  parentComment: any;
  likes: any[];
  createdAt: string;
}

export interface CommentCreator {
  _id: string;
  name: string;
  username: string;
  photo: string;
}
