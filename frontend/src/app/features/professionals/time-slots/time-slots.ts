import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AvailabilitySlot } from '../../../core/models/availability.model';
import { formatMinutesToHHMM } from '../date.util';

@Component({
  selector: 'app-time-slots',
  templateUrl: './time-slots.html',
  styleUrl: './time-slots.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSlots {
  slots = input.required<AvailabilitySlot[]>();
  loading = input(false);
  selectedStartMinute = input<number | null>(null);

  slotSelected = output<AvailabilitySlot>();

  protected readonly formatMinutesToHHMM = formatMinutesToHHMM;
}
