import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Payment } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private base = `${environment.apiUrl}/admin/payments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Payment[]> {
    return this.http.get<Payment[]>(this.base);
  }

  createCheckoutSession(bookingId: number, successUrl?: string, cancelUrl?: string): Observable<{ sessionId: string; url: string }> {
    return this.http.post<{ sessionId: string; url: string }>(
      `${this.base}/checkout-session`,
      { bookingId, successUrl, cancelUrl }
    );
  }

  createPaymentIntent(bookingId: number): Observable<{ clientSecret: string; paymentIntentId: string }> {
    return this.http.post<{ clientSecret: string; paymentIntentId: string }>(
      `${this.base}/payment-intent`,
      { bookingId }
    );
  }
}
