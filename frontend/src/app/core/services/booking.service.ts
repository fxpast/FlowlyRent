import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs';
import { localDateStr } from '../utils/date.utils';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private base = `${environment.apiUrl}/admin/bookings`;
  private propsCache: Record<string, string> | null = null;

  constructor(private http: HttpClient) {}

  clearPropsCache(): void { this.propsCache = null; }

  /** Retourne les propriétés Beds24 avec le nom court substitué si défini. */
  getPropertiesWithDisplayNames(): Observable<any[]> {
    return forkJoin([
      this.http.get<any[]>(`${environment.apiUrl}/admin/properties`),
      this.getPropertyNames()
    ]).pipe(
      map(([props, names]) => (props ?? []).map(p => {
        const id = String(p['id'] ?? p['propId'] ?? '');
        return names[id] ? { ...p, name: names[id] } : p;
      }))
    );
  }

  /** Applique les noms courts sur une liste de propriétés déjà chargée. */
  applyDisplayNames<T extends Record<string, any>>(items: T[]): Observable<T[]> {
    return this.getPropertyNames().pipe(
      map(names => items.map(p => {
        const id = String(p['id'] ?? p['propId'] ?? '');
        return names[id] ? { ...p, name: names[id] } : p;
      }))
    );
  }

  getPropertyNames(): Observable<Record<string, string>> {
    if (this.propsCache) return of(this.propsCache);
    return forkJoin([
      this.http.get<any[]>(`${environment.apiUrl}/admin/properties`),
      this.http.get<any[]>(`${environment.apiUrl}/admin/property-configs`)
    ]).pipe(
      map(([props, cfgs]) => {
        const shortNames: Record<string, string> = {};
        for (const c of cfgs ?? []) {
          if (c.beds24PropertyId && c.shortName) shortNames[String(c.beds24PropertyId)] = c.shortName;
        }
        const m: Record<string, string> = {};
        for (const p of props ?? []) {
          const id = String(p['id'] ?? p['propId'] ?? '');
          if (id) m[id] = shortNames[id] || p['name'] || '';
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

  getToday(): Observable<{ departures: any[], arrivals: any[], ongoing: any[] }> {
    return this.http.get<any>(`${this.base}/today?date=${localDateStr()}`);
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
