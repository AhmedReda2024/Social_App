import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  NotificationMutationResponse,
  NotificationsResponse,
  UnreadCountResponse,
} from '../../models/notification.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly httpClient = inject(HttpClient);
  readonly unreadCount = signal(0);

  getNotifications(
    unread?: boolean,
    page = 1,
    limit = 10,
  ): Observable<NotificationsResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (unread !== undefined) {
      params = params.set('unread', unread);
    }

    return this.httpClient.get<NotificationsResponse>(`${environment.base_url}/notifications`, {
      params,
    });
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.httpClient
      .get<UnreadCountResponse>(`${environment.base_url}/notifications/unread-count`)
      .pipe(tap((response) => this.unreadCount.set(this.extractUnreadCount(response))));
  }

  markNotificationAsRead(notificationId: string): Observable<NotificationMutationResponse> {
    return this.httpClient.patch<NotificationMutationResponse>(
      `${environment.base_url}/notifications/${notificationId}/read`,
      null,
    );
  }

  markAllAsRead(): Observable<NotificationMutationResponse> {
    return this.httpClient.patch<NotificationMutationResponse>(
      `${environment.base_url}/notifications/read-all`,
      null,
    );
  }

  decrementUnreadCount(): void {
    this.unreadCount.update((count) => Math.max(0, count - 1));
  }

  clearUnreadCount(): void {
    this.unreadCount.set(0);
  }

  private extractUnreadCount(response: UnreadCountResponse): number {
    return response.data?.unreadCount ?? response.data?.count ?? 0;
  }
}
