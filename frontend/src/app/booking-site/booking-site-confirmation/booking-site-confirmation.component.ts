import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { BookingSiteService } from '../booking-site.service';

@Component({
  selector: 'app-booking-site-confirmation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    <div class="page">
      <nav class="top-nav">
        <button mat-button (click)="goHome()">
          <span class="material-icons">home</span> Accueil
        </button>
        @if (siteInfo()) {
          <span class="brand">{{ siteInfo().companyName || siteInfo().firstName }}</span>
        }
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
          <h1>Réservation confirmée !</h1>
          <p class="sub">Merci pour votre réservation. Vous allez recevoir une confirmation par email.</p>

          <div class="summary-card">
            <h2>Récapitulatif</h2>
            <div class="summary-row">
              <span class="label">Numéro de réservation</span>
              <span class="value">#{{ bookingId }}</span>
            </div>
            @if (booking()?.firstNight || booking()?.checkIn) {
              <div class="summary-row">
                <span class="label">Arrivée</span>
                <span class="value">{{ formatDate(booking().firstNight ?? booking().checkIn) }}</span>
              </div>
            }
            @if (booking()?.lastNight || booking()?.checkOut) {
              <div class="summary-row">
                <span class="label">Départ</span>
                <span class="value">{{ formatDate(booking().lastNight ?? booking().checkOut) }}</span>
              </div>
            }
            @if (booking()?.numAdult) {
              <div class="summary-row">
                <span class="label">Voyageurs</span>
                <span class="value">{{ booking().numAdult }} adulte{{ booking().numAdult > 1 ? 's' : '' }}</span>
              </div>
            }
            @if (totalAmount() > 0) {
              <mat-divider></mat-divider>
              <div class="summary-row total">
                <span class="label">Total à payer</span>
                <span class="value">{{ formatPrice(totalAmount()) }}</span>
              </div>
            }
          </div>

          <!-- Paiement en ligne si montant > 0 -->
          @if (totalAmount() > 0 && !paymentDone()) {
            <div class="payment-section">
              <p class="payment-info">
                <span class="material-icons">lock</span>
                Paiement sécurisé par Stripe
              </p>
              @if (paymentError()) {
                <div class="error-box">{{ paymentError() }}</div>
              }
              <button mat-flat-button color="primary" class="pay-btn"
                      (click)="payOnline()" [disabled]="paying()">
                @if (paying()) { <mat-spinner diameter="20"></mat-spinner> }
                @else {
                  <span class="material-icons">credit_card</span>
                  Payer {{ formatPrice(totalAmount()) }} en ligne
                }
              </button>
            </div>
          }

          @if (paymentDone()) {
            <div class="paid-badge">
              <span class="material-icons">verified</span>
              Paiement reçu — merci !
            </div>
          }

          <button mat-button (click)="goHome()" class="back-btn">
            Retour aux logements
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService
  ) {}

  ngOnInit() {
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
        this.error.set('Réservation introuvable');
      }
    });
  }

  totalAmount(): number {
    const b = this.booking();
    if (!b) return 0;
    const price = b.price?.[0]?.price ?? b.totalPrice ?? b.total ?? b.amount ?? 0;
    return Number(price);
  }

  payOnline() {
    this.paying.set(true);
    this.paymentError.set('');
    const origin = window.location.origin;
    const successUrl = `${origin}/${this.slug}/booking/${this.bookingId}?paid=true`;
    const cancelUrl  = `${origin}/${this.slug}/booking/${this.bookingId}`;
    const b = this.booking();
    const email = b?.guestEmail ?? '';
    const desc = `Réservation #${this.bookingId}`;

    this.svc.createCheckout(this.slug, this.bookingId, {
      amountCents: Math.round(this.totalAmount() * 100),
      currency: 'eur',
      description: desc,
      guestEmail: email,
      successUrl,
      cancelUrl
    }).subscribe({
      next: res => {
        this.paying.set(false);
        if (res.sessionUrl) {
          window.location.href = res.sessionUrl;
        }
      },
      error: (err) => {
        this.paying.set(false);
        this.paymentError.set(err?.error?.error ?? 'Erreur lors de la création du paiement');
      }
    });
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  goHome() {
    this.router.navigate(['/', this.slug]);
  }
}
