import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NotificationsService } from '../../core/services/notifications/notifications.service';
import { NotificationsComponent } from './notifications.component';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let service: FakeNotificationsService;

  class FakeNotificationsService {
    readonly unreadCount = signal(1);
    lastUnreadQuery: boolean | null = null;
    markedNotificationId: string | null = null;

    getNotifications(unread?: boolean) {
      this.lastUnreadQuery = unread ?? null;
      return of({
        success: true,
        message: 'success',
        data: {
          notifications: [
            {
              id: 'notification-1',
              type: 'post_like',
              actor: {
                id: 'user-1',
                name: 'Omar Ehab',
                photo: '/assets/images/default-profile.png',
              },
              post: { id: 'post-1' },
              isRead: false,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'notification-2',
              type: 'post_comment',
              actor: { name: 'Mohammad Hussein', photo: '/assets/images/default-profile.png' },
              post: { id: 'post-2' },
              isRead: true,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        meta: { pagination: { currentPage: 1, numberOfPages: 1 } },
      });
    }

    getUnreadCount() {
      return of({ success: true, message: 'success', data: { unreadCount: 1 } });
    }

    markNotificationAsRead(notificationId: string) {
      this.markedNotificationId = notificationId;
      return of({ success: true, message: 'success', data: null });
    }

    markAllAsRead() {
      return of({ success: true, message: 'success', data: null });
    }

    decrementUnreadCount(): void {
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }

    clearUnreadCount(): void {
      this.unreadCount.set(0);
    }
  }

  beforeEach(async () => {
    service = new FakeNotificationsService();

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [provideRouter([]), { provide: NotificationsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders notifications from the API', () => {
    expect(fixture.nativeElement.textContent).toContain('Omar Ehab');
    expect(fixture.nativeElement.textContent).toContain('liked your post');
    expect(component.notifications()).toHaveLength(2);
    expect(service.lastUnreadQuery).toBeNull();
  });

  it('shows only unread items in Unread without changing the All list', () => {
    component.changeFilter('unread');

    expect(component.notifications()).toHaveLength(1);
    expect(component.notifications()[0].id).toBe('notification-1');

    component.changeFilter('all');
    expect(component.notifications()).toHaveLength(2);
  });

  it('marks one notification as read from its action button and updates the count', () => {
    const markReadButton = fixture.nativeElement.querySelector(
      '[aria-label="Mark notification from Omar Ehab as read"]',
    ) as HTMLButtonElement;

    markReadButton.click();
    fixture.detectChanges();

    expect(service.markedNotificationId).toBe('notification-1');
    expect(service.unreadCount()).toBe(0);
    expect(component.notifications()).toHaveLength(2);
    expect(component.notifications().find((item) => item.id === 'notification-1')?.isRead).toBe(
      true,
    );
  });

  it('removes a read item only from Unread and keeps it visible in All', () => {
    component.changeFilter('unread');
    fixture.detectChanges();

    const markReadButton = fixture.nativeElement.querySelector(
      '[aria-label="Mark notification from Omar Ehab as read"]',
    ) as HTMLButtonElement;

    markReadButton.click();
    fixture.detectChanges();

    expect(component.notifications()).toHaveLength(0);

    component.changeFilter('all');
    fixture.detectChanges();

    expect(component.notifications()).toHaveLength(2);
    expect(component.notifications().find((item) => item.id === 'notification-1')).toEqual(
      expect.objectContaining({ isRead: true }),
    );
    expect(fixture.nativeElement.textContent).toContain('Omar Ehab');
  });

  it('keeps all notifications after marking every item as read', () => {
    component.changeFilter('unread');
    component.markAllAsRead();

    expect(component.notifications()).toHaveLength(0);
    expect(service.unreadCount()).toBe(0);

    component.changeFilter('all');
    expect(component.notifications()).toHaveLength(2);
    expect(component.notifications().every((notification) => notification.isRead)).toBe(true);
  });

  it('opens the actor profile without marking the notification as read', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const actorButton = fixture.nativeElement.querySelector(
      '[aria-label="View Omar Ehab profile"]',
    ) as HTMLButtonElement;

    actorButton.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/profile', 'user-1']);
    expect(service.markedNotificationId).toBeNull();
    expect(component.notifications()[0].isRead).toBe(false);
  });

  it('extracts actor ids from sender, user, and from payload variants', () => {
    const toViewModel = (component as any).toViewModel.bind(component);

    expect(toViewModel({ sender: { _id: 'sender-1' } }).actorId).toBe('sender-1');
    expect(toViewModel({ user: { id: 'user-2' } }).actorId).toBe('user-2');
    expect(toViewModel({ from: { _id: 'from-3' } }).actorId).toBe('from-3');
    expect(toViewModel({ type: 'system' }).actorId).toBeNull();
  });

  it('keeps post-row navigation separate from actor navigation', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openNotification(component.notifications()[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/post-details', 'post-1']);
    expect(service.markedNotificationId).toBe('notification-1');
  });

  it('does not open the post when Enter is pressed on an actor control', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const actorButton = fixture.nativeElement.querySelector(
      '[aria-label="View Omar Ehab profile"]',
    ) as HTMLButtonElement;

    actorButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(navigateSpy).not.toHaveBeenCalledWith(['/post-details', 'post-1']);
    expect(service.markedNotificationId).toBeNull();
  });
});
