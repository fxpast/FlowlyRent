import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PromoCode {
  id: number;
  beds24PropertyId: string;
  code: string;
  discountPercent: number;
  active: boolean;
  usageCount: number;
}

@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private base = `${environment.apiUrl}/admin/promo-codes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(this.base);
  }

  create(data: { beds24PropertyId: string; code: string; discountPercent: number }): Observable<PromoCode> {
    return this.http.post<PromoCode>(this.base, data);
  }

  update(id: number, data: Partial<Pick<PromoCode, 'code' | 'discountPercent' | 'active'>>): Observable<PromoCode> {
    return this.http.put<PromoCode>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
