import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AdminServicesApiService,
  CreateServiceRequest,
} from '../../../core/services/admin-services-api.service';
import { AdminService } from '../../../core/models/admin.model';
import { formatClp } from '../../../core/utils/currency.util';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Component({
  selector: 'app-admin-services-page',
  templateUrl: './admin-services-page.html',
  styleUrl: './admin-services-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminServicesPage {
  private readonly api = inject(AdminServicesApiService);

  protected readonly formatClp = formatClp;

  protected readonly services = signal<AdminService[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly formName = signal('');
  protected readonly formSlug = signal('');
  protected readonly formDescription = signal('');
  protected readonly formPriceClp = signal(0);
  protected readonly formDurationMinutes = signal(30);
  protected readonly formSortOrder = signal(0);
  protected readonly formSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => {
        this.listError.set('No pudimos cargar los servicios.');
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formSlug.set('');
    this.formDescription.set('');
    this.formPriceClp.set(0);
    this.formDurationMinutes.set(30);
    this.formSortOrder.set(this.services().length);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected startEdit(service: AdminService): void {
    this.editingId.set(service.id);
    this.formName.set(service.name);
    this.formSlug.set(service.slug);
    this.formDescription.set(service.description ?? '');
    this.formPriceClp.set(service.priceClp);
    this.formDurationMinutes.set(service.durationMinutes);
    this.formSortOrder.set(service.sortOrder);
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
      this.formPriceClp() >= 0 &&
      this.formDurationMinutes() >= 5
    );
  }

  protected onSubmitForm(): void {
    if (!this.canSubmitForm || this.formSubmitting()) return;

    this.formSubmitting.set(true);
    this.formError.set(null);

    const dto: CreateServiceRequest = {
      name: this.formName().trim(),
      slug: this.formSlug().trim(),
      description: this.formDescription().trim() || undefined,
      priceClp: this.formPriceClp(),
      durationMinutes: this.formDurationMinutes(),
      sortOrder: this.formSortOrder(),
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
          err.status === 409 ? 'Ya existe un servicio con ese slug.' : 'No pudimos guardar el servicio.',
        );
      },
    });
  }

  protected toggleActive(service: AdminService): void {
    this.api.setActive(service.id, !service.active).subscribe({
      next: () => this.reload(),
      error: () => this.listError.set('No pudimos cambiar el estado del servicio.'),
    });
  }
}
