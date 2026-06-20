import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MessageReminderService {
  private sentIds = new Set<string>();

  constructor(private http: HttpClient) {}

  load(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/admin/bookings/sent-ids`).pipe(
      tap(ids => this.sentIds = new Set(ids))
    );
  }

  markSent(bookingId: string | number): void {
    const id = String(bookingId);
    this.sentIds.add(id);
    this.http.post(`${environment.apiUrl}/admin/bookings/mark-sent`, { bookingId: id })
      .subscribe({ error: () => {} });
  }

  hasSent(bookingId: string | number): boolean {
    return this.sentIds.has(String(bookingId));
  }
}
