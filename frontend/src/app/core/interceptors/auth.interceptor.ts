import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Le agrega el Bearer token a las llamadas de auth/admin, y si el backend responde
 * 401 (token vencido, o borrado el usuario) limpia la sesión y manda a /admin/login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAdminApi = req.url.includes('/admin') || req.url.includes('/auth');
  const token = auth.getToken();

  const authedReq =
    token && isAdminApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (isAdminApi && err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        void router.navigate(['/admin/login']);
      }
      return throwError(() => err);
    }),
  );
};
