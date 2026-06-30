import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookingSiteService } from '../booking-site.service';

@Component({
  selector: 'app-booking-site-confirmation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule, TranslateModule],
  template: `
    <div class="page">
      <nav class="top-nav">
        <button mat-button (click)="goHome()">
          <span class="material-icons">home</span> {{ 'bs.home' | translate }}
        </button>
        @if (siteInfo()) {
          <span class="brand">{{ siteInfo().companyName || siteInfo().firstName }}</span>
        }
        <div class="spacer"></div>
        <div class="lang-bar">
          @for (l of langs; track l) {
            <button class="lang-btn" [class.active]="currentLang === l" (click)="switchLang(l)">{{ l.toUpperCase() }}</button>
          }
        </div>
      </nav>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (error()) {
        <div class="error-box">{{ error() }}</div>
      } @else {
        <div class="content">
          <div class="success-icon">
            <span class="material-icons">check_circle</span>
          </div>
          <h1>{{ 'bs.booking_confirmed' | translate }}</h1>
          <p class="sub">{{ 'bs.booking_thanks' | translate }}</p>

          <div class="summary-card">
            <h2>{{ 'bs.summary' | translate }}</h2>
            <div class="summary-row">
              <span class="label">{{ 'bs.booking_number' | translate }}</span>
              <span class="value">#{{ bookingId }}</span>
            </div>
            @if (booking()?.firstNight || booking()?.checkIn) {
              <div class="summary-row">
                <span class="label">{{ 'bs.arrival' | translate }}</span>
                <span class="value">{{ formatDate(booking().firstNight ?? booking().checkIn) }}</span>
              </div>
            }
            @if (booking()?.lastNight || booking()?.checkOut) {
              <div class="summary-row">
                <span class="label">{{ 'bs.departure' | translate }}</span>
                <span class="value">{{ formatDate(booking().lastNight ?? booking().checkOut) }}</span>
              </div>
            }
            @if (booking()?.numAdult) {
              <div class="summary-row">
                <span class="label">{{ 'bs.guests' | translate }}</span>
                <span class="value">{{ booking().numAdult }} {{ (booking().numAdult > 1 ? 'bs.adults' : 'bs.adult') | translate }}</span>
              </div>
            }
            @if (totalAmount() > 0) {
              <mat-divider></mat-divider>
              <div class="summary-row total">
                <span class="label">{{ 'bs.total_to_pay' | translate }}</span>
                <span class="value">{{ formatPrice(totalAmount()) }}</span>
              </div>
            }
          </div>

          <!-- Paiement en ligne via Beds24 si montant > 0 -->
          @if (totalAmount() > 0 && !paymentDone()) {
            <div class="payment-section">
              <p class="payment-info">
                <span class="material-icons">lock</span>
                {{ 'bs.secure_payment' | translate }}
              </p>
              <button mat-flat-button color="primary" class="pay-btn" (click)="payOnline()">
                <span class="material-icons">credit_card</span>
                {{ 'bs.pay_online' | translate }} — {{ formatPrice(totalAmount()) }}
              </button>
            </div>
          }

          @if (paymentDone()) {
            <div class="paid-badge">
              <span class="material-icons">verified</span>
              {{ 'bs.payment_done' | translate }}
            </div>
          }

          <button mat-button (click)="goHome()" class="back-btn">
            {{ 'bs.back_to_properties' | translate }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f7fa; font-family: Roboto, sans-serif; }

    .top-nav {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: white; box-shadow: 0 1px 4px rgba(0,0,0,.08); position: sticky; top: 0; z-index: 10;
    }
    .brand { font-weight: 600; color: #0288d1; font-size: 1rem; }
    .spacer { flex: 1; }
    .lang-bar { display: flex; gap: 4px; }
    .lang-btn {
      background: #f5f7fa; color: #555; border: 1px solid #ddd;
      border-radius: 4px; padding: 3px 8px; font-size: .75rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .lang-btn:hover { background: #e3f2fd; color: #0288d1; }
    .lang-btn.active { background: #0288d1; color: white; border-color: #0288d1; }

    .center { display: flex; justify-content: center; padding: 80px; }
    .error-box { background: #fce4ec; color: #c62828; border-radius: 8px; padding: 20px; margin: 16px 0; }

    .content {
      max-width: 560px; margin: 0 auto; padding: 40px 16px; display: flex;
      flex-direction: column; align-items: center; text-align: center;
    }

    .success-icon .material-icons { font-size: 72px; color: #43a047; }
    h1 { font-size: 1.8rem; font-weight: 700; color: #1a1a2e; margin: 16px 0 8px; }
    .sub { color: #555; font-size: 1rem; margin: 0 0 32px; }

    .summary-card {
      width: 100%; background: white; border-radius: 12px; padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 24px; text-align: left;
    }
    .summary-card h2 { font-size: 1.1rem; font-weight: 600; margin: 0 0 16px; color: #1a1a2e; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: .95rem; }
    .summary-row .label { color: #666; }
    .summary-row .value { font-weight: 500; color: #1a1a2e; }
    .summary-row.total .label, .summary-row.total .value { font-weight: 700; font-size: 1.05rem; }

    mat-divider { margin: 8px 0 !important; }

    .payment-section { width: 100%; margin-bottom: 20px; }
    .payment-info { display: flex; align-items: center; gap: 6px; color: #555; font-size: .9rem; margin-bottom: 12px; }
    .payment-info .material-icons { font-size: 18px; color: #43a047; }

    .pay-btn {
      width: 100%; height: 52px; font-size: 1rem; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .pay-btn .material-icons { font-size: 20px; }

    .paid-badge {
      display: flex; align-items: center; gap: 8px; background: #e8f5e9; color: #2e7d32;
      border-radius: 8px; padding: 16px 24px; font-weight: 600; margin-bottom: 20px;
    }
    .paid-badge .material-icons { color: #43a047; }

    .back-btn { color: #0288d1; margin-top: 8px; }

    @media (max-width: 600px) {
      .lang-bar { display: none; }
    }
  `]
})
export class BookingSiteConfirmationComponent implements OnInit {
  slug = '';
  bookingId = '';

