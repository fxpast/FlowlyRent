import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { BookingService } from '../../core/services/booking.service';
import { MessageService } from '../../core/services/message.service';
import { Booking } from '../../core/models/booking.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule],
  template: `
    <h1>Tableau de bord</h1>

    <div class="stats-grid">
      <mat-card class="stat-card primary">
        <mat-card-content>
          <mat-icon>event_available</mat-icon>
          <div class="stat-value">{{ arrivalsToday().length }}</div>
          <div class="stat-label">Arrivées aujourd'hui</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card accent">
        <mat-card-content>
          <mat-icon>flight_takeoff</mat-icon>
          <div class="stat-value">{{ departuresToday().length }}</div>
          <div class="stat-label">Départs aujourd'hui</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card warn">
        <mat-card-content>
          <mat-icon>chat</mat-icon>
          <div class="stat-value">{{ unreadMessages() }}</div>
          <div class="stat-label">Messages non lus</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card success">
        <mat-card-content>
          <mat-icon>book_online</mat-icon>
          <div class="stat-value">{{ weekArrivals().length }}</div>
          <div class="stat-label">Arrivées cette semaine</div>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="section-row">
      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>Arrivées cette semaine</mat-card-title>
          <a mat-button color="primary" routerLink="/admin/arrivals">Voir tout</a>
        </mat-card-header>
        <mat-card-content>
          @for (b of weekArrivals(); track b.id) {
            <div class="booking-row">
              <div>
                <strong>{{ b.guest?.firstName }} {{ b.guest?.lastName }}</strong>
                <span class="date">{{ b.checkIn | date:'dd/MM' }}</span>
              </div>
              <div>{{ b.property?.name }}</div>
              <mat-chip [class]="'status-' + b.status?.toLowerCase()">{{ b.status }}</mat-chip>
            </div>
          }
          @empty {
            <p class="empty">Aucune arrivée cette semaine</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>Départs cette semaine</mat-card-title>
          <a mat-button color="primary" routerLink="/admin/departures">Voir tout</a>
        </mat-card-header>
        <mat-card-content>
          @for (b of weekDepartures(); track b.id) {
            <div class="booking-row">
              <div>
                <strong>{{ b.guest?.firstName }} {{ b.guest?.lastName }}</strong>
                <span class="date">{{ b.checkOut | date:'dd/MM' }}</span>
              </div>
              <div>{{ b.property?.name }}</div>
              <mat-chip [class]="'status-' + b.status?.toLowerCase()">{{ b.status }}</mat-chip>
            </div>
          }
          @empty {
            <p class="empty">Aucun départ cette semaine</p>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 { margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card mat-card-content { display: flex; flex-direction: column; align-items: center; padding: 24px; }
    .stat-card mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; }
    .stat-value { font-size: 40px; font-weight: bold; }
    .stat-label { font-size: 14px; opacity: 0.8; }
    .stat-card.primary { background: #1a237e; color: white; }
    .stat-card.accent { background: #00796b; color: white; }
    .stat-card.warn { background: #e65100; color: white; }
    .stat-card.success { background: #2e7d32; color: white; }
    .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .list-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .booking-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
    .date { margin-left: 8px; color: #666; font-size: 13px; }
    .empty { color: #999; text-align: center; padding: 16px; }
    .status-confirmed { background-color: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background-color: #fff3e0 !important; color: #e65100 !important; }
    .status-cancelled { background-color: #ffebee !important; color: #c62828 !important; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .section-row { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  weekArrivals = signal<Booking[]>([]);
  weekDepartures = signal<Booking[]>([]);
  arrivalsToday = signal<Booking[]>([]);
  departuresToday = signal<Booking[]>([]);
  unreadMessages = signal(0);

  constructor(private bookingService: BookingService, private messageService: MessageService) {}

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.bookingService.getArrivals().subscribe(data => {
      this.weekArrivals.set(data);
      this.arrivalsToday.set(data.filter(b => b.checkIn === today));
    });
    this.bookingService.getDepartures().subscribe(data => {
      this.weekDepartures.set(data);
      this.departuresToday.set(data.filter(b => b.checkOut === today));
    });
    this.messageService.getUnreadCount().subscribe(r => this.unreadMessages.set(r.count));
  }
}
