import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { BookingSiteService } from '../booking-site.service';

@Component({
  selector: 'app-booking-site-home',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="site">
      <!-- Header -->
      <header class="site-header">
        @if (siteInfo()?.companyLogoUrl) {
          <img class="logo" [src]="siteInfo().companyLogoUrl" [alt]="siteInfo().companyName">
        }
        <h1>{{ siteInfo()?.companyName || (siteInfo()?.firstName + ' ' + siteInfo()?.lastName) }}</h1>
        <p class="subtitle">Réservez directement et bénéficiez des meilleurs tarifs</p>
      </header>

      <!-- Contenu -->
      <main class="main">
        @if (loading()) {
          <div class="center"><mat-spinner></mat-spinner></div>
        } @else if (error()) {
          <div class="error-box">{{ error() }}</div>
        } @else if (properties().length === 0) {
          <div class="empty">Aucun logement disponible pour le moment.</div>
        } @else {
          <h2 class="section-title">Nos logements</h2>
          <div class="grid">
            @for (prop of properties(); track prop.id) {
              <article class="card" (click)="goToProperty(prop)" role="button" tabindex="0"
                       (keyup.enter)="goToProperty(prop)">
                <div class="card-photo">
                  @if (getCoverPhoto(prop)) {
                    <img [src]="getCoverPhoto(prop)" [alt]="prop.name" loading="lazy">
                  } @else {
                    <div class="photo-placeholder">
                      <span class="material-icons">home</span>
                    </div>
                  }
                </div>
                <div class="card-body">
                  <h3>{{ prop.name }}</h3>
                  <p class="location">
                    <span class="material-icons">place</span>
                    {{ prop.city || prop.country || '—' }}
                  </p>
                  @if (prop.maxGuestNumber || prop.maxGuests) {
                    <p class="guests">
                      <span class="material-icons">people</span>
                      {{ prop.maxGuestNumber || prop.maxGuests }} voyageurs max
                    </p>
                  }
                </div>
                <div class="card-footer">
                  <button mat-flat-button color="primary" (click)="goToProperty(prop); $event.stopPropagation()">
                    Voir le logement
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </main>

      <footer class="site-footer">
        <span>Propulsé par</span>
        <strong>FlowlyRent</strong>
      </footer>
    </div>
  `,
  styles: [`
    .site { min-height: 100vh; display: flex; flex-direction: column; background: #f5f7fa; font-family: Roboto, sans-serif; }

    .site-header {
      background: linear-gradient(135deg, #0288d1 0%, #01579b 100%);
      color: white; text-align: center; padding: 48px 24px;
    }
    .logo { height: 64px; border-radius: 8px; margin-bottom: 16px; }
    .site-header h1 { margin: 0 0 8px; font-size: 2rem; font-weight: 700; }
    .subtitle { margin: 0; opacity: .85; font-size: 1.05rem; }

    .main { flex: 1; max-width: 1200px; margin: 0 auto; padding: 32px 16px; width: 100%; }
    .section-title { font-size: 1.4rem; font-weight: 600; color: #1a1a2e; margin: 0 0 24px; }

    .center { display: flex; justify-content: center; padding: 80px; }
    .error-box { background: #fce4ec; color: #c62828; border-radius: 8px; padding: 20px; text-align: center; }
    .empty { text-align: center; color: #666; padding: 60px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .card {
      background: white; border-radius: 12px; overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,.08); cursor: pointer;
      transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column;
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.14); }
    .card:focus { outline: 2px solid #0288d1; }

    .card-photo { height: 200px; overflow: hidden; }
    .card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
    .card:hover .card-photo img { transform: scale(1.04); }

    .photo-placeholder {
      width: 100%; height: 100%; background: #e3f2fd;
      display: flex; align-items: center; justify-content: center;
    }
    .photo-placeholder .material-icons { font-size: 56px; color: #90caf9; }

    .card-body { padding: 16px 16px 8px; flex: 1; }
    .card-body h3 { margin: 0 0 8px; font-size: 1.1rem; font-weight: 600; color: #1a1a2e; }
    .location, .guests { display: flex; align-items: center; gap: 4px; color: #555; font-size: .9rem; margin: 4px 0; }
    .location .material-icons, .guests .material-icons { font-size: 16px; color: #0288d1; }

    .card-footer { padding: 12px 16px 16px; }
    .card-footer button { width: 100%; }

    .site-footer { text-align: center; padding: 24px; color: #999; font-size: .85rem; }
    .site-footer strong { color: #0288d1; margin-left: 4px; }

    @media (max-width: 600px) {
      .site-header h1 { font-size: 1.5rem; }
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BookingSiteHomeComponent implements OnInit {
  slug = '';
  siteInfo = signal<any>(null);
  properties = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService
  ) {}

  ngOnInit() {
    this.slug = this.route.snapshot.params['slug'];
    this.svc.getSiteInfo(this.slug).subscribe({
      next: info => this.siteInfo.set(info),
      error: () => this.error.set('Site introuvable')
    });
    this.svc.getProperties(this.slug).subscribe({
      next: props => {
        this.properties.set(props);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de charger les logements');
      }
    });
  }

  getCoverPhoto(prop: any): string {
    if (prop.coverPhotoUrl) return prop.coverPhotoUrl;
    const pics = prop.pictures ?? prop.photos ?? prop.images ?? prop.imagesList ?? [];
    if (pics.length > 0) {
      const first = pics[0];
      return first.url ?? first.src ?? first.fileName ?? first.picture ?? '';
    }
    return prop.mainPhotoUrl ?? prop.thumbnail ?? prop.coverPhoto ?? '';
  }

  goToProperty(prop: any) {
    this.router.navigate(['/', this.slug, 'property', prop.propId ?? prop.id]);
  }
}
