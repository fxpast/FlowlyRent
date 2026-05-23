import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(this.checkStoredCredentials());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<unknown> {
    const credentials = btoa(`${username}:${password}`);
    return this.http.get(`${environment.apiUrl}/admin/bookings`, {
      headers: { Authorization: `Basic ${credentials}` }
    }).pipe(
      tap(() => {
        localStorage.setItem('flr_credentials', credentials);
        this.isLoggedIn.set(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('flr_credentials');
    this.isLoggedIn.set(false);
    this.router.navigate(['/admin/login']);
  }

  getCredentials(): string | null {
    return localStorage.getItem('flr_credentials');
  }

  private checkStoredCredentials(): boolean {
    return !!localStorage.getItem('flr_credentials');
  }
}