  siteInfo = signal<any>(null);
  booking = signal<any>(null);
  loading = signal(true);
  error = signal('');
  paying = signal(false);
  paymentError = signal('');
  paymentDone = signal(false);

  langs = ['fr', 'en', 'es', 'de', 'it'];
  currentLang = 'fr';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService,
    private translate: TranslateService
  ) {}

  get locale(): string {
    const map: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT' };
    return map[this.currentLang] ?? 'fr-FR';
  }

  ngOnInit() {
    this.initLang();
    this.slug = this.route.snapshot.params['slug'];
    this.bookingId = this.route.snapshot.params['bookingId'];

    const paid = this.route.snapshot.queryParamMap.get('paid');
    if (paid === 'true') this.paymentDone.set(true);

    this.svc.getSiteInfo(this.slug).subscribe({ next: v => this.siteInfo.set(v) });
    this.svc.getBooking(this.slug, this.bookingId).subscribe({
      next: b => {
        this.booking.set(b);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.translate.instant('bs.error_reservation'));
      }
    });
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

  totalAmount(): number {
    const b = this.booking();
    if (!b) return 0;
    const raw = b.price;
    // Beds24 retourne price comme nombre ou comme array [{price:x}]
    if (Array.isArray(raw) && raw.length > 0) return Number(raw[0]?.price ?? 0);
    if (raw !== null && raw !== undefined && !Array.isArray(raw)) return Number(raw);
    return Number(b.totalPrice ?? b.total ?? b.amount ?? 0);
  }

  payOnline() {
    // Redirection vers la page de paiement Beds24 (Stripe intégré)
    const price = Math.round(this.totalAmount() * 100) / 100;
    const url = `https://beds24.com/bookpay.php?bookid=${encodeURIComponent(this.bookingId)}&g=st&capture=1&pay=${encodeURIComponent(price)}`;
    window.location.href = url;
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString(this.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency: 'EUR' }).format(amount);
  }

  goHome() {
    this.router.navigate(['/', this.slug]);
  }
}
