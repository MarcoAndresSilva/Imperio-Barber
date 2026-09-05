import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Logo } from '../../../design-system/logo/logo';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [Logo],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Ya logueado y vuelve a /admin/login (por historial, un link viejo, etc.):
    // directo al panel, no tiene sentido pedirle la clave de nuevo.
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/admin/dashboard']);
    }
  }

  protected get canSubmit(): boolean {
    return this.email().trim().length > 3 && this.password().length >= 8;
  }

  protected onSubmit(): void {
    if (!this.canSubmit || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    this.auth.login({ email: this.email().trim(), password: this.password() }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/admin/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          err.status === 429
            ? 'Demasiados intentos — espera un minuto antes de volver a probar.'
            : 'Email o contraseña incorrectos.',
        );
      },
    });
  }
}
