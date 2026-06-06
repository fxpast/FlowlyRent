import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Invoice } from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private base = `${environment.apiUrl}/admin/invoices`;

  constructor(private http: HttpClient) {}

  getAll(status?: string): Observable<Invoice[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<Invoice[]>(this.base, { params });
  }

  getById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.base}/${id}`);
  }

  create(invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.post<Invoice>(this.base, invoice);
  }

  update(id: number, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.base}/${id}`, invoice);
  }

  updateStatus(id: number, status: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.base}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
