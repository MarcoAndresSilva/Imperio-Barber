import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  // '/confirmar/:token' se agrega en la Fase 7 del plan (página pública de aceptar/rechazar).
];
