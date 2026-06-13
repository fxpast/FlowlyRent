import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ManualExpense {
  id: number;
  label: string;
  amount: number;
  beds24PropertyId: string;
  year: number;
  month: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ManualExpenseService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(year: number, month: number): Observable<ManualExpense[]> {
    return this.http.get<ManualExpense[]>(`${this.base}/admin/manual-expenses?year=${year}&month=${month}`);
  }

  create(expense: Partial<ManualExpense>): Observable<ManualExpense> {
    return this.http.post<ManualExpense>(`${this.base}/admin/manual-expenses`, expense);
  }

  update(id: number, expense: Partial<ManualExpense>): Observable<ManualExpense> {
    return this.http.put<ManualExpense>(`${this.base}/admin/manual-expenses/${id}`, expense);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/manual-expenses/${id}`);
  }
}
