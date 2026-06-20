import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ManualRevenue {
  id: number;
  label: string;
  amount: number;
  beds24PropertyId: string;
  year: number;
  month: number;
  recurring: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ManualRevenueService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(year: number, month: number): Observable<ManualRevenue[]> {
    return this.http.get<ManualRevenue[]>(`${this.base}/admin/manual-revenues?year=${year}&month=${month}`);
  }

  create(revenue: Partial<ManualRevenue>): Observable<ManualRevenue> {
    return this.http.post<ManualRevenue>(`${this.base}/admin/manual-revenues`, revenue);
  }

  update(id: number, revenue: Partial<ManualRevenue>): Observable<ManualRevenue> {
    return this.http.put<ManualRevenue>(`${this.base}/admin/manual-revenues/${id}`, revenue);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/manual-revenues/${id}`);
  }
}
