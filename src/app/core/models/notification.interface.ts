export type NotificationFilter = 'all' | 'unread';
export type NotificationKind = 'like' | 'comment' | 'share' | 'follow' | 'unknown';

export interface NotificationActor {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  photo?: string;
}

export interface NotificationEntity {
  _id?: string;
  id?: string;
  body?: string;
  content?: string;
  post?: NotificationEntity;
  postId?: string;
}

export interface Notification {
  _id?: string;
  id?: string;
  type?: string;
  message?: string;
  content?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  actor?: NotificationActor;
  sender?: NotificationActor;
  user?: NotificationActor;
  from?: NotificationActor;
  post?: NotificationEntity;
  comment?: NotificationEntity;
  entity?: NotificationEntity;
  entityId?: string;
}

export interface NotificationPagination {
  currentPage: number;
  limit: number;
  total: number;
  numberOfPages: number;
  nextPage?: number | null;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: {
    notifications: Notification[];
  };
  meta?: {
    pagination?: Partial<NotificationPagination>;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount?: number;
    count?: number;
  };
}

export interface NotificationMutationResponse {
  success: boolean;
  message: string;
  data?: Notification | null;
}

export interface NotificationViewModel {
  id: string;
  actorId: string | null;
  actorName: string;
  actorPhoto: string;
  actionText: string;
  preview: string;
  kind: NotificationKind;
  isRead: boolean;
  createdAt: string;
  relativeTime: string;
  postId: string | null;
}
