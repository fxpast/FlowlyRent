import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RxStomp } from '@stomp/rx-stomp';
import { environment } from '@env/environment';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private base = `${environment.apiUrl}/admin/messages`;
  private rxStomp = new RxStomp();

  constructor(private http: HttpClient) {
    this.rxStomp.configure({
      brokerURL: environment.wsUrl.replace('http', 'ws'),
      reconnectDelay: 5000
    });
    this.rxStomp.activate();
  }

  getMessages(bookingId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.base}/${bookingId}`);
  }

  sendMessage(bookingId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.base}/${bookingId}`, { content });
  }

  aiAssist(bookingId: number, draft: string): Observable<{ text: string }> {
    return this.http.post<{ text: string }>(`${this.base}/${bookingId}/ai-assist`, { draft });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  watchMessages(bookingId: number): Observable<Message> {
    return this.rxStomp.watch(`/topic/messages/${bookingId}`) as unknown as Observable<Message>;
  }
}
