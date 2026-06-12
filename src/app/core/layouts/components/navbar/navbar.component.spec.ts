import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NotificationsService } from '../../../services/notifications/notifications.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        {
          provide: NotificationsService,
          useValue: {
            unreadCount: signal(3),
            getUnreadCount: () =>
              of({ success: true, message: 'success', data: { unreadCount: 3 } }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the unread notification badge', () => {
    const badge = fixture.nativeElement.querySelector('[aria-label="3 unread notifications"]');
    expect(badge?.textContent.trim()).toBe('3');
  });
});
