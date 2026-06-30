import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookingSiteService } from '../booking-site.service';

@Component({
  selector: 'app-booking-site-home',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule, MatButtonModule, TranslateModule],
  template: `
    <div class="site">
      <!-- Header -->
      <header class="site-header">
        <div class="lang-bar">
          @for (l of langs; track l) {
            <button class="lang-btn" [class.active]="currentLang === l" (click)="switchLang(l)">{{ l.toUpperCase() }}</button>
          }
        </div>
        @if (siteInfo()?.companyLogoUrl) {
          <img class="logo" [src]="siteInfo().companyLogoUrl" [alt]="siteInfo().companyName">
        }
        <h1>{{ siteInfo()?.companyName || (siteInfo()?.firstName + ' ' + siteInfo()?.lastName) }}</h1>
        <p class="subtitle">{{ 'bs.subtitle' | translate }}</p>

        <!-- Barre de recherche -->
        <div class="search-bar">
          <div class="search-field">
            <label>{{ 'bs.search_checkin' | translate }}</label>
            <input type="date" [(ngModel)]="searchFrom" [min]="todayStr" (change)="onFromChange()">
          </div>
          <div class="search-sep"></div>
          <div class="search-field">
            <label>{{ 'bs.search_checkout' | translate }}</label>
            <input type="date" [(ngModel)]="searchTo" [min]="searchFrom || todayStr">
          </div>
          <div class="search-sep"></div>
          <div class="search-field">
            <label>{{ 'bs.search_guests' | translate }}</label>
            <select [(ngModel)]="searchGuests">
              @for (n of guestNums; track n) {
                <option [value]="n">{{ n }} {{ (n > 1 ? 'bs.travelers' : 'bs.traveler') | translate }}</option>
              }
            </select>
          </div>
          <button class="search-btn" (click)="search()" [disabled]="searching()">
            @if (searching()) { <span class="spin"></span> }
            @else { <span class="material-icons">search</span> }
            {{ 'bs.search' | translate }}
          </button>
        </div>
      </header>

      <!-- Contenu -->
      <main class="main">
        @if (loading()) {
          <div class="center"><mat-spinner></mat-spinner></div>
        } @else if (error()) {
          <div class="error-box">{{ error() }}</div>
        } @else {
          @if (searched()) {
            <div class="search-result-bar">
              <span class="material-icons">event_available</span>
              <span>{{ filteredProperties().length }} {{ 'bs.properties_available' | translate }}</span>
              <button class="clear-search" (click)="clearSearch()">{{ 'bs.clear_search' | translate }}</button>
            </div>
          }
          @if (displayedProperties().length === 0) {
            <div class="empty">
              @if (searched()) { {{ 'bs.no_available' | translate }} }
              @else { {{ 'bs.no_properties' | translate }} }
            </div>
          } @else {
            <h2 class="section-title">{{ searched() ? ('bs.available_properties' | translate) : ('bs.our_properties' | translate) }}</h2>
            <div class="grid">
              @for (prop of displayedProperties(); track propId(prop)) {
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
                    @if (prop.maxPeople || prop.maxGuestNumber || prop.maxGuests) {
                      <p class="guests">
                        <span class="material-icons">people</span>
                        {{ prop.maxPeople || prop.maxGuestNumber || prop.maxGuests }} {{ 'bs.guests_max' | translate }}
                      </p>
                    }
                  </div>
                  <div class="card-footer">
                    <button mat-flat-button color="primary" (click)="goToProperty(prop); $event.stopPropagation()">
                      {{ 'bs.see_property' | translate }}
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        }
      </main>

      <footer class="site-footer">
        <span>{{ 'bs.powered_by' | translate }}</span>
        <strong>FlowlyRent</strong>
      </footer>
    </div>
  `,
  styles: [`
    .site { min-height: 100vh; display: flex; flex-direction: column; background: #f5f7fa; font-family: Roboto, sans-serif; }

    .site-header {
      background: linear-gradient(135deg, #0288d1 0%, #01579b 100%);
      color: white; text-align: center; padding: 40px 24px 32px;
    }
    .lang-bar { display: flex; justify-content: flex-end; gap: 4px; margin-bottom: 16px; }
    .lang-btn {
      background: rgba(255,255,255,.15); color: white; border: 1px solid rgba(255,255,255,.3);
      border-radius: 4px; padding: 3px 8px; font-size: .75rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .lang-btn:hover { background: rgba(255,255,255,.25); }
    .lang-btn.active { background: white; color: #0288d1; border-color: white; }

    .logo { height: 64px; border-radius: 8px; margin-bottom: 16px; }
    .site-header h1 { margin: 0 0 8px; font-size: 2rem; font-weight: 700; }
    .subtitle { margin: 0 0 28px; opacity: .85; font-size: 1.05rem; }

    /* Barre de recherche */
    .search-bar {
      display: flex; align-items: flex-end; gap: 0;
      background: white; border-radius: 12px; padding: 16px 20px;
      max-width: 780px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,.2);
      flex-wrap: wrap; gap: 0;
    }
    .search-field {
      display: flex; flex-direction: column; flex: 1; min-width: 140px; padding: 0 12px;
    }
    .search-field label {
      font-size: .72rem; font-weight: 600; color: #888; text-transform: uppercase;
      letter-spacing: .04em; margin-bottom: 4px;
    }
    .search-field input, .search-field select {
      border: none; outline: none; font-size: .95rem; color: #1a1a2e;
      background: transparent; padding: 4px 0; width: 100%; cursor: pointer;
      font-family: Roboto, sans-serif;
    }
    .search-sep {
      width: 1px; background: #e0e0e0; margin: 4px 0; min-height: 40px;
    }
    .search-btn {
      display: flex; align-items: center; gap: 6px;
      background: #0288d1; color: white; border: none; border-radius: 8px;
      padding: 12px 20px; font-size: .95rem; font-weight: 600; cursor: pointer;
      margin-left: 12px; white-space: nowrap; transition: background .15s;
      height: 48px; align-self: center;
    }
    .search-btn:hover { background: #0277bd; }
    .search-btn:disabled { background: #90caf9; cursor: default; }
    .search-btn .material-icons { font-size: 18px; }
    .spin {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Résultat */
    .search-result-bar {
      display: flex; align-items: center; gap: 8px; background: #e3f2fd;
      border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; color: #01579b;
      font-weight: 500;
    }
    .search-result-bar .material-icons { font-size: 20px; color: #0288d1; }
    .clear-search {
      margin-left: auto; background: none; border: 1px solid #0288d1; color: #0288d1;
      border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: .85rem;
      font-weight: 600;
    }

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

    @media (max-width: 700px) {
      .site-header h1 { font-size: 1.5rem; }
      .grid { grid-template-columns: 1fr; }
      .search-bar { flex-direction: column; gap: 12px; }
      .search-sep { display: none; }
      .search-field { min-width: unset; padding: 0; }
      .search-btn { width: 100%; justify-content: center; margin-left: 0; }
    }
  `]
})
export class BookingSiteHomeComponent implements OnInit {
  slug = '';
  siteInfo = signal<any>(null);
  properties = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  searching = signal(false);
  searched = signal(false);
  availableIds = signal<Set<string>>(new Set());

