import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  init(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      if (!this.auth.isLoggedIn()) return;
      this.track('PAGE_VIEW', (e as NavigationEnd).urlAfterRedirects);
    });
  }

  trackClick(label: string): void {
    if (!this.auth.isLoggedIn()) return;
    this.track('CLICK', label);
  }

  private track(type: 'PAGE_VIEW' | 'CLICK', page: string): void {
    this.http.post(`${environment.apiUrl}/analytics/track`, { type, page })
      .subscribe({ error: () => {} });
  }
}
