import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface HousekeeperProfile {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  linkedUser?: { id: number; email: string };
}

@Injectable({ providedIn: 'root' })
export class HousekeeperService {
  private base = `${environment.apiUrl}/admin/housekeepers`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<HousekeeperProfile[]> {
    return this.http.get<HousekeeperProfile[]>(this.base);
  }

  create(data: Partial<HousekeeperProfile>): Observable<HousekeeperProfile> {
    return this.http.post<HousekeeperProfile>(this.base, data);
  }

  update(id: number, data: Partial<HousekeeperProfile>): Observable<HousekeeperProfile> {
    return this.http.put<HousekeeperProfile>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  activatePortal(id: number, email: string, password: string): Observable<HousekeeperProfile> {
    return this.http.post<HousekeeperProfile>(`${this.base}/${id}/activate`, { email, password });
  }

  deactivatePortal(id: number): Observable<HousekeeperProfile> {
    return this.http.delete<HousekeeperProfile>(`${this.base}/${id}/deactivate`);
  }
}
