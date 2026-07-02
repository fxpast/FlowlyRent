import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class BookingSiteService {
  private base = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

  getSiteInfo(slug: string): Observable<any> {
    return this.http.get(`${this.base}/${slug}/info`);
  }

  getProperties(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${slug}/properties`);
  }

  getProperty(slug: string, propId: string): Observable<any> {
    return this.http.get(`${this.base}/${slug}/properties/${propId}`);
  }

  getPropertyPhotos(slug: string, propId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${slug}/properties/${propId}/photos`);
  }

  getOffers(slug: string, propId: string, checkIn: string, checkOut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${slug}/properties/${propId}/offers`, {
      params: { checkIn, checkOut }
    });
  }

  getEstimate(slug: string, propId: string, arrival: string, departure: string, numAdult = 1):
      Observable<{ nights: number, nightsPrice: number, taxeSejour: number, cleaningFee: number }> {
    return this.http.get<any>(`${this.base}/${slug}/properties/${propId}/estimate`, {
      params: { arrival, departure, numAdult: String(numAdult) }
    });
  }

  searchAvailability(slug: string, from: string, to: string, guests: number): Observable<{ availablePropertyIds: string[] }> {
    return this.http.get<{ availablePropertyIds: string[] }>(`${this.base}/${slug}/search`, {
      params: { from, to, guests: String(guests) }
    });
  }

  getBlockedDates(slug: string, propId: string, from: string, to: string): Observable<{ blockedDates: string[], prices: Record<string, number> }> {
    return this.http.get<{ blockedDates: string[], prices: Record<string, number> }>(`${this.base}/${slug}/properties/${propId}/blocked-dates`, {
      params: { from, to }
    });
  }

  createBooking(slug: string, payload: any[]): Observable<any> {
    return this.http.post(`${this.base}/${slug}/bookings`, payload);
  }

  getBooking(slug: string, bookingId: string): Observable<any> {
    return this.http.get(`${this.base}/${slug}/bookings/${bookingId}`);
  }

  createCheckout(slug: string, bookingId: string, data: any): Observable<{ sessionUrl: string }> {
    return this.http.post<{ sessionUrl: string }>(
      `${this.base}/${slug}/bookings/${bookingId}/checkout`, data
    );
  }

  getStripePublishableKey(slug: string): Observable<{ publishableKey: string }> {
    return this.http.get<{ publishableKey: string }>(`${this.base}/${slug}/stripe-key`);
  }

  getPaymentLink(token: string): Observable<any> {
    return this.http.get<any>(`${this.base}/payment-links/${token}`);
  }

  createPaymentIntent(slug: string, data: {
    bookingId: string; amountCents: number; currency: string; description: string; guestEmail: string; captureMethod?: string;
  }): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.base}/${slug}/create-payment-intent`, data);
  }

  sendMessage(slug: string, bookingId: string, content: string): Observable<any> {
    return this.http.post(`${this.base}/${slug}/bookings/${bookingId}/messages`, { content });
  }
}
