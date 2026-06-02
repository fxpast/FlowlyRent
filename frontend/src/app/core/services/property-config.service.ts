import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PropertyConfig {
  id?: number;
  beds24PropertyId: string;
  accessCode?: string;
  previousAccessCode?: string;
  cleaningHours?: number | null;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyConfigService {
  private base = `${environment.apiUrl}/admin/property-configs`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PropertyConfig[]> {
    return this.http.get<PropertyConfig[]>(this.base);
  }

  updateAccessCode(propId: string, code: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { accessCode: code });
  }

  updateCleaningHours(propId: string, hours: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { cleaningHours: hours });
  }

  regenerate(propId: string): Observable<PropertyConfig> {
    return this.http.post<PropertyConfig>(`${this.base}/${propId}/regenerate`, {});
  }
}
