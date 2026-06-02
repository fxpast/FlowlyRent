import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface BookingTimeOverride {
  id?: number;
  beds24BookingId: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  note?: string | null;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingTimeOverrideService {
  private base = `${environment.apiUrl}/admin/booking-time-overrides`;

  constructor(private http: HttpClient) {}

  get(bookingId: string): Observable<BookingTimeOverride> {
    return this.http.get<BookingTimeOverride>(`${this.base}/${bookingId}`);
  }

  upsert(bookingId: string, data: Partial<BookingTimeOverride>): Observable<BookingTimeOverride> {
    return this.http.put<BookingTimeOverride>(`${this.base}/${bookingId}`, data);
  }

  delete(bookingId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${bookingId}`);
  }
}
