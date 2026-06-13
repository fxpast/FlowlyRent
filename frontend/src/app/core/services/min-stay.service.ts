import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface MinStayStrategy {
  enabled: boolean;
  nearDays: number;
  nearMinStay: number;
  farMinStay: number;
  horizonDays: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

@Injectable({ providedIn: 'root' })
export class MinStayService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get(): Observable<MinStayStrategy> {
    return this.http.get<MinStayStrategy>(`${this.base}/admin/min-stay`);
  }

  save(strategy: Omit<MinStayStrategy, 'lastRunAt' | 'lastRunStatus'>): Observable<MinStayStrategy> {
    return this.http.put<MinStayStrategy>(`${this.base}/admin/min-stay`, strategy);
  }

  runNow(): Observable<{ success: boolean; propertiesUpdated?: number; error?: string }> {
    return this.http.post<{ success: boolean; propertiesUpdated?: number; error?: string }>(`${this.base}/admin/min-stay/run`, {});
  }
}
