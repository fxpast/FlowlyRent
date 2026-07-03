import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ConciergeSiteService {
  private base = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

  getInfo(slug: string, lang = 'fr'): Observable<any> {
    return this.http.get<any>(`${this.base}/${slug}/concierge/info`, { params: { lang } });
  }

  submitLead(slug: string, data: {
    ownerName: string; ownerEmail: string; ownerPhone: string; propertyCity: string; message: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/${slug}/concierge/leads`, data);
  }
}
