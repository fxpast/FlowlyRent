import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

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
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const userSlug = this.route.snapshot.paramMap.get('userSlug')!;
    const pageSlug = this.route.snapshot.paramMap.get('pageSlug')!;

    // Essayer d'abord de résoudre comme un slug de logement (/{slug}/{shortNameSlug})
    this.http.get<any[]>(`${environment.apiUrl}/public/${userSlug}/properties`)
      .pipe(catchError(() => of(null)))
      .subscribe(props => {
        if (props) {
          const match = props.find(p => this.slugify(p.shortName || p.name || '') === pageSlug);
          if (match) {
            this.router.navigate(['/', userSlug, 'property', match.id], { replaceUrl: true });
            return;
          }
        }
        // Fallback : iframe Beds24
        this.http.get<{ type: string; iframeUrl: string }>(
          `${environment.apiUrl}/public/p/${userSlug}/${pageSlug}`
        ).subscribe({
          next: r => { this.iframeUrl.set(r.iframeUrl); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
      });
  }

  private slugify(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl());
  }
}
