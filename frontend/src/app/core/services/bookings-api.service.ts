import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BookingDetail,
  CreateBookingRequest,
  CreateBookingResponse,
} from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingsApiService {
  private readonly http = inject(HttpClient);

  create(dto: CreateBookingRequest): Observable<CreateBookingResponse> {
    return this.http.post<CreateBookingResponse>(`${environment.apiUrl}/bookings`, dto);
  }

  getByToken(token: string): Observable<BookingDetail> {
    return this.http.get<BookingDetail>(`${environment.apiUrl}/bookings/confirm/${token}`);
  }

  accept(token: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/bookings/confirm/${token}/accept`, {});
  }

  reject(token: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/bookings/confirm/${token}/reject`, {});
  }
}
