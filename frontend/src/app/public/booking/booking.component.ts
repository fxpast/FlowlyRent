import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PublicService } from '../../core/services/public.service';
import { Booking } from '../../core/models/booking.model';
import { Message } from '../../core/models/message.model';

@Component({
  selector: 'app-public-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatSnackBarModule],
  template: `
    <div class="navbar">
      <a mat-button routerLink="/public/home"><mat-icon>arrow_back</mat-icon> Accueil</a>
      <span class="title">FlowlyRent</span>
    </div>

    @if (paymentSuccess()) {
      <div class="success-banner">
        <mat-icon>check_circle</mat-icon>
        <div>
          <h2>Paiement confirmé !</h2>
          <p>Votre réservation {{ booking()?.confirmationCode }} est confirmée.</p>
        </div>
      </div>
    }

    @if (booking()) {
      <div class="container">
        <mat-card class="booking-summary">
          <mat-card-header>
            <mat-card-title>Récapitulatif de votre réservation</mat-card-title>
            <mat-card-subtitle>{{ booking()!.confirmationCode }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>home</mat-icon>
                <div>
                  <strong>{{ booking()!.property?.name }}</strong>
                  <span>{{ booking()!.property?.city }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>event</mat-icon>
                <div>
                  <strong>Arrivée</strong>
                  <span>{{ booking()!.checkIn | date:'EEEE d MMMM yyyy':'':'fr' }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>event_available</mat-icon>
                <div>
                  <strong>Départ</strong>
                  <span>{{ booking()!.checkOut | date:'EEEE d MMMM yyyy':'':'fr' }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>nights_stay</mat-icon>
                <div>
                  <strong>Durée</strong>
                  <span>{{ booking()!.nightsCount }} nuit(s)</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>people</mat-icon>
                <div>
                  <strong>Voyageurs</strong>
                  <span>{{ booking()!.guestCount }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>euro</mat-icon>
                <div>
                  <strong>Total</strong>
                  <span>{{ booking()!.totalAmount | currency:'EUR':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="messages-card">
          <mat-card-header><mat-card-title>Messages</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="messages">
              @for (m of messages(); track m.id) {
                <div class="message" [class.host-msg]="m.sender === 'HOST'" [class.guest-msg]="m.sender === 'GUEST'">
                  <div class="bubble">
                    <p>{{ m.content }}</p>
                    <small>{{ m.sender === 'HOST' ? 'Hôte' : 'Vous' }} · {{ m.createdAt | date:'dd/MM HH:mm' }}</small>
                  </div>
                </div>
              }
              @if (messages().length === 0) {
                <p class="empty-msg">Pas encore de messages. Posez vos questions à l'hôte !</p>
              }
            </div>
            <div class="send-row">
              <mat-form-field appearance="outline" class="msg-input">
                <mat-label>Votre message</mat-label>
                <textarea matInput [(ngModel)]="newMsg" rows="2"></textarea>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="sendMessage()" [disabled]="!newMsg.trim()">
                <mat-icon>send</mat-icon>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .navbar { display: flex; align-items: center; gap: 16px; padding: 8px 24px; background: #1a237e; color: white; }
    .navbar a { color: white; }
    .title { font-size: 18px; font-weight: bold; }
    .success-banner { background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; gap: 16px; padding: 24px; }
    .success-banner mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .success-banner h2 { margin: 0 0 4px; }
    .success-banner p { margin: 0; }
    .container { max-width: 800px; margin: 32px auto; padding: 0 24px; display: flex; flex-direction: column; gap: 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .info-item { display: flex; align-items: flex-start; gap: 12px; }
    .info-item mat-icon { color: #1a237e; flex-shrink: 0; }
    .info-item strong { display: block; font-size: 12px; color: #666; }
    .info-item span { font-size: 15px; }
    .messages { min-height: 200px; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 8px 0; margin-bottom: 16px; }
    .message { display: flex; }
    .host-msg { justify-content: flex-start; }
    .guest-msg { justify-content: flex-end; }
    .bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; }
    .host-msg .bubble { background: #f5f5f5; border-bottom-left-radius: 4px; }
    .guest-msg .bubble { background: #1a237e; color: white; border-bottom-right-radius: 4px; }
    .bubble p { margin: 0 0 4px; }
    .bubble small { opacity: 0.7; font-size: 11px; }
    .empty-msg { color: #999; text-align: center; padding: 24px; }
    .send-row { display: flex; gap: 8px; align-items: flex-end; }
    .msg-input { flex: 1; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class PublicBookingComponent implements OnInit {
  booking = signal<Booking | null>(null);
  messages = signal<Message[]>([]);
  paymentSuccess = signal(false);
  newMsg = '';

  constructor(
    private route: ActivatedRoute,
    private publicService: PublicService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.paymentSuccess.set(this.route.snapshot.queryParamMap.get('success') === 'true');
    this.publicService.getProperty(0).subscribe(); // warm up
    this.loadBooking(id);
  }

  loadBooking(id: number): void {
    this.publicService.createBooking({ propertyId: 0, guest: { firstName: '', lastName: '', email: '' }, checkIn: '', checkOut: '' });
    // Use direct HTTP for now via public endpoint
    fetch(`/api/public/bookings/${id}`)
      .then(r => r.json())
      .then(data => this.booking.set(data));
  }

  sendMessage(): void {
    const bookingId = this.booking()?.id;
    if (!bookingId || !this.newMsg.trim()) return;
    this.publicService.sendGuestMessage(bookingId, this.newMsg.trim()).subscribe(msg => {
      this.messages.update(list => [...list, msg]);
      this.newMsg = '';
    });
  }
}
