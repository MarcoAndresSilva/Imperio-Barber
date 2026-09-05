import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AdminBarbersApiService,
  CreateBarberRequest,
} from '../../../core/services/admin-barbers-api.service';
import { AdminBarber } from '../../../core/models/admin.model';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE_RE = /^\d{8,15}$/;

@Component({
  selector: 'app-admin-barbers-page',
  templateUrl: './admin-barbers-page.html',
  styleUrl: './admin-barbers-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBarbersPage {
  private readonly api = inject(AdminBarbersApiService);

  protected readonly barbers = signal<AdminBarber[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly formName = signal('');
  protected readonly formSlug = signal('');
  protected readonly formPhotoUrl = signal('');
  protected readonly formWhatsapp = signal('');
  protected readonly formBio = signal('');
  protected readonly formRating = signal(0);
  protected readonly formSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (barbers) => {
        this.barbers.set(barbers);
        this.loading.set(false);
      },
      error: () => {
        this.listError.set('No pudimos cargar los barberos.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formSlug.set('');
    this.formPhotoUrl.set('');
    this.formWhatsapp.set('');
    this.formBio.set('');
    this.formRating.set(0);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected startEdit(barber: AdminBarber): void {
    this.editingId.set(barber.id);
    this.formName.set(barber.name);
    this.formSlug.set(barber.slug);
    this.formPhotoUrl.set(barber.photoUrl);
    this.formWhatsapp.set(barber.whatsappPhone);
    this.formBio.set(barber.bio ?? '');
    this.formRating.set(barber.ratingAverage);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  protected get canSubmitForm(): boolean {
    return (
      this.formName().trim().length >= 2 &&
      SLUG_RE.test(this.formSlug().trim()) &&
      this.formPhotoUrl().trim().length > 0 &&
      PHONE_RE.test(this.formWhatsapp().trim())
    );
  }

  protected onSubmitForm(): void {
    if (!this.canSubmitForm || this.formSubmitting()) return;

    this.formSubmitting.set(true);
    this.formError.set(null);

    const dto: CreateBarberRequest = {
      name: this.formName().trim(),
      slug: this.formSlug().trim(),
      photoUrl: this.formPhotoUrl().trim(),
      whatsappPhone: this.formWhatsapp().trim(),
      bio: this.formBio().trim() || undefined,
      ratingAverage: this.formRating(),
    };

    const editingId = this.editingId();
    const request$ = editingId ? this.api.update(editingId, dto) : this.api.create(dto);

    request$.subscribe({
      next: () => {
        this.formSubmitting.set(false);
        this.cancelForm();
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.formSubmitting.set(false);
        this.formError.set(
          err.status === 409
            ? 'Ya existe un barbero con ese slug o ese WhatsApp.'
            : 'No pudimos guardar el barbero.',
        );
      },
    });
  }

  protected toggleActive(barber: AdminBarber): void {
    this.api.setActive(barber.id, !barber.active).subscribe({
      next: () => this.reload(),
      error: () => this.listError.set('No pudimos cambiar el estado del barbero.'),
    });
  }
}
