import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Logo } from '../../../design-system/logo/logo';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly links = [
    { path: 'dashboard', label: 'Dashboard' },
    { path: 'bookings', label: 'Reservas' },
    { path: 'barbers', label: 'Barberos' },
    { path: 'services', label: 'Servicios' },
    { path: 'schedule', label: 'Horarios' },
    { path: 'account', label: 'Cuenta' },
  ];

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/admin/login']);
  }
}
