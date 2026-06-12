import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('requests paginated unread notifications', () => {
    service.getNotifications(true, 2, 15).subscribe();

    const request = httpController.expectOne(
      (candidate) => candidate.url === `${environment.base_url}/notifications`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('unread')).toBe('true');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('15');
    request.flush({ success: true, message: 'success', data: { notifications: [] } });
  });

  it('requests the complete notification list without an unread filter', () => {
    service.getNotifications().subscribe();

    const request = httpController.expectOne(
      (candidate) => candidate.url === `${environment.base_url}/notifications`,
    );

    expect(request.request.params.has('unread')).toBe(false);
    request.flush({ success: true, message: 'success', data: { notifications: [] } });
  });

  it('keeps the shared unread count in sync', () => {
    service.getUnreadCount().subscribe();

    const request = httpController.expectOne(`${environment.base_url}/notifications/unread-count`);
    request.flush({ success: true, message: 'success', data: { unreadCount: 4 } });

    expect(service.unreadCount()).toBe(4);
    service.decrementUnreadCount();
    expect(service.unreadCount()).toBe(3);
    service.clearUnreadCount();
    expect(service.unreadCount()).toBe(0);
  });
});
