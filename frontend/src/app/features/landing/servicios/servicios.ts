import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ServicesApiService } from '../../../core/services/services-api.service';
import { Service } from '../../../core/models/service.model';

@Component({
  selector: 'app-servicios',
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Servicios {
  private readonly servicesApi = inject(ServicesApiService);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.servicesApi.findAll().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los servicios. Intenta de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }

  protected formatPrice(priceClp: number): string {
    return `$${priceClp.toLocaleString('es-CL')}`;
  }
}
