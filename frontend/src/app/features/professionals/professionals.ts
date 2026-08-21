import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BarberCard } from './barber-card/barber-card';
import { Calendar } from './calendar/calendar';
import { TimeSlots } from './time-slots/time-slots';
import { BookingForm, BookingFormValue } from './booking-form/booking-form';
import { BarbersApiService } from '../../core/services/barbers-api.service';
import { ServicesApiService } from '../../core/services/services-api.service';
import { BookingsApiService } from '../../core/services/bookings-api.service';
import { Barber, BarberSchedule } from '../../core/models/barber.model';
import { Service } from '../../core/models/service.model';
import { AvailabilitySlot } from '../../core/models/availability.model';
import { formatClp } from '../../core/utils/currency.util';
import { todayInChileStr } from './date.util';

const FADE_MS = 180;

@Component({
  selector: 'app-professionals',
  imports: [BarberCard, Calendar, TimeSlots, BookingForm],
  templateUrl: './professionals.html',
  styleUrl: './professionals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Professionals {
  private readonly barbersApi = inject(BarbersApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly bookingsApi = inject(BookingsApiService);

  protected readonly formatPrice = formatClp;

  protected readonly barbers = signal<Barber[]>([]);
  protected readonly services = signal<Service[]>([]);
  protected readonly loadingBarbers = signal(true);
  protected readonly loadingServices = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly selectedBarberId = signal<string | null>(null);
  protected readonly selectedServiceId = signal<string | null>(null);
  protected readonly selectedDate = signal<string>(todayInChileStr());

  protected readonly schedule = signal<BarberSchedule[]>([]);
  protected readonly availableSlots = signal<AvailabilitySlot[]>([]);
  protected readonly selectedSlot = signal<AvailabilitySlot | null>(null);
  protected readonly loadingAvailability = signal(false);

  protected readonly panelFading = signal(false);
  protected readonly leftPhotoFailed = signal(false);

  protected readonly bookingSubmitting = signal(false);
  protected readonly bookingError = signal<string | null>(null);
  protected readonly bookingSuccessUrl = signal<string | null>(null);

  protected readonly selectedBarber = computed(
    () => this.barbers().find((b) => b.id === this.selectedBarberId()) ?? null,
  );
  protected readonly selectedService = computed(
    () => this.services().find((s) => s.id === this.selectedServiceId()) ?? null,
  );
  protected readonly disabledWeekdays = computed(() =>
    this.schedule()
      .filter((s) => !s.isWorkingDay)
      .map((s) => s.weekday),
  );
  protected readonly filledStars = computed(() =>
    Math.round(this.selectedBarber()?.ratingAverage ?? 0),
  );

  constructor() {
    this.barbersApi.findAll().subscribe({
      next: (barbers) => {
        this.barbers.set(barbers);
        if (barbers.length > 0) this.selectedBarberId.set(barbers[0].id);
        this.loadingBarbers.set(false);
      },
      error: () => {
        this.listError.set('No pudimos cargar los barberos. Intenta de nuevo más tarde.');
        this.loadingBarbers.set(false);
      },
    });

    this.servicesApi.findAll().subscribe({
      next: (services) => {
        this.services.set(services);
        if (services.length > 0) this.selectedServiceId.set(services[0].id);
        this.loadingServices.set(false);
      },
      error: () => {
        this.loadingServices.set(false);
      },
    });

    let firstScheduleRun = true;
    effect(() => {
      const barberId = this.selectedBarberId();
      if (!barberId) return;

      this.leftPhotoFailed.set(false);

      if (!firstScheduleRun) {
        this.panelFading.set(true);
        setTimeout(() => this.panelFading.set(false), FADE_MS);
      }
      firstScheduleRun = false;

      this.barbersApi.findSchedule(barberId).subscribe({
        next: (schedule) => this.schedule.set(schedule),
        error: () => this.schedule.set([]),
      });
    });

    effect(() => {
      const barberId = this.selectedBarberId();
      const serviceId = this.selectedServiceId();
      const date = this.selectedDate();
      if (!barberId || !serviceId || !date) return;

      this.selectedSlot.set(null);
      this.bookingError.set(null);
      this.bookingSuccessUrl.set(null);
      this.loadingAvailability.set(true);

      this.barbersApi.findAvailability(barberId, serviceId, date).subscribe({
        next: (slots) => {
          this.availableSlots.set(slots);
          this.loadingAvailability.set(false);
        },
        error: () => {
          this.availableSlots.set([]);
          this.loadingAvailability.set(false);
        },
      });
    });
  }

  protected onImageErrorLeft(): void {
    this.leftPhotoFailed.set(true);
  }

  protected initialsOf(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  protected onSubmitBooking(value: BookingFormValue): void {
    const barberId = this.selectedBarberId();
    const serviceId = this.selectedServiceId();
    const date = this.selectedDate();
    const slot = this.selectedSlot();
    if (!barberId || !serviceId || !date || !slot) return;

    this.bookingSubmitting.set(true);
    this.bookingError.set(null);

    this.bookingsApi
      .create({
        barberId,
        serviceId,
        date,
        startMinute: slot.startMinute,
        customerName: value.customerName,
        customerPhone: value.customerPhone,
      })
      .subscribe({
        next: (res) => {
          this.bookingSubmitting.set(false);
          this.bookingSuccessUrl.set(res.whatsappUrl);
          window.open(res.whatsappUrl, '_blank');
          this.selectedSlot.set(null);
          this.refreshAvailability(barberId, serviceId, date);
        },
        error: (err: HttpErrorResponse) => {
          this.bookingSubmitting.set(false);
          this.bookingError.set(
            err.status === 409
              ? 'Ese horario ya no está disponible, elige otro.'
              : 'No pudimos crear la reserva. Intenta de nuevo.',
          );
          this.refreshAvailability(barberId, serviceId, date);
        },
      });
  }

  private refreshAvailability(barberId: string, serviceId: string, date: string): void {
    this.barbersApi.findAvailability(barberId, serviceId, date).subscribe((slots) => {
      this.availableSlots.set(slots);
    });
  }
}
