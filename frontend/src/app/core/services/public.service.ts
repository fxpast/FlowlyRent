import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Booking, BookingRequest, Property } from '../models/booking.model';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class PublicService {
  private base = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

  getProperties(): Observable<Property[]> {
    return this.http.get<Property[]>(`${this.base}/properties`);
  }

  getProperty(id: number): Observable<Property> {
    return this.http.get<Property>(`${this.base}/properties/${id}`);
  }

  checkAvailability(propertyId: number, checkIn: string, checkOut: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${this.base}/properties/${propertyId}/availability`,
      { params: { checkIn, checkOut } }
    );
  }

  createBooking(req: BookingRequest): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/bookings`, req);
  }

  sendGuestMessage(bookingId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.base}/messages/${bookingId}`, { content });
  }

  checkout(bookingId: number, successUrl: string, cancelUrl: string): Observable<{ sessionId: string; url: string }> {
    return this.http.post<{ sessionId: string; url: string }>(
      `${this.base}/payments/${bookingId}/checkout`,
      { successUrl, cancelUrl }
    );
  }
}
