import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Logo } from '../../design-system/logo/logo';
import { BookingsApiService } from '../../core/services/bookings-api.service';
import { BookingDetail, BookingStatus } from '../../core/models/booking.model';
import { formatClp } from '../../core/utils/currency.util';
import { formatDateEsCl, formatMinutesToHHMM } from '../../core/utils/date.util';

type ViewState = 'loading' | 'ready' | 'not-found';

@Component({
  selector: 'app-confirm-page',
  imports: [Logo],
  templateUrl: './confirm-page.html',
  styleUrl: './confirm-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmPage {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingsApi = inject(BookingsApiService);

  protected readonly formatClp = formatClp;
  protected readonly formatDateEsCl = formatDateEsCl;
  protected readonly formatMinutesToHHMM = formatMinutesToHHMM;

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly submitting = signal<'accept' | 'reject' | null>(null);
  protected readonly actionError = signal<string | null>(null);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  constructor() {
    this.load();
  }

  private load(): void {
    this.bookingsApi.getByToken(this.token).subscribe({
      next: (booking) => {
        this.booking.set(booking);
        this.viewState.set('ready');
      },
      error: () => {
        this.viewState.set('not-found');
      },
    });
  }

  protected statusLabel(status: BookingStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'REJECTED':
        return 'Rechazada';
      case 'EXPIRED':
        return 'Expirada';
    }
  }

  protected resolvedMessage(status: BookingStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return '✓ Confirmaste esta hora — quedó bloqueada en la página, nadie más puede tomarla.';
      case 'REJECTED':
        return 'Rechazaste esta solicitud — el horario quedó liberado para otros clientes.';
      case 'EXPIRED':
        return 'Esta solicitud expiró antes de resolverse — el horario ya se liberó automáticamente.';
      default:
        return '';
    }
  }

  protected onAccept(): void {
    this.runAction('accept', () => this.bookingsApi.accept(this.token));
  }

  protected onReject(): void {
    this.runAction('reject', () => this.bookingsApi.reject(this.token));
  }

  private runAction(kind: 'accept' | 'reject', call: () => ReturnType<BookingsApiService['accept']>): void {
    this.submitting.set(kind);
    this.actionError.set(null);

    call().subscribe({
      next: () => {
        this.submitting.set(null);
        const current = this.booking();
        if (current) {
          this.booking.set({ ...current, status: kind === 'accept' ? 'CONFIRMED' : 'REJECTED' });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(null);
        this.actionError.set(
          err.status === 409
            ? 'Esta solicitud ya no está pendiente — puede que ya la hayas resuelto, o que haya expirado.'
            : 'No pudimos procesar la acción. Intenta de nuevo.',
        );
        this.load();
      },
    });
  }
}
