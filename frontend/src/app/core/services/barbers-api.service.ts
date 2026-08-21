import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Barber, BarberSchedule } from '../models/barber.model';
import { AvailabilitySlot } from '../models/availability.model';

@Injectable({ providedIn: 'root' })
export class BarbersApiService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Barber[]> {
    return this.http.get<Barber[]>(`${environment.apiUrl}/barbers`);
  }

  findSchedule(barberId: string): Observable<BarberSchedule[]> {
    return this.http.get<BarberSchedule[]>(`${environment.apiUrl}/barbers/${barberId}/schedule`);
  }

  findAvailability(
    barberId: string,
    serviceId: string,
    date: string,
  ): Observable<AvailabilitySlot[]> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    return this.http.get<AvailabilitySlot[]>(
      `${environment.apiUrl}/barbers/${barberId}/availability`,
      { params },
    );
  }
}
