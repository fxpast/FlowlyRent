import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookingSiteService } from '../booking-site.service';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

@Component({
  selector: 'app-booking-site-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="page">
      <nav class="top-nav">
        <button mat-button (click)="goBack()">
          <span class="material-icons">arrow_back</span>
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

      <div class="content">
        <h1>{{ 'payment.title' | translate }}</h1>

        <!-- Récapitulatif -->
        <div class="summary-card">
          <h2>{{ 'payment.summary' | translate }}</h2>
          @if (state.propertyName) {
            <div class="summary-row">
              <span class="label">{{ 'payment.property' | translate }}</span>
              <span class="value">{{ state.propertyName }}</span>
            </div>
          }
          @if (state.checkIn) {
            <div class="summary-row">
              <span class="label">{{ 'bs.arrival' | translate }}</span>
              <span class="value">{{ formatDate(state.checkIn) }}</span>
            </div>
          }
          @if (state.checkOut) {
            <div class="summary-row">
              <span class="label">{{ 'bs.departure' | translate }}</span>
              <span class="value">{{ formatDate(state.checkOut) }}</span>
            </div>
          }
          @if (state.guestName) {
            <div class="summary-row">
              <span class="label">{{ 'payment.guest' | translate }}</span>
              <span class="value">{{ state.guestName }}</span>
            </div>
          }
          <div class="summary-row total">
            <span class="label">{{ 'bs.total_to_pay' | translate }}</span>
            <span class="value">{{ formatPrice(state.amountCents / 100) }}</span>
          </div>
        </div>

        <!-- Zone Stripe Payment Element -->
        @if (loadingStripe()) {
          <div class="center"><mat-spinner diameter="36"></mat-spinner></div>
        }

        @if (stripeError()) {
          <div class="error-box">{{ stripeError() }}</div>
        }

        <div id="payment-element" [style.display]="loadingStripe() ? 'none' : 'block'"></div>

        @if (paymentError()) {
          <div class="error-box">{{ paymentError() }}</div>
        }

        @if (!loadingStripe() && !stripeError()) {
          <button mat-flat-button color="primary" class="pay-btn"
                  [disabled]="submitting()"
                  (click)="submitPayment()">
            @if (submitting()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <span class="material-icons">lock</span>
              {{ 'payment.pay_now' | translate }} — {{ formatPrice(state.amountCents / 100) }}
            }
          </button>
        }

        <div class="secure-info">
          <span class="material-icons">security</span>
          {{ 'payment.secure_stripe' | translate }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f7fa; font-family: Roboto, sans-serif; }

    .top-nav {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: white; box-shadow: 0 1px 4px rgba(0,0,0,.08);
      position: sticky; top: 0; z-index: 10;
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

    .content {
      max-width: 520px; margin: 0 auto; padding: 32px 16px;
      display: flex; flex-direction: column; gap: 20px;
    }
    h1 { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; margin: 0; text-align: center; }

    .summary-card {
      background: white; border-radius: 12px; padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,.08);
    }
    .summary-card h2 { font-size: 1rem; font-weight: 600; margin: 0 0 16px; color: #555; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: .95rem; }
    .summary-row .label { color: #666; }
    .summary-row .value { font-weight: 500; color: #1a1a2e; }
    .summary-row.total { border-top: 1px solid #eee; margin-top: 8px; padding-top: 12px; }
    .summary-row.total .label, .summary-row.total .value { font-weight: 700; font-size: 1.05rem; color: #0288d1; }

    #payment-element {
      background: white; border-radius: 12px; padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,.08);
    }

    .pay-btn {
      width: 100%; height: 52px; font-size: 1rem;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .pay-btn .material-icons { font-size: 18px; }

    .secure-info {
      display: flex; align-items: center; gap: 6px; justify-content: center;
      color: #888; font-size: .82rem;
    }
    .secure-info .material-icons { font-size: 16px; color: #43a047; }

    .center { display: flex; justify-content: center; padding: 24px; }
    .error-box { background: #fce4ec; color: #c62828; border-radius: 8px; padding: 16px; font-size: .9rem; }

    @media (max-width: 600px) {
      .lang-bar { display: none; }
      #payment-element { padding: 16px; }
    }
  `]
})
export class BookingSitePaymentComponent implements OnInit, OnDestroy {
  slug = '';
  state: any = {};

  siteInfo = signal<any>(null);
  loadingStripe = signal(true);
  stripeError = signal('');
  paymentError = signal('');
  submitting = signal(false);

  langs = ['fr', 'en', 'es', 'de', 'it'];
  currentLang = 'fr';

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

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
    this.state = history.state ?? {};

    if (!this.state.bookingId || !this.state.amountCents) {
      this.router.navigate(['/', this.slug]);
      return;
    }

    this.svc.getSiteInfo(this.slug).subscribe({ next: v => this.siteInfo.set(v) });
    this.initStripe();
  }

  ngOnDestroy() {
    if (this.elements) {
      try { this.elements.getElement('payment')?.destroy(); } catch (_) {}
    }
  }

  private async initStripe() {
    try {
      const { publishableKey } = await this.svc.getStripePublishableKey().toPromise() as any;

      const { clientSecret } = await this.svc.createPaymentIntent(this.slug, {
        bookingId:   this.state.bookingId,
        amountCents: this.state.amountCents,
        currency:    this.state.currency ?? 'eur',
        description: this.state.description ?? 'Réservation',
        guestEmail:  this.state.guestEmail ?? ''
      }).toPromise() as any;

      this.stripe = await loadStripe(publishableKey);
      if (!this.stripe) throw new Error('Stripe non chargé');

      const locale = this.currentLang as any;
      this.elements = this.stripe.elements({ clientSecret, locale });
      const paymentElement = this.elements.create('payment');
      paymentElement.mount('#payment-element');
      this.loadingStripe.set(false);
    } catch (e: any) {
      this.loadingStripe.set(false);
      this.stripeError.set(e?.error?.error ?? e?.message ?? 'Erreur initialisation paiement');
    }
  }

  async submitPayment() {
    if (!this.stripe || !this.elements) return;
    this.submitting.set(true);
    this.paymentError.set('');

    const returnUrl = `${window.location.origin}/${this.slug}/booking/${this.state.bookingId}?paid=true`;

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: returnUrl }
    });

    // Si on arrive ici c'est qu'il y a une erreur (Stripe redirige sinon)
    this.submitting.set(false);
    if (error) {
      this.paymentError.set(error.message ?? 'Erreur de paiement');
    }
  }

  goBack() {
    history.back();
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

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString(this.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatPrice(amount: number): string {
    const currency = (this.state.currency ?? 'eur').toUpperCase();
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount);
  }
}
