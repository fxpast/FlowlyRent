import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PropertyBundle {
  id?: number;
  name: string;
  bundlePropertyId: string;
  memberPropertyIds: string[];
  enabled: boolean;
  horizonDays: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

@Injectable({ providedIn: 'root' })
export class PropertyBundleService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<PropertyBundle[]> {
    return this.http.get<PropertyBundle[]>(`${this.base}/admin/property-bundles`);
  }

  create(bundle: Omit<PropertyBundle, 'id' | 'lastRunAt' | 'lastRunStatus'>): Observable<PropertyBundle> {
    return this.http.post<PropertyBundle>(`${this.base}/admin/property-bundles`, bundle);
  }

  update(id: number, bundle: Omit<PropertyBundle, 'id' | 'lastRunAt' | 'lastRunStatus'>): Observable<PropertyBundle> {
    return this.http.put<PropertyBundle>(`${this.base}/admin/property-bundles/${id}`, bundle);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/admin/property-bundles/${id}`);
  }

  runNow(id: number): Observable<{ success: boolean; propertiesUpdated?: number; error?: string }> {
    return this.http.post<{ success: boolean; propertiesUpdated?: number; error?: string }>(`${this.base}/admin/property-bundles/${id}/run`, {});
  }
}
