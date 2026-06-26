import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AutoResponderConfig {
  enabled: boolean;
  sensitiveKeywords: string | null;
  transitionalMessage: string | null;
  systemPromptExtra: string | null;
  updatedAt?: string;
}

export interface AutoResponderLog {
  id: number;
  bookingId: string | null;
  propertyId: string | null;
  classification: 'SIMPLE' | 'SENSITIVE';
  autoReplied: boolean;
  guestMessageExcerpt: string | null;
  createdAt: string;
}

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AutoResponderService {
  constructor(private http: HttpClient) {}

  getConfig(): Observable<AutoResponderConfig> {
    return this.http.get<AutoResponderConfig>(`${BASE}/admin/auto-responder/config`);
  }

  saveConfig(config: Partial<AutoResponderConfig>): Observable<AutoResponderConfig> {
    return this.http.put<AutoResponderConfig>(`${BASE}/admin/auto-responder/config`, config);
  }

  getLogs(): Observable<AutoResponderLog[]> {
    return this.http.get<AutoResponderLog[]>(`${BASE}/admin/auto-responder/logs`);
  }

  getDefaultKeywords(): Observable<{ keywords: string[] }> {
    return this.http.get<{ keywords: string[] }>(`${BASE}/admin/auto-responder/default-keywords`);
  }

  testMessage(body: { message: string; bookingId?: string; propertyId?: string }): Observable<any> {
    return this.http.post(`${BASE}/admin/auto-responder/test`, body);
  }
}
