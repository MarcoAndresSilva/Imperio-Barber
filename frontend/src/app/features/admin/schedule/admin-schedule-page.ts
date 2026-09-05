import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminBarbersApiService } from '../../../core/services/admin-barbers-api.service';
import { AdminBarber, ScheduleDay, ScheduleException } from '../../../core/models/admin.model';
import { formatDateEsCl, formatMinutesToHHMM } from '../../../core/utils/date.util';

const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

interface ScheduleRowForm {
  weekday: number;
  isWorkingDay: boolean;
  startTime: string; // "HH:MM", para <input type="time">
  endTime: string;
}

function timeValueToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

@Component({
  selector: 'app-admin-schedule-page',
  templateUrl: './admin-schedule-page.html',
  styleUrl: './admin-schedule-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSchedulePage {
  private readonly barbersApi = inject(AdminBarbersApiService);

  protected readonly formatDateEsCl = formatDateEsCl;
  protected readonly weekdayLabels = WEEKDAY_LABELS;

  protected readonly barbers = signal<AdminBarber[]>([]);
  protected readonly selectedBarberId = signal('');

  protected readonly scheduleRows = signal<ScheduleRowForm[]>([]);
  protected readonly loadingSchedule = signal(false);
  protected readonly scheduleSubmitting = signal(false);
  protected readonly scheduleError = signal<string | null>(null);
  protected readonly scheduleSuccess = signal<string | null>(null);

  protected readonly timeOff = signal<ScheduleException[]>([]);
  protected readonly loadingTimeOff = signal(false);
  protected readonly newTimeOffDate = signal('');
  protected readonly newTimeOffReason = signal('');
  protected readonly timeOffSubmitting = signal(false);
  protected readonly timeOffError = signal<string | null>(null);

  constructor() {
    this.barbersApi.findAll().subscribe((barbers) => {
      this.barbers.set(barbers);
      const first = barbers.find((b) => b.active) ?? barbers[0];
      if (first) this.selectedBarberId.set(first.id);
    });

    effect(() => {
      const barberId = this.selectedBarberId();
      if (!barberId) return;
      this.scheduleSuccess.set(null);
      this.scheduleError.set(null);
      this.loadSchedule(barberId);
      this.loadTimeOff(barberId);
    });
  }

  private loadSchedule(barberId: string): void {
    this.loadingSchedule.set(true);
    this.barbersApi.findSchedule(barberId).subscribe({
      next: (rows) => {
        const byWeekday = new Map(rows.map((r) => [r.weekday, r]));
        const full = Array.from({ length: 7 }, (_, weekday) => {
          const row = byWeekday.get(weekday);
          return {
            weekday,
            isWorkingDay: row?.isWorkingDay ?? false,
            startTime: formatMinutesToHHMM(row?.startMinute ?? 600),
            endTime: formatMinutesToHHMM(row?.endMinute ?? 1200),
          };
        });
        this.scheduleRows.set(full);
        this.loadingSchedule.set(false);
      },
      error: () => this.loadingSchedule.set(false),
    });
  }

  private loadTimeOff(barberId: string): void {
    this.loadingTimeOff.set(true);
    this.barbersApi.findTimeOff(barberId).subscribe({
      next: (list) => {
        this.timeOff.set(list);
        this.loadingTimeOff.set(false);
      },
      error: () => this.loadingTimeOff.set(false),
    });
  }

  protected setWorkingDay(weekday: number, value: boolean): void {
    this.scheduleRows.update((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, isWorkingDay: value } : r)),
    );
  }

  protected setStartTime(weekday: number, value: string): void {
    this.scheduleRows.update((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, startTime: value } : r)),
    );
  }

  protected setEndTime(weekday: number, value: string): void {
    this.scheduleRows.update((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, endTime: value } : r)),
    );
  }

  protected onSaveSchedule(): void {
    const barberId = this.selectedBarberId();
    if (!barberId || this.scheduleSubmitting()) return;

    this.scheduleSubmitting.set(true);
    this.scheduleError.set(null);
    this.scheduleSuccess.set(null);

    const days: ScheduleDay[] = this.scheduleRows().map((r) => ({
      weekday: r.weekday,
      isWorkingDay: r.isWorkingDay,
      startMinute: timeValueToMinutes(r.startTime),
      endMinute: timeValueToMinutes(r.endTime),
    }));

    this.barbersApi.replaceSchedule(barberId, days).subscribe({
      next: () => {
        this.scheduleSubmitting.set(false);
        this.scheduleSuccess.set('Horario guardado.');
      },
      error: () => {
        this.scheduleSubmitting.set(false);
        this.scheduleError.set(
          'No pudimos guardar — revisa que en cada día activo el inicio sea antes que el término.',
        );
      },
    });
  }

  protected get canAddTimeOff(): boolean {
    return !!this.newTimeOffDate();
  }

  protected onAddTimeOff(): void {
    const barberId = this.selectedBarberId();
    if (!barberId || !this.canAddTimeOff || this.timeOffSubmitting()) return;

    this.timeOffSubmitting.set(true);
    this.timeOffError.set(null);

    this.barbersApi
      .addTimeOff(barberId, this.newTimeOffDate(), this.newTimeOffReason().trim() || undefined)
      .subscribe({
        next: () => {
          this.timeOffSubmitting.set(false);
          this.newTimeOffDate.set('');
          this.newTimeOffReason.set('');
          this.loadTimeOff(barberId);
        },
        error: (err: HttpErrorResponse) => {
          this.timeOffSubmitting.set(false);
          this.timeOffError.set(
            err.status === 409
              ? 'Ya hay un día libre registrado para esa fecha.'
              : 'No pudimos agregar el día libre.',
          );
        },
      });
  }

  protected onRemoveTimeOff(exceptionId: string): void {
    const barberId = this.selectedBarberId();
    if (!barberId) return;
    this.barbersApi.removeTimeOff(barberId, exceptionId).subscribe({
      next: () => this.loadTimeOff(barberId),
    });
  }
}
