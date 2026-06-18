import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type ChannelType = 'BEDS24' | 'ICAL' | null;

interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  publicSiteSlug: string;
  role: 'USER' | 'ADMIN' | 'HOUSEKEEPER';
  channelType?: ChannelType;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(!!localStorage.getItem('flr_token'));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(resp => this.storeSession(resp))
    );
  }

  storeSession(resp: LoginResponse): void {
    localStorage.setItem('flr_token', resp.token);
    localStorage.setItem('flr_user', JSON.stringify({
      userId: resp.userId,
      email: resp.email,
      firstName: resp.firstName,
      lastName: resp.lastName,
      plan: resp.plan,
      publicSiteSlug: resp.publicSiteSlug,
      role: resp.role ?? 'USER',
      channelType: resp.channelType ?? null
    }));
    this.isLoggedIn.set(true);
  }

  getChannelType(): ChannelType {
    return this.getCurrentUser()?.channelType ?? null;
  }

  isBeds24(): boolean {
    const ct = this.getChannelType();
    return ct === null || ct === 'BEDS24';
  }

  isIcal(): boolean {
    return this.getChannelType() === 'ICAL';
  }

  logout(): void {
    localStorage.removeItem('flr_token');
    localStorage.removeItem('flr_user');
    this.isLoggedIn.set(false);
    this.router.navigate(['/public/home']);
  }

  getToken(): string | null {
    return localStorage.getItem('flr_token');
  }

  getCurrentUser(): { userId: number; email: string; firstName: string; lastName: string; plan: string; publicSiteSlug: string; role: string; channelType: ChannelType } | null {
    const raw = localStorage.getItem('flr_user');
    return raw ? JSON.parse(raw) : null;
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  isHousekeeper(): boolean {
    return this.getCurrentUser()?.role === 'HOUSEKEEPER';
  }

  tryAutoRefresh(): void {
    const token = this.getToken();
    if (!token) return;
    // Toujours rafraîchir au démarrage pour synchroniser channelType, plan, etc. depuis le serveur
    this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: resp => this.storeSession(resp),
      error: () => {}
    });
  }

  // Rétrocompatibilité : l'intercepteur appellait getCredentials()
  getCredentials(): string | null {
    return this.getToken();
  }
}
