import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BookingSiteService } from '../../booking-site/booking-site.service';

/**
 * Résout un lien de paiement court (/pay/:token) créé depuis le dialog réservation —
 * récupère les infos stockées côté serveur (PaymentLink) et navigue vers la page de
 * paiement Stripe Connect de l'hôte avec le state attendu par BookingSitePaymentComponent.
 */
@Component({
  selector: 'app-pay-short-link',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;text-align:center;padding:16px">
      @if (error()) {
        <p style="font-size:16px;color:#c62828">{{ 'public.payment_link_invalid' | translate }}</p>
      } @else {
        <div style="font-size:32px;margin-bottom:16px">⏳</div>
        <p style="font-size:16px">{{ 'public.payment_redirect' | translate }}</p>
      }
    </div>
  `
})
export class PayShortLinkComponent implements OnInit {
  error = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.svc.getPaymentLink(token).subscribe({
      next: link => {
        if (!link?.slug) { this.error.set(true); return; }
        this.router.navigate(['/', link.slug, 'payment'], {
          state: {
            bookingId:     link.bookingId,
            amountCents:   link.amountCents,
            currency:      link.currency,
            description:   link.description,
            guestEmail:    link.guestEmail,
            guestName:     link.guestName,
            propertyName:  link.propertyName,
            checkIn:       link.checkIn,
            checkOut:      link.checkOut,
            captureMethod: link.captureMethod
          }
        });
      },
      error: () => this.error.set(true)
    });
  }
}
