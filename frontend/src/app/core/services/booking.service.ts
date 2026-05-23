import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Booking, BookingRequest } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private base = `${environment.apiUrl}/admin/bookings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.base);
  }

  getById(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${id}`);
  }

  create(req: BookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.base, req);
  }

  update(id: number, req: Partial<BookingRequest>): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/${id}`, req);
  }

  updateStatus(id: number, status: string): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}/status`, { status });
  }

  getArrivals(weekStart?: string): Observable<Booking[]> {
    let params = new HttpParams();
    if (weekStart) params = params.set('weekStart', weekStart);
    return this.http.get<Booking[]>(`${this.base}/arrivals`, { params });
  }

  getDepartures(weekStart?: string): Observable<Booking[]> {
    let params = new HttpParams();
    if (weekStart) params = params.set('weekStart', weekStart);
    return this.http.get<Booking[]>(`${this.base}/departures`, { params });
  }
}
