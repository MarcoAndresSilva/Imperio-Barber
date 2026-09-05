import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminBookingsApiService } from '../../../core/services/admin-bookings-api.service';
import { AdminBarbersApiService } from '../../../core/services/admin-barbers-api.service';
import { AdminServicesApiService } from '../../../core/services/admin-services-api.service';
import { BarbersApiService } from '../../../core/services/barbers-api.service';
import { AdminBarber, AdminBooking, AdminService } from '../../../core/models/admin.model';
import { AvailabilitySlot } from '../../../core/models/availability.model';
import { BookingStatus } from '../../../core/models/booking.model';
import { formatClp } from '../../../core/utils/currency.util';
import {
  formatDateEsCl,
  formatMinutesToHHMM,
  todayInChileStr,
} from '../../../core/utils/date.util';

const STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

@Component({
  selector: 'app-admin-bookings-page',
  templateUrl: './admin-bookings-page.html',
  styleUrl: './admin-bookings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBookingsPage {
  private readonly bookingsApi = inject(AdminBookingsApiService);
  private readonly barbersApi = inject(AdminBarbersApiService);
  private readonly servicesApi = inject(AdminServicesApiService);
  private readonly availabilityApi = inject(BarbersApiService);

  protected readonly formatClp = formatClp;
  protected readonly formatMinutesToHHMM = formatMinutesToHHMM;
  protected readonly formatDateEsCl = formatDateEsCl;
  protected readonly statuses = STATUSES;

  protected readonly barbers = signal<AdminBarber[]>([]);
  protected readonly services = signal<AdminService[]>([]);
  protected readonly activeBarbers = computed(() => this.barbers().filter((b) => b.active));
  protected readonly activeServices = computed(() => this.services().filter((s) => s.active));

  // Sin filtro de fecha por defecto: sirve para ver el historial completo (pasado
  // y futuro) apenas se entra, sin tener que apretar "Limpiar filtros" primero.
  protected readonly filterDate = signal<string>('');
  protected readonly filterStatus = signal<BookingStatus | ''>('');
  protected readonly filterBarberId = signal<string>('');

  protected readonly bookings = signal<AdminBooking[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);
  protected readonly actionPendingId = signal<string | null>(null);

  // Cronológico: fecha primero, y dentro del mismo día por hora — antes solo
  // ordenaba por hora, así que con varias fechas a la vista (sin filtro) las
  // mezclaba todas sin agrupar por día.
  protected readonly sortedBookings = computed(() =>
    [...this.bookings()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute,
    ),
  );

  // --- reserva manual ---
  protected readonly showManualForm = signal(false);
  protected readonly manualBarberId = signal('');
  protected readonly manualServiceId = signal('');
  protected readonly manualDate = signal<string>(todayInChileStr());
  protected readonly manualSlots = signal<AvailabilitySlot[]>([]);
  protected readonly loadingManualSlots = signal(false);
  protected readonly manualStartMinute = signal<number | null>(null);
  protected readonly manualCustomerName = signal('');
  protected readonly manualCustomerPhone = signal('');
  protected readonly manualSubmitting = signal(false);
  protected readonly manualError = signal<string | null>(null);

  constructor() {
    this.barbersApi.findAll().subscribe((b) => this.barbers.set(b));
    this.servicesApi.findAll().subscribe((s) => this.services.set(s));
    this.reload();

    effect(() => {
      const barberId = this.manualBarberId();
      const serviceId = this.manualServiceId();
      const date = this.manualDate();
      this.manualStartMinute.set(null);

      if (!barberId || !serviceId || !date) {
        this.manualSlots.set([]);
        return;
      }

      this.loadingManualSlots.set(true);
      this.availabilityApi.findAvailability(barberId, serviceId, date).subscribe({
        next: (slots) => {
          this.manualSlots.set(slots);
          this.loadingManualSlots.set(false);
        },
        error: () => {
          this.manualSlots.set([]);
          this.loadingManualSlots.set(false);
        },
      });
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.listError.set(null);

    this.bookingsApi
      .findAll({
        date: this.filterDate() || undefined,
        status: this.filterStatus() || undefined,
        barberId: this.filterBarberId() || undefined,
      })
      .subscribe({
        next: (list) => {
          this.bookings.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.listError.set('No pudimos cargar las reservas.');
          this.loading.set(false);
        },
      });
  }

  protected canConfirm(b: AdminBooking): boolean {
    return b.status === 'PENDING';
  }

  protected canReject(b: AdminBooking): boolean {
    return b.status === 'PENDING';
  }

  protected canCancel(b: AdminBooking): boolean {
    return b.status === 'CONFIRMED';
  }

  protected onConfirm(b: AdminBooking): void {
    this.runAction(b.id, this.bookingsApi.confirm(b.id));
  }

  protected onReject(b: AdminBooking): void {
    this.runAction(b.id, this.bookingsApi.reject(b.id));
  }

  protected onCancel(b: AdminBooking): void {
    this.runAction(b.id, this.bookingsApi.cancel(b.id));
  }

  private runAction(id: string, obs: Observable<unknown>): void {
    this.actionPendingId.set(id);
    this.listError.set(null);

    obs.subscribe({
      next: () => {
        this.actionPendingId.set(null);
        this.reload();
      },
      error: () => {
        this.actionPendingId.set(null);
        this.listError.set('No pudimos actualizar esa reserva — puede que ya haya cambiado de estado.');
        this.reload();
      },
    });
  }

  protected toggleManualForm(): void {
    this.showManualForm.update((v) => !v);
    this.manualError.set(null);
  }

  protected get canSubmitManual(): boolean {
    return (
      !!this.manualBarberId() &&
      !!this.manualServiceId() &&
      this.manualStartMinute() !== null &&
      this.manualCustomerName().trim().length >= 2 &&
      this.manualCustomerPhone().trim().length >= 6
    );
  }

  protected onSubmitManual(): void {
    if (!this.canSubmitManual || this.manualSubmitting()) return;

    this.manualSubmitting.set(true);
    this.manualError.set(null);

    this.bookingsApi
      .createManual({
        barberId: this.manualBarberId(),
        serviceId: this.manualServiceId(),
        date: this.manualDate(),
        startMinute: this.manualStartMinute()!,
        customerName: this.manualCustomerName().trim(),
        customerPhone: this.manualCustomerPhone().trim(),
      })
      .subscribe({
        next: () => {
          this.manualSubmitting.set(false);
          this.showManualForm.set(false);
          this.manualCustomerName.set('');
          this.manualCustomerPhone.set('');
          this.manualStartMinute.set(null);
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.manualSubmitting.set(false);
          this.manualError.set(
            err.status === 409
              ? 'Ese horario ya no está disponible, elige otro.'
              : 'No pudimos crear la reserva.',
          );
        },
      });
  }
}
