import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminBooking } from '../models/admin.model';
import { BookingStatus, CreateBookingRequest } from '../models/booking.model';

export interface AdminBookingsQuery {
  date?: string;
  status?: BookingStatus;
  barberId?: string;
}

export interface CreateManualBookingResponse {
  bookingId: string;
  status: BookingStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminBookingsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/bookings`;

  findAll(query: AdminBookingsQuery = {}): Observable<AdminBooking[]> {
    let params = new HttpParams();
    if (query.date) params = params.set('date', query.date);
    if (query.status) params = params.set('status', query.status);
    if (query.barberId) params = params.set('barberId', query.barberId);
    return this.http.get<AdminBooking[]>(this.base, { params });
  }

  createManual(dto: CreateBookingRequest): Observable<CreateManualBookingResponse> {
    return this.http.post<CreateManualBookingResponse>(this.base, dto);
  }

  confirm(id: string): Observable<AdminBooking> {
    return this.http.patch<AdminBooking>(`${this.base}/${id}/confirm`, {});
  }

  reject(id: string): Observable<AdminBooking> {
    return this.http.patch<AdminBooking>(`${this.base}/${id}/reject`, {});
  }

  cancel(id: string): Observable<AdminBooking> {
    return this.http.patch<AdminBooking>(`${this.base}/${id}/cancel`, {});
  }
}
