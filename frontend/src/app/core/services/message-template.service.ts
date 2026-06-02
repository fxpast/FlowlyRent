import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface MessageTemplate {
  id?: number;
  name: string;
  type: string;           // CHECKIN | CHECKOUT | CUSTOM
  beds24PropertyId?: string;
  contentFr: string;
  contentEn?: string;
  channel?: string;
  active?: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class MessageTemplateService {
  private base = `${environment.apiUrl}/admin/message-templates`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<MessageTemplate[]> {
    return this.http.get<MessageTemplate[]>(this.base);
  }

  save(t: Partial<MessageTemplate>): Observable<MessageTemplate> {
    if (t.id) return this.http.put<MessageTemplate>(`${this.base}/${t.id}`, t);
    return this.http.post<MessageTemplate>(this.base, t);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * Substitue les variables du template avec les données de la réservation.
   * Si accessCode est fourni (code stocké sur la propriété), il est utilisé pour {{code_acces}}.
   * Sinon un code aléatoire est généré à la volée.
   */
  apply(content: string, booking: any, accessCode?: string, checkinTime?: string, checkoutTime?: string): string {
    const first   = booking['guestFirstName'] || booking['firstName'] || '';
    const last    = booking['guestLastName']  || booking['lastName']  || '';
    const nom     = (first + ' ' + last).trim() || '—';
    const prop    = booking['propName'] || booking['propertyName'] || '';
    const arr     = this.fmtDate(booking['arrival']);
    const dep     = this.fmtDate(booking['departure']);
    const code    = accessCode || this.genCode();
    const checkin  = checkinTime  || '16:00';
    const checkout = checkoutTime || '11:00';
    return content
      .replace(/\{\{nom\}\}/g,           nom)
      .replace(/\{\{arrivee\}\}/g,       arr)
      .replace(/\{\{depart\}\}/g,        dep)
      .replace(/\{\{logement\}\}/g,      prop)
      .replace(/\{\{code_acces\}\}/g,    code)
      .replace(/\{\{heure_checkin\}\}/g, checkin)
      .replace(/\{\{heure_checkout\}\}/g, checkout);
  }

  genCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private fmtDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d.substring(0, 10) + 'T12:00:00');
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
