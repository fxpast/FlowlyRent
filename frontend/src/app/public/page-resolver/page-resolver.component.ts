import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';

@Component({
  selector: 'app-page-resolver',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="48" /></div>
    } @else if (iframeUrl()) {
      <iframe [src]="safeUrl()" class="booking-frame" allowfullscreen></iframe>
    } @else {
      <div class="center"><span>Page introuvable</span></div>
    }
  `,
  styles: [`
    :host { display: block; }
    .center { display: flex; justify-content: center; align-items: center; height: 100vh; color: #999; font-size: 18px; }
    .booking-frame { display: block; width: 100%; height: 100vh; border: none; }
  `]
})
export class PageResolverComponent implements OnInit {
  loading = signal(true);
  iframeUrl = signal('');

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const userSlug = this.route.snapshot.paramMap.get('userSlug')!;
    const pageSlug = this.route.snapshot.paramMap.get('pageSlug')!;
    this.http.get<{ type: string; iframeUrl: string }>(
      `${environment.apiUrl}/public/p/${userSlug}/${pageSlug}`
    ).subscribe({
      next: r => { this.iframeUrl.set(r.iframeUrl); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl());
  }
}
