import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MessageReminderService {
  private sentMap = new Map<string, string>();

  constructor(private http: HttpClient) {}

  load(): Observable<{ bookingId: string; propertyId: string; type: string }[]> {
    return this.http.get<{ bookingId: string; propertyId: string; type: string }[]>(
      `${environment.apiUrl}/admin/bookings/sent-ids`
    ).pipe(
      tap(entries => {
        this.sentMap.clear();
        entries.forEach(e => this.sentMap.set(`${e.propertyId}:${e.type}`, e.bookingId));
      })
    );
  }

  markSent(bookingId: string | number, propertyId: string | number, type: 'arrival' | 'departure'): void {
    const bid = String(bookingId);
    const pid = String(propertyId);
    this.sentMap.set(`${pid}:${type}`, bid);
    this.http.post(`${environment.apiUrl}/admin/bookings/mark-sent`, { bookingId: bid, propertyId: pid, type })
      .subscribe({ error: () => {} });
  }

  hasSent(bookingId: string | number, propertyId: string | number, type: 'arrival' | 'departure'): boolean {
    return this.sentMap.get(`${String(propertyId)}:${type}`) === String(bookingId);
  }
}
