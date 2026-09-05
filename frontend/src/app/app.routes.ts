import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'confirmar/:token',
    loadComponent: () =>
      import('./features/booking-confirm/confirm-page').then((m) => m.ConfirmPage),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/admin/bookings/admin-bookings-page').then(
            (m) => m.AdminBookingsPage,
          ),
      },
      {
        path: 'barbers',
        loadComponent: () =>
          import('./features/admin/barbers/admin-barbers-page').then((m) => m.AdminBarbersPage),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./features/admin/services/admin-services-page').then(
            (m) => m.AdminServicesPage,
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/admin/schedule/admin-schedule-page').then(
            (m) => m.AdminSchedulePage,
          ),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/admin/account/admin-account').then((m) => m.AdminAccount),
      },
    ],
  },
];
