import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Notification,
  NotificationFilter,
  NotificationKind,
  NotificationViewModel,
  NotificationsResponse,
} from '../../core/models/notification.interface';
import { NotificationsService } from '../../core/services/notifications/notifications.service';

@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly pageSize = 10;

  readonly allNotifications = signal<NotificationViewModel[]>([]);
  readonly activeFilter = signal<NotificationFilter>('all');
  readonly notifications = computed(() =>
    this.activeFilter() === 'unread'
      ? this.allNotifications().filter((notification) => !notification.isRead)
      : this.allNotifications(),
  );
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly isLoading = signal(false);
  readonly isLoadingMore = signal(false);
  readonly isMarkingAll = signal(false);
  readonly markingIds = signal<Set<string>>(new Set());
  readonly loadError = signal(false);
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly hasMorePages = computed(() => this.currentPage() < this.totalPages());
  readonly canMarkAllAsRead = computed(
    () => this.unreadCount() > 0 && !this.isMarkingAll() && !this.isLoading(),
  );
  readonly skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationsService.getUnreadCount().subscribe({ error: () => undefined });
  }

  changeFilter(filter: NotificationFilter): void {
    if (filter === this.activeFilter()) {
      return;
    }

    this.activeFilter.set(filter);
  }

  retry(): void {
    this.loadNotifications();
    this.notificationsService.getUnreadCount().subscribe({ error: () => undefined });
  }

  loadMore(): void {
    if (!this.hasMorePages() || this.isLoadingMore()) {
      return;
    }

    this.loadNotifications(this.currentPage() + 1, true);
  }

  openNotification(notification: NotificationViewModel): void {
    if (!notification.isRead) {
      this.markAsRead(notification);
    }

    if (notification.postId) {
      void this.router.navigate(['/post-details', notification.postId]);
    }
  }

  openNotificationFromKeyboard(event: Event, notification: NotificationViewModel): void {
    if (event.target === event.currentTarget) {
      this.openNotification(notification);
    }
  }

  openActorProfile(event: Event, notification: NotificationViewModel): void {
    event.stopPropagation();

    if (notification.actorId) {
      void this.router.navigate(['/profile', notification.actorId]);
    }
  }

  markNotificationAsRead(event: Event, notification: NotificationViewModel): void {
    event.stopPropagation();

    if (!notification.isRead) {
      this.markAsRead(notification);
    }
  }

  markAllAsRead(): void {
    if (!this.canMarkAllAsRead()) {
      return;
    }

    const previousNotifications = this.allNotifications();
    const previousCount = this.unreadCount();

    this.isMarkingAll.set(true);
    this.allNotifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
    this.notificationsService.clearUnreadCount();

    this.notificationsService.markAllAsRead().subscribe({
      next: () => this.isMarkingAll.set(false),
      error: () => {
        this.allNotifications.set(previousNotifications);
        this.unreadCount.set(previousCount);
        this.isMarkingAll.set(false);
      },
    });
  }

  onAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = '/assets/images/default-profile.png';
  }

  private loadNotifications(page = 1, append = false): void {
    append ? this.isLoadingMore.set(true) : this.isLoading.set(true);
    this.loadError.set(false);

    this.notificationsService.getNotifications(undefined, page, this.pageSize).subscribe({
      next: (response) => {
        const incoming = this.extractNotifications(response).map((item) => this.toViewModel(item));
        const pagination = response.meta?.pagination;

        this.currentPage.set(pagination?.currentPage ?? page);
        this.totalPages.set(pagination?.numberOfPages ?? 1);

        if (append) {
          const existingIds = new Set(this.allNotifications().map((item) => item.id));
          this.allNotifications.update((items) => [
            ...items,
            ...incoming.filter((item) => !existingIds.has(item.id)),
          ]);
        } else {
          this.allNotifications.set(incoming);
        }

        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
    });
  }

  private markAsRead(notification: NotificationViewModel): void {
    if (this.markingIds().has(notification.id)) {
      return;
    }

    const previousNotifications = this.allNotifications();
    const previousCount = this.unreadCount();

    this.markingIds.update((ids) => new Set(ids).add(notification.id));
    this.allNotifications.update((items) =>
      items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    );
    this.notificationsService.decrementUnreadCount();

    this.notificationsService.markNotificationAsRead(notification.id).subscribe({
      next: () => this.removeMarkingId(notification.id),
      error: () => {
        this.allNotifications.set(previousNotifications);
        this.unreadCount.set(previousCount);
        this.removeMarkingId(notification.id);
      },
    });
  }

  private removeMarkingId(notificationId: string): void {
    this.markingIds.update((ids) => {
      const updated = new Set(ids);
      updated.delete(notificationId);
      return updated;
    });
  }

  private extractNotifications(response: NotificationsResponse): Notification[] {
    const data: unknown = response.data;

    if (Array.isArray(data)) {
      return data as Notification[];
    }

    if (data && typeof data === 'object' && 'notifications' in data) {
      const notifications = (data as { notifications?: unknown }).notifications;
      return Array.isArray(notifications) ? (notifications as Notification[]) : [];
    }

    return [];
  }

  private toViewModel(notification: Notification): NotificationViewModel {
    const actor =
      notification.actor ?? notification.sender ?? notification.user ?? notification.from;
    const actorName = actor?.name?.trim() || actor?.username?.trim() || 'Someone';
    const kind = this.resolveKind(notification.type);
    const defaultAction = this.getDefaultAction(kind);
    const message = notification.message?.trim();
    const actionText = message
      ? message.replace(new RegExp(`^${this.escapeRegExp(actorName)}\\s*`, 'i'), '').trim() ||
        defaultAction
      : defaultAction;

    return {
      id:
        notification.id ??
        notification._id ??
        [
          notification.type ?? 'notification',
          actor?.id ?? actor?._id ?? 'unknown',
          notification.createdAt ?? 'undated',
        ].join('-'),
      actorId: actor?.id ?? actor?._id ?? null,
      actorName,
      actorPhoto: actor?.photo || '/assets/images/default-profile.png',
      actionText,
      preview:
        notification.comment?.content?.trim() ||
        notification.comment?.body?.trim() ||
        notification.content?.trim() ||
        '',
      kind,
      isRead: notification.isRead ?? notification.read ?? false,
      createdAt: notification.createdAt ?? '',
      relativeTime: this.getRelativeTime(notification.createdAt),
      postId: this.resolvePostId(notification),
    };
  }

  private resolveKind(type?: string): NotificationKind {
    const normalizedType = type?.toLowerCase() ?? '';

    if (normalizedType.includes('like')) return 'like';
    if (normalizedType.includes('comment') || normalizedType.includes('reply')) return 'comment';
    if (normalizedType.includes('share')) return 'share';
    if (normalizedType.includes('follow')) return 'follow';
    return 'unknown';
  }

  private getDefaultAction(kind: NotificationKind): string {
    switch (kind) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'share':
        return 'shared your post';
      case 'follow':
        return 'started following you';
      default:
        return 'sent you a notification';
    }
  }

  private resolvePostId(notification: Notification): string | null {
    return (
      notification.post?.id ??
      notification.post?._id ??
      notification.comment?.postId ??
      notification.comment?.post?.id ??
      notification.comment?.post?._id ??
      notification.entity?.postId ??
      notification.entity?.post?.id ??
      notification.entity?.post?._id ??
      (this.resolveKind(notification.type) === 'follow'
        ? null
        : (notification.entity?.id ?? notification.entity?._id ?? notification.entityId ?? null))
    );
  }

  private getRelativeTime(createdAt?: string): string {
    if (!createdAt) return '';

    const timestamp = new Date(createdAt).getTime();
    if (Number.isNaN(timestamp)) return '';

    const differenceInMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (differenceInMinutes < 1) return 'just now';
    if (differenceInMinutes < 60) return `${differenceInMinutes}m`;

    const differenceInHours = Math.floor(differenceInMinutes / 60);
    if (differenceInHours < 24) return `${differenceInHours}h`;

    const differenceInDays = Math.floor(differenceInHours / 24);
    if (differenceInDays < 30) return `${differenceInDays}d`;

    const differenceInMonths = Math.floor(differenceInDays / 30);
    if (differenceInMonths < 12) return `${differenceInMonths}mo`;
    return `${Math.floor(differenceInMonths / 12)}y`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
