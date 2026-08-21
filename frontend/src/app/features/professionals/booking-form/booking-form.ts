import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export interface BookingFormValue {
  customerName: string;
  customerPhone: string;
}

@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.html',
  styleUrl: './booking-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingForm {
  submitting = input(false);
  errorMessage = input<string | null>(null);

  submitBooking = output<BookingFormValue>();

  protected readonly customerName = signal('');
  protected readonly customerPhone = signal('');

  protected get canSubmit(): boolean {
    return this.customerName().trim().length >= 2 && this.customerPhone().trim().length >= 6;
  }

  protected onSubmit(): void {
    if (!this.canSubmit || this.submitting()) return;
    this.submitBooking.emit({
      customerName: this.customerName().trim(),
      customerPhone: this.customerPhone().trim(),
    });
  }
}
