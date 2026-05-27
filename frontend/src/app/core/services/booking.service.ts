import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private base = `${environment.apiUrl}/admin/bookings`;
  private propsCache: Record<string, string> | null = null;

  constructor(private http: HttpClient) {}

  getPropertyNames(): Observable<Record<string, string>> {
    if (this.propsCache) return of(this.propsCache);
    return this.http.get<any[]>(`${environment.apiUrl}/admin/properties`).pipe(
      map(props => {
        const m: Record<string, string> = {};
        for (const p of props ?? []) {
          const id = String(p['id'] ?? p['propId'] ?? '');
          if (id) m[id] = p['name'] ?? '';
        }
        return m;
      }),
      tap(m => { this.propsCache = m; })
    );
  }

  getAll(params?: Record<string, string>): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<any[]>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<any> {
    return this.getAll({ id }).pipe(
      map(list => {
        const found = list?.find(b => String(b['id']) === id);
        if (!found && (!list || list.length === 0)) throw new Error('Réservation introuvable');
        return found ?? list[0];
      })
    );
  }

  save(payload: any[]): Observable<any> {
    return this.http.post<any>(this.base, payload);
  }

  delete(ids: string[]): Observable<any> {
    return this.http.delete<any>(this.base, { params: { ids: ids.join(',') } });
  }

  cancel(id: string): Observable<any> {
    return this.http.post<any>(this.base, [{ id: Number(id), status: 'cancelled' }]);
  }

  getArrivals(weekStart?: string): Observable<any[]> {
    let params = new HttpParams();
    if (weekStart) params = params.set('weekStart', weekStart);
    return this.http.get<any[]>(`${this.base}/arrivals`, { params });
  }

  getDepartures(weekStart?: string): Observable<any[]> {
    let params = new HttpParams();
    if (weekStart) params = params.set('weekStart', weekStart);
    return this.http.get<any[]>(`${this.base}/departures`, { params });
  }
}
