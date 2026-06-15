import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ask(question: string, lang: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${this.base}/admin/chatbot/ask`, { question, lang });
  }
}
