import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Barber } from '../../../core/models/barber.model';

@Component({
  selector: 'app-barber-card',
  templateUrl: './barber-card.html',
  styleUrl: './barber-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarberCard {
  barber = input.required<Barber>();
  selected = input(false);

  selectBarber = output<string>();

  protected readonly imageFailed = signal(false);

  protected onImageError(): void {
    this.imageFailed.set(true);
  }

  protected get initials(): string {
    return this.barber()
      .name.split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
