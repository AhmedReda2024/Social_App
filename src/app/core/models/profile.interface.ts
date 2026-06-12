export interface ProfileData {
  _id?: string;
  id?: string;
  name: string;
  username: string;
  email: string;
  photo: string;
  cover?: string | null;
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
  postsCount?: number;
  followers?: unknown[];
  following?: unknown[];
  bookmarks?: unknown[];
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: ProfileData | { user: ProfileData };
}

export interface PublicProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: ProfileData;
    isFollowing: boolean;
  };
}
