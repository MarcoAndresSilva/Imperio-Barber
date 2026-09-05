import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUserSummary } from '../models/admin.model';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/users`;

  findAll(): Observable<AdminUserSummary[]> {
    return this.http.get<AdminUserSummary[]>(this.base);
  }

  create(dto: CreateUserRequest): Observable<AdminUserSummary> {
    return this.http.post<AdminUserSummary>(this.base, dto);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
