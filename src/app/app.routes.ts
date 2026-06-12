import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'feed',
    pathMatch: 'full',
  },

  // Auth Layout Routes
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/layouts/auth-layout/auth-layout.component').then((c) => c.AuthLayoutComponent),
    children: [
      {
        path: 'register',
        title: 'Create Account | Vibely Posts',
        loadComponent: () =>
          import('./core/auth/components/register/register.component').then(
            (c) => c.RegisterComponent,
          ),
      },
      {
        path: 'login',
        title: 'Sign In | Vibely Posts',
        loadComponent: () =>
          import('./core/auth/components/login/login.component').then((c) => c.LoginComponent),
      },
    ],
  },

  // Main Layout Routes
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layouts/main-layout/main-layout.component').then((c) => c.MainLayoutComponent),
    children: [
      {
        path: 'feed',
        title: 'Home Feed | Vibely Posts',
        loadComponent: () => import('./features/feed/feed.component').then((c) => c.FeedComponent),
      },
      {
        path: 'notifications',
        title: 'Notifications | Vibely Posts',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (c) => c.NotificationsComponent,
          ),
      },
      {
        path: 'profile',
        title: 'Profile | Vibely Posts',
        loadComponent: () =>
          import('./features/profile/profile.component').then((c) => c.ProfileComponent),
      },
      {
        path: 'profile/:userId',
        title: 'Profile | Vibely Posts',
        loadComponent: () =>
          import('./features/public-profile/public-profile.component').then(
            (c) => c.PublicProfileComponent,
          ),
      },
      {
        path: 'setting',
        title: 'Change Password | Vibely Posts',
        loadComponent: () =>
          import('./features/setting/setting.component').then((c) => c.SettingComponent),
      },
      {
        path: 'post-details/:id',
        title: 'Post Details | Vibely Posts',
        loadComponent: () =>
          import('./features/post-details/post-details.component').then(
            (c) => c.PostDetailsComponent,
          ),
      },
      {
        path: 'suggestions',
        title: 'Suggested Friends | Vibely Posts',
        loadComponent: () =>
          import('./features/suggestions/suggestions.component').then(
            (c) => c.SuggestionsComponent,
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'feed',
    pathMatch: 'full',
  },
];
