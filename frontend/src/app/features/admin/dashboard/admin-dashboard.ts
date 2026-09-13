import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBookingsApiService } from '../../../core/services/admin-bookings-api.service';
import { AdminDashboardApiService } from '../../../core/services/admin-dashboard-api.service';
import { AdminBooking, DashboardStats } from '../../../core/models/admin.model';
import { formatClp } from '../../../core/utils/currency.util';
import { formatMinutesToHHMM, todayInChileStr } from '../../../core/utils/date.util';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private readonly api = inject(AdminBookingsApiService);
  private readonly statsApi = inject(AdminDashboardApiService);

  protected readonly formatClp = formatClp;
  protected readonly formatMinutesToHHMM = formatMinutesToHHMM;
  protected readonly today = todayInChileStr();

  protected readonly bookings = signal<AdminBooking[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly statsLoading = signal(true);

  protected readonly pendingCount = computed(
    () => this.bookings().filter((b) => b.status === 'PENDING').length,
  );
  protected readonly confirmedCount = computed(
    () => this.bookings().filter((b) => b.status === 'CONFIRMED').length,
  );
  protected readonly otherCount = computed(
    () =>
      this.bookings().length - this.pendingCount() - this.confirmedCount(),
  );
  protected readonly sortedBookings = computed(() =>
    [...this.bookings()].sort((a, b) => a.startMinute - b.startMinute),
  );

  constructor() {
    this.api.findAll({ date: this.today }).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('No pudimos cargar las reservas de hoy.');
        this.loading.set(false);
      },
    });

    this.statsApi.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
      },
    });
  }
}
