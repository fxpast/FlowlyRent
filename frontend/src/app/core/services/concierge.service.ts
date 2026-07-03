import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ConciergeServiceItem { icon: string; title: string; description: string; }
export interface ConciergeStatItem { number: string; label: string; }
export interface ConciergeStepItem { title: string; description: string; }
export interface ConciergeTestimonialItem { authorName: string; text: string; }

export interface ConciergeConfig {
  enabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  pitch: string;
  pricingText: string;
  contactWhatsapp: string;
  ctaButtonText: string;
  services: ConciergeServiceItem[];
  stats: ConciergeStatItem[];
  steps: ConciergeStepItem[];
  testimonials: ConciergeTestimonialItem[];
}

export interface ConciergeLead {
  id: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyCity: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ConciergeService {
  private base = `${environment.apiUrl}/admin/concierge`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<ConciergeConfig> {
    return this.http.get<ConciergeConfig>(`${this.base}/config`);
  }

  saveConfig(data: Partial<ConciergeConfig>): Observable<ConciergeConfig> {
    return this.http.put<ConciergeConfig>(`${this.base}/config`, data);
  }

  uploadHeroImage(base64Data: string): Observable<ConciergeConfig> {
    return this.http.post<ConciergeConfig>(`${this.base}/hero-image`, { data: base64Data });
  }

  getLeads(): Observable<ConciergeLead[]> {
    return this.http.get<ConciergeLead[]>(`${this.base}/leads`);
  }

  updateLeadStatus(id: number, status: 'NEW' | 'CONTACTED' | 'CLOSED'): Observable<ConciergeLead> {
    return this.http.put<ConciergeLead>(`${this.base}/leads/${id}`, { status });
  }
}
