import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUsersApiService } from '../../../core/services/admin-users-api.service';
import { AuthUser } from '../../../core/models/auth.model';
import { AdminUserSummary } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-account',
  templateUrl: './admin-account.html',
  styleUrl: './admin-account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAccount {
  private readonly auth = inject(AuthService);
  private readonly usersApi = inject(AdminUsersApiService);

  protected readonly user = signal<AuthUser | null>(null);

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  // --- usuarios del panel ---
  protected readonly users = signal<AdminUserSummary[]>([]);
  protected readonly loadingUsers = signal(true);
  protected readonly usersError = signal<string | null>(null);

  protected readonly showNewUserForm = signal(false);
  protected readonly newUserEmail = signal('');
  protected readonly newUserName = signal('');
  protected readonly newUserPassword = signal('');
  protected readonly newUserSubmitting = signal(false);
  protected readonly newUserError = signal<string | null>(null);

  protected readonly currentUserId = computed(() => this.user()?.id ?? null);

  constructor() {
    this.auth.me().subscribe((user) => this.user.set(user));
    this.reloadUsers();
  }

  protected get canSubmit(): boolean {
    return (
      this.currentPassword().length >= 8 &&
      this.newPassword().length >= 8 &&
      this.newPassword() === this.confirmPassword()
    );
  }

  protected onSubmit(): void {
    if (!this.canSubmit || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.auth.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set('Contraseña actualizada.');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          err.status === 401
            ? 'La contraseña actual no es correcta.'
            : 'No pudimos actualizar la contraseña.',
        );
      },
    });
  }

  private reloadUsers(): void {
    this.loadingUsers.set(true);
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.usersError.set('No pudimos cargar los usuarios.');
        this.loadingUsers.set(false);
      },
    });
  }

  protected toggleNewUserForm(): void {
    this.showNewUserForm.update((v) => !v);
    this.newUserError.set(null);
    if (!this.showNewUserForm()) {
      this.newUserEmail.set('');
      this.newUserName.set('');
      this.newUserPassword.set('');
    }
  }

  protected get canSubmitNewUser(): boolean {
    return (
      this.newUserEmail().trim().length > 3 &&
      this.newUserName().trim().length >= 2 &&
      this.newUserPassword().length >= 8
    );
  }

  protected onCreateUser(): void {
    if (!this.canSubmitNewUser || this.newUserSubmitting()) return;

    this.newUserSubmitting.set(true);
    this.newUserError.set(null);

    this.usersApi
      .create({
        email: this.newUserEmail().trim(),
        name: this.newUserName().trim(),
        password: this.newUserPassword(),
      })
      .subscribe({
        next: () => {
          this.newUserSubmitting.set(false);
          this.toggleNewUserForm();
          this.reloadUsers();
        },
        error: (err: HttpErrorResponse) => {
          this.newUserSubmitting.set(false);
          this.newUserError.set(
            err.status === 409
              ? 'Ya existe un usuario con ese email.'
              : 'No pudimos crear el usuario.',
          );
        },
      });
  }

  protected onRemoveUser(userId: string, name: string): void {
    // Borrado real (no soft-delete como barberos/servicios) — se confirma antes.
    if (!confirm(`¿Eliminar el acceso de "${name}" al panel? No se puede deshacer.`)) {
      return;
    }

    this.usersError.set(null);
    this.usersApi.remove(userId).subscribe({
      next: () => this.reloadUsers(),
      error: (err: HttpErrorResponse) => {
        this.usersError.set(
          err.status === 400
            ? 'No puedes eliminar tu propia cuenta, ni dejar el panel sin usuarios.'
            : 'No pudimos eliminar el usuario.',
        );
      },
    });
  }
}
