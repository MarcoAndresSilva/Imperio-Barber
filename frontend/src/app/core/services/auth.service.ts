import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'imperio_admin_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly token = signal<string | null>(this.readStoredToken());
  readonly isAuthenticated = computed(() => !!this.token());

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, dto)
      .pipe(tap((res) => this.setToken(res.accessToken)));
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(`${environment.apiUrl}/auth/password`, {
      currentPassword,
      newPassword,
    });
  }

  logout(): void {
    this.setToken(null);
  }

  getToken(): string | null {
    return this.token();
  }

  private setToken(token: string | null): void {
    this.token.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // localStorage puede fallar (modo privado, storage bloqueado): la sesión
      // sigue funcionando en memoria durante esta pestaña, solo no persiste un reload.
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
