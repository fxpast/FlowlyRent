import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class HousekeepingService {
  private base = `${environment.apiUrl}/admin/housekeeping`;

  constructor(private http: HttpClient) {}

  getByBooking(bookingId: string, propertyId?: string, scheduledDate?: string): Observable<any> {
    const params: Record<string, string> = {};
    if (propertyId)    params['propertyId']    = propertyId;
    if (scheduledDate) params['scheduledDate']  = scheduledDate;
    return this.http.get<any>(`${this.base}/by-booking/${bookingId}`, { params });
  }

  createTask(body: Record<string, any>): Observable<any> {
    return this.http.post<any>(this.base, body);
  }

  getPropertyConfigs(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/property-configs`);
  }
}
