import { Routes } from '@angular/router';

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
];
