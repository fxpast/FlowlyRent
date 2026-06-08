import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-redirect',
  standalone: true,
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555">
      <div style="font-size:32px;margin-bottom:16px">⏳</div>
      <p style="font-size:16px">Redirection vers la page de paiement…</p>
    </div>
  `
})
export class PaymentRedirectComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token   = this.route.snapshot.paramMap.get('token') ?? '';
    const capture = this.route.snapshot.url[0]?.path === 'paiement' ? 1 : 0;
    try {
      const decoded  = atob(token);
      const colonIdx = decoded.lastIndexOf(':');
      if (colonIdx < 0) return;
      const bookingId = decoded.substring(0, colonIdx);
      const amount    = decoded.substring(colonIdx + 1);
      window.location.href =
        `https://beds24.com/bookpay.php?bookid=${encodeURIComponent(bookingId)}&g=st&capture=${capture}&pay=${encodeURIComponent(amount)}`;
    } catch {
      // token invalide — on reste sur la page
    }
  }
}
