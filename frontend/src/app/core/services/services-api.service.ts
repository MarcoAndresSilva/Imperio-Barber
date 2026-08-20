import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Service } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServicesApiService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Service[]> {
    return this.http.get<Service[]>(`${environment.apiUrl}/services`);
  }
}
