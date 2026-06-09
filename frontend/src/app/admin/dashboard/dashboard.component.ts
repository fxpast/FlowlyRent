import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { BookingService } from '../../core/services/booking.service';
import { MessageService } from '../../core/services/message.service';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule, TranslateModule],
  template: `
    <h1>{{ 'dashboard.title' | translate }}</h1>

    <div class="stats-grid">
      <mat-card class="stat-card primary clickable-card" routerLink="/admin/today">
        <mat-card-content>
          <mat-icon>event_available</mat-icon>
          <div class="stat-value">{{ arrivalsToday().length }}</div>
          <div class="stat-label">{{ 'dashboard.arrivals_today' | translate }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card accent clickable-card" routerLink="/admin/today">
        <mat-card-content>
          <mat-icon>flight_takeoff</mat-icon>
          <div class="stat-value">{{ departuresToday().length }}</div>
          <div class="stat-label">{{ 'dashboard.departures_today' | translate }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card warn clickable-card" routerLink="/admin/messages">
        <mat-card-content>
          <mat-icon>chat</mat-icon>
          <div class="stat-value">{{ unreadMessages() }}</div>
          <div class="stat-label">{{ 'dashboard.unread_messages' | translate }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card success clickable-card" routerLink="/admin/arrivals">
        <mat-card-content>
          <mat-icon>book_online</mat-icon>
          <div class="stat-value">{{ weekArrivals().length }}</div>
          <div class="stat-label">{{ 'dashboard.arrivals_week' | translate }}</div>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="section-row">
      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.arrivals_week' | translate }}</mat-card-title>
          <a mat-button color="primary" routerLink="/admin/arrivals">{{ 'common.see_all' | translate }}</a>
        </mat-card-header>
        <mat-card-content>
          @for (b of weekArrivals(); track b['id']) {
            <div class="booking-row" (click)="openDetail(b)">
              <div>
                <strong>{{ guestName(b) }}</strong>
                <span class="date">{{ b['arrival'] | date:'dd/MM' }}</span>
              </div>
              <div class="prop-name">{{ propLabel(b) }}</div>
              <mat-chip [class]="'status-' + b['status']">{{ 'status.' + b['status'] | translate }}</mat-chip>
            </div>
          }
          @empty {
            <p class="empty">{{ 'dashboard.no_arrivals' | translate }}</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.departures_week' | translate }}</mat-card-title>
          <a mat-button color="primary" routerLink="/admin/departures">{{ 'common.see_all' | translate }}</a>
        </mat-card-header>
        <mat-card-content>
          @for (b of weekDepartures(); track b['id']) {
            <div class="booking-row" (click)="openDetail(b)">
              <div>
                <strong>{{ guestName(b) }}</strong>
                <span class="date">{{ b['departure'] | date:'dd/MM' }}</span>
              </div>
              <div class="prop-name">{{ propLabel(b) }}</div>
              <mat-chip [class]="'status-' + b['status']">{{ 'status.' + b['status'] | translate }}</mat-chip>
            </div>
          }
          @empty {
            <p class="empty">{{ 'dashboard.no_departures' | translate }}</p>
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
    .stat-card.primary { background: #0288d1; color: white; }
    .stat-card.accent { background: #00796b; color: white; }
    .stat-card.warn { background: #e65100; color: white; }
    .stat-card.success { background: #2e7d32; color: white; }
    .clickable-card { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
    .clickable-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important; }
    .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .list-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .booking-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; gap: 8px; cursor: pointer; border-radius: 4px; }
    .booking-row:hover { background: #f5f5f5; padding-left: 6px; }
    .date { margin-left: 8px; color: #666; font-size: 13px; }
    .prop-name { flex: 1; color: #555; font-size: 13px; text-align: center; }
    .empty { color: #999; text-align: center; padding: 16px; }
    .status-confirmed { background-color: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background-color: #fff3e0 !important; color: #e65100 !important; }
    .status-cancelled { background-color: #ffebee !important; color: #c62828 !important; }
    @media (max-width: 768px) {
      h1 { font-size: 20px; margin-bottom: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat-card mat-card-content { padding: 16px; }
      .stat-value { font-size: 28px; }
      .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; }
      .section-row { grid-template-columns: 1fr; }
      .booking-row { flex-wrap: wrap; gap: 4px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  weekArrivals = signal<any[]>([]);
  weekDepartures = signal<any[]>([]);
  arrivalsToday = signal<any[]>([]);
  departuresToday = signal<any[]>([]);
  unreadMessages = signal(0);

  constructor(private bookingService: BookingService, private messageService: MessageService, private dialog: MatDialog) {}

  guestName(b: any): string {
    const first = b['guestFirstName'] || b['firstName'] || '';
    const last  = b['guestLastName']  || b['lastName']  || '';
    return (first + ' ' + last).trim() || '—';
  }

  propLabel(b: any): string {
    return b['propName'] || b['propertyName'] || (b['propId'] ? '#' + b['propId'] : '—');
  }

  openDetail(b: any): void {
    this.dialog.open(BookingDetailDialogComponent, { data: b, width: '600px' });
  }

  ngOnInit(): void {
    const today = localDateStr();
    this.bookingService.getArrivals().subscribe({
      next: data => {
        this.weekArrivals.set(data);
        this.arrivalsToday.set(data.filter(b => b['arrival'] === today));
      },
      error: () => {}
    });
    this.bookingService.getDepartures().subscribe({
      next: data => {
        this.weekDepartures.set(data);
        this.departuresToday.set(data.filter(b => b['departure'] === today));
      },
      error: () => {}
    });
    this.messageService.getUnreadCount().subscribe({ next: r => this.unreadMessages.set(r.count), error: () => {} });
  }
}
