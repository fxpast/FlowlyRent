import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  publicSiteSlug: string;
  role: 'USER' | 'ADMIN';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(!!localStorage.getItem('flr_token'));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(resp => {
        localStorage.setItem('flr_token', resp.token);
        localStorage.setItem('flr_user', JSON.stringify({
          userId: resp.userId,
          email: resp.email,
          firstName: resp.firstName,
          lastName: resp.lastName,
          plan: resp.plan,
          publicSiteSlug: resp.publicSiteSlug,
          role: resp.role ?? 'USER'
        }));
        this.isLoggedIn.set(true);
      })
    );
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

  getCurrentUser(): { userId: number; email: string; firstName: string; lastName: string; plan: string; publicSiteSlug: string; role: string } | null {
    const raw = localStorage.getItem('flr_user');
    return raw ? JSON.parse(raw) : null;
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  // Rétrocompatibilité : l'intercepteur appellait getCredentials()
  getCredentials(): string | null {
    return this.getToken();
  }
}
