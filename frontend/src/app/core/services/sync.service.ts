import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Channel } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private base = `${environment.apiUrl}/sync`;

  constructor(private http: HttpClient) {}

  getChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.base}/channels`);
  }

  createChannel(channel: Channel): Observable<Channel> {
    return this.http.post<Channel>(`${this.base}/channels`, channel);
  }

  updateChannel(id: number, channel: Partial<Channel>): Observable<Channel> {
    return this.http.put<Channel>(`${this.base}/channels/${id}`, channel);
  }

  syncChannel(id: number): Observable<{ status: string; bookingsImported: number; error: string }> {
    return this.http.post<{ status: string; bookingsImported: number; error: string }>(
      `${this.base}/channels/${id}/sync`, {}
    );
  }

  syncAll(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/all`, {});
  }
}
