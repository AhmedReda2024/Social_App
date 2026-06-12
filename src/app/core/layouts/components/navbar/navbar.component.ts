import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationsService } from '../../../services/notifications/notifications.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly currentUser = this.authService.currentUser;
  isMobileMenuOpen = signal(false);

  ngOnInit(): void {
    this.notificationsService.getUnreadCount().subscribe({ error: () => undefined });
    this.authService.loadProfile().subscribe({ error: () => undefined });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((val) => !val);
  }

  logout() {
    localStorage.removeItem('token');
    this.authService.clearCurrentUser();
    this.isMobileMenuOpen.set(false);
    this.router.navigate(['/login']);
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/images/default-profile.png';
  }
}
