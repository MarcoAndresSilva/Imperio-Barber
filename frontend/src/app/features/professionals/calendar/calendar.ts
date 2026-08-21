import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { buildMonthGrid, monthLabel, todayInChileStr, weekdayFromDateStr } from '../date.util';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  selectedDate = input.required<string>();
  disabledWeekdays = input<number[]>([]);

  dateSelected = output<string>();

  protected readonly weekdayLabels = WEEKDAY_LABELS;
  protected readonly today = todayInChileStr();

  private readonly todayParts = this.today.split('-').map(Number);
  protected readonly viewYear = signal(this.todayParts[0]);
  protected readonly viewMonth = signal(this.todayParts[1] - 1); // 0-indexado

  protected readonly monthLabel = computed(() => monthLabel(this.viewYear(), this.viewMonth()));
  protected readonly weeks = computed(() =>
    buildMonthGrid(this.viewYear(), this.viewMonth(), this.today),
  );

  protected readonly canGoPrev = computed(() => {
    const [y, m] = this.today.split('-').map(Number);
    return this.viewYear() > y || (this.viewYear() === y && this.viewMonth() > m - 1);
  });

  protected isDisabled(dateStr: string, isPast: boolean): boolean {
    if (isPast) return true;
    return this.disabledWeekdays().includes(weekdayFromDateStr(dateStr));
  }

  protected prevMonth(): void {
    if (!this.canGoPrev()) return;
    if (this.viewMonth() === 0) {
      this.viewYear.update((y) => y - 1);
      this.viewMonth.set(11);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
  }

  protected nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewYear.update((y) => y + 1);
      this.viewMonth.set(0);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
  }
}