  searchFrom = '';
  searchTo = '';
  searchGuests = 2;
  todayStr = new Date().toISOString().slice(0, 10);
  guestNums = Array.from({ length: 20 }, (_, i) => i + 1);

  langs = ['fr', 'en', 'es', 'de', 'it'];
  currentLang = 'fr';

  filteredProperties = computed(() =>
    this.searched()
      ? this.properties().filter(p => this.availableIds().has(this.propId(p)))
      : this.properties()
  );

  displayedProperties = computed(() => this.filteredProperties());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.initLang();
    this.slug = this.route.snapshot.params['slug'];
    this.svc.getSiteInfo(this.slug).subscribe({
      next: info => this.siteInfo.set(info),
      error: () => this.error.set(this.translate.instant('bs.error_not_found'))
    });
    this.svc.getProperties(this.slug).subscribe({
      next: props => { this.properties.set(props); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(this.translate.instant('bs.error_load')); }
    });
  }

  onFromChange() {
    if (this.searchTo && this.searchTo <= this.searchFrom) this.searchTo = '';
  }

  search() {
    if (!this.searchFrom || !this.searchTo) return;
    this.searching.set(true);
    this.svc.searchAvailability(this.slug, this.searchFrom, this.searchTo, this.searchGuests).subscribe({
      next: res => {
        this.availableIds.set(new Set(res.availablePropertyIds));
        this.searched.set(true);
        this.searching.set(false);
      },
      error: () => this.searching.set(false)
    });
  }

  clearSearch() {
    this.searched.set(false);
    this.availableIds.set(new Set());
    this.searchFrom = '';
    this.searchTo = '';
    this.searchGuests = 2;
  }

  initLang() {
    const saved = localStorage.getItem('bs_lang');
    const browser = navigator.language.slice(0, 2);
    const lang = this.langs.includes(saved ?? '') ? saved! : this.langs.includes(browser) ? browser : 'fr';
    this.currentLang = lang;
    this.translate.use(lang);
  }

  switchLang(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('bs_lang', lang);
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

  propId(prop: any): string {
    const v = prop.id ?? prop.propId ?? prop.propertyId;
    return v != null ? String(v) : '';
  }

  goToProperty(prop: any) {
    const id = this.propId(prop);
    if (!id) return;
    const extras = this.searchFrom && this.searchTo
      ? { queryParams: { from: this.searchFrom, to: this.searchTo, guests: this.searchGuests } }
      : {};
    this.router.navigate(['/', this.slug, 'property', id], extras);
  }
}
