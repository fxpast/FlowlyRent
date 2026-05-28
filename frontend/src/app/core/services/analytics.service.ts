import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  constructor(private http: HttpClient, private router: Router) {}

  init(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.track('PAGE_VIEW', (e as NavigationEnd).urlAfterRedirects);
    });
  }

  trackClick(label: string): void {
    this.track('CLICK', label);
  }

  private track(type: 'PAGE_VIEW' | 'CLICK', page: string): void {
    this.http.post(`${environment.apiUrl}/analytics/track`, { type, page })
      .subscribe({ error: () => {} });
  }
}
