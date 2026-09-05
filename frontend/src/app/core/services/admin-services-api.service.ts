import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminService } from '../models/admin.model';

export type CreateServiceRequest = Pick<
  AdminService,
  'name' | 'slug' | 'priceClp' | 'durationMinutes'
> &
  Partial<Pick<AdminService, 'description' | 'sortOrder' | 'active'>>;

export type UpdateServiceRequest = Partial<CreateServiceRequest>;

@Injectable({ providedIn: 'root' })
export class AdminServicesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/services`;

  findAll(): Observable<AdminService[]> {
    return this.http.get<AdminService[]>(this.base);
  }

  create(dto: CreateServiceRequest): Observable<AdminService> {
    return this.http.post<AdminService>(this.base, dto);
  }

  update(id: string, dto: UpdateServiceRequest): Observable<AdminService> {
    return this.http.patch<AdminService>(`${this.base}/${id}`, dto);
  }

  setActive(id: string, active: boolean): Observable<AdminService> {
    return active
      ? this.update(id, { active: true })
      : this.http.delete<AdminService>(`${this.base}/${id}`);
  }
}
