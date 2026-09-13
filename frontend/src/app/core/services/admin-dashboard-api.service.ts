import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }
}
