import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminBarber,
  BarberScheduleRow,
  ScheduleDay,
  ScheduleException,
} from '../models/admin.model';

export type CreateBarberRequest = Pick<
  AdminBarber,
  'name' | 'slug' | 'photoUrl' | 'whatsappPhone'
> &
  Partial<Pick<AdminBarber, 'bio' | 'ratingAverage' | 'ratingCount' | 'active'>>;

export type UpdateBarberRequest = Partial<CreateBarberRequest>;

@Injectable({ providedIn: 'root' })
export class AdminBarbersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/barbers`;

  findAll(): Observable<AdminBarber[]> {
    return this.http.get<AdminBarber[]>(this.base);
  }

  create(dto: CreateBarberRequest): Observable<AdminBarber> {
    return this.http.post<AdminBarber>(this.base, dto);
  }

  update(id: string, dto: UpdateBarberRequest): Observable<AdminBarber> {
    return this.http.patch<AdminBarber>(`${this.base}/${id}`, dto);
  }

  setActive(id: string, active: boolean): Observable<AdminBarber> {
    return active
      ? this.update(id, { active: true })
      : this.http.delete<AdminBarber>(`${this.base}/${id}`);
  }

  findSchedule(id: string): Observable<BarberScheduleRow[]> {
    return this.http.get<BarberScheduleRow[]>(`${this.base}/${id}/schedule`);
  }

  replaceSchedule(id: string, days: ScheduleDay[]): Observable<BarberScheduleRow[]> {
    return this.http.put<BarberScheduleRow[]>(`${this.base}/${id}/schedule`, { days });
  }

  findTimeOff(id: string): Observable<ScheduleException[]> {
    return this.http.get<ScheduleException[]>(`${this.base}/${id}/time-off`);
  }

  addTimeOff(id: string, date: string, reason?: string): Observable<ScheduleException> {
    return this.http.post<ScheduleException>(`${this.base}/${id}/time-off`, { date, reason });
  }

  removeTimeOff(id: string, exceptionId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/time-off/${exceptionId}`);
  }
}
