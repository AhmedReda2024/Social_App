export interface SuggestionResponse {
  success: boolean;
  message: string;
  data: SuggestionData;
  meta: Meta;
}

export interface SuggestionData {
  suggestions: UserSuggestionData[];
}

export interface UserSuggestionData {
  _id: string;
  name: string;
  username: string;
  photo: string;
  mutualFollowersCount: number;
  followersCount: number;
}

export interface Meta {
  pagination: Pagination;
}

export interface Pagination {
  currentPage: number;
  limit: number;
  total: number;
  numberOfPages: number;
  nextPage: number;
}

export interface FollowToggleResponse {
  success: boolean;
  message: string;
  data: {
    following: boolean;
  };
}
