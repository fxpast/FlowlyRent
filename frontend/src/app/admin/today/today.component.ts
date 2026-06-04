import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { BookingService } from '../../core/services/booking.service';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { MessageReminderService } from '../../core/services/message-reminder.service';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressSpinnerModule, MatDividerModule, MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <h2>
        <mat-icon>today</mat-icon>
        Aujourd'hui — {{ todayLabel }}
      </h2>
      <button mat-icon-button (click)="load()" title="Rafraîchir">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else {
      <div class="grid-3">

        <!-- Départs -->
        <mat-card class="section-card depart-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="section-icon depart-icon">flight_takeoff</mat-icon>
            <mat-card-title>Départs du jour</mat-card-title>
            <mat-card-subtitle>{{ departures().length }} départ{{ departures().length !== 1 ? 's' : '' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (departures().length === 0) {
              <p class="empty">Aucun départ aujourd'hui</p>
            } @else {
              @for (b of departures(); track b.id) {
                <div class="booking-row" (click)="openBooking(b)">
                  <div class="row-main">
                    <span class="guest">{{ guestName(b) }}</span>
                    <span style="display:flex;align-items:center;gap:4px">
                      @if (!reminder.hasSentToday(b.id)) {
                        <mat-icon class="msg-reminder" matTooltip="Message check-out non envoyé">mark_email_unread</mat-icon>
                      }
                      <span class="nights">{{ nights(b) }}n</span>
                    </span>
                  </div>
                  <div class="row-sub">
                    <span class="prop">{{ propName(b) }}</span>
                    <span class="price">{{ b.price | number:'1.0-0' }} €</span>
                  </div>
                  <div class="row-dates">
                    <mat-icon class="tiny-icon">event_available</mat-icon> {{ b.arrival | slice:0:10 }}
                    <mat-icon class="tiny-icon" style="margin-left:8px">flight_takeoff</mat-icon> {{ b.departure | slice:0:10 }}
                  </div>
                </div>
                <mat-divider/>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- Arrivées -->
        <mat-card class="section-card arrival-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="section-icon arrival-icon">event_available</mat-icon>
            <mat-card-title>Arrivées du jour</mat-card-title>
            <mat-card-subtitle>{{ arrivals().length }} arrivée{{ arrivals().length !== 1 ? 's' : '' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (arrivals().length === 0) {
              <p class="empty">Aucune arrivée aujourd'hui</p>
            } @else {
              @for (b of arrivals(); track b.id) {
                <div class="booking-row" (click)="openBooking(b)">
                  <div class="row-main">
                    <span class="guest">{{ guestName(b) }}</span>
                    <span style="display:flex;align-items:center;gap:4px">
                      @if (!reminder.hasSentToday(b.id)) {
                        <mat-icon class="msg-reminder" matTooltip="Message check-in non envoyé">mark_email_unread</mat-icon>
                      }
                      <span class="nights">{{ nights(b) }}n</span>
                    </span>
                  </div>
                  <div class="row-sub">
                    <span class="prop">{{ propName(b) }}</span>
                    <span class="price">{{ b.price | number:'1.0-0' }} €</span>
                  </div>
                  <div class="row-dates">
                    <mat-icon class="tiny-icon">event_available</mat-icon> {{ b.arrival | slice:0:10 }}
                    <mat-icon class="tiny-icon" style="margin-left:8px">flight_takeoff</mat-icon> {{ b.departure | slice:0:10 }}
                  </div>
                </div>
                <mat-divider/>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- En cours -->
        <mat-card class="section-card ongoing-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="section-icon ongoing-icon">hotel</mat-icon>
            <mat-card-title>Réservations en cours</mat-card-title>
            <mat-card-subtitle>{{ ongoing().length }} séjour{{ ongoing().length !== 1 ? 's' : '' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (ongoing().length === 0) {
              <p class="empty">Aucun séjour en cours</p>
            } @else {
              @for (b of ongoing(); track b.id) {
                <div class="booking-row" (click)="openBooking(b)">
                  <div class="row-main">
                    <span class="guest">{{ guestName(b) }}</span>
                    <span class="nights">{{ nights(b) }}n</span>
                  </div>
                  <div class="row-sub">
                    <span class="prop">{{ propName(b) }}</span>
                    <span class="price">{{ b.price | number:'1.0-0' }} €</span>
                  </div>
                  <div class="row-dates">
                    <mat-icon class="tiny-icon">event_available</mat-icon> {{ b.arrival | slice:0:10 }}
                    <mat-icon class="tiny-icon" style="margin-left:8px">flight_takeoff</mat-icon> {{ b.departure | slice:0:10 }}
                  </div>
                </div>
                <mat-divider/>
              }
            }
          </mat-card-content>
        </mat-card>

      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-header h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 22px; font-weight: 500; }
    .center { display: flex; justify-content: center; padding: 60px; }

    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 1100px) { .grid-3 { grid-template-columns: 1fr; } }

    .section-card { border-radius: 12px !important; }
    .section-icon { font-size: 28px; width: 28px; height: 28px; border-radius: 8px; padding: 6px; }
    .depart-icon  { background: #fff3e0; color: #e65100; }
    .arrival-icon { background: #e8f5e9; color: #2e7d32; }
    .ongoing-icon { background: #e3f2fd; color: #1565c0; }

    .depart-card  mat-card-header { border-bottom: 3px solid #e65100; padding-bottom: 8px; margin-bottom: 8px; }
    .arrival-card mat-card-header { border-bottom: 3px solid #2e7d32; padding-bottom: 8px; margin-bottom: 8px; }
    .ongoing-card mat-card-header { border-bottom: 3px solid #1565c0; padding-bottom: 8px; margin-bottom: 8px; }

    .booking-row {
      padding: 10px 4px; cursor: pointer;
      transition: background 0.15s;
    }
    .booking-row:hover { background: #f5f5f5; border-radius: 6px; }

    .row-main { display: flex; justify-content: space-between; align-items: baseline; }
    .guest  { font-weight: 600; font-size: 14px; }
    .nights { font-size: 12px; color: #888; }
    .msg-reminder { font-size: 16px; width: 16px; height: 16px; color: #f57c00; cursor: help; }

    .row-sub { display: flex; justify-content: space-between; margin-top: 2px; }
    .prop  { font-size: 12px; color: #555; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .price { font-size: 13px; font-weight: 500; color: #2e7d32; }

    .row-dates { display: flex; align-items: center; font-size: 11px; color: #999; margin-top: 3px; }
    .tiny-icon { font-size: 12px; width: 12px; height: 12px; vertical-align: middle; margin-right: 2px; }

    .empty { text-align: center; color: #aaa; font-style: italic; padding: 20px 0; margin: 0; }
  `]
})
export class TodayComponent implements OnInit {
  today = localDateStr();
  todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  loading    = signal(false);
  arrivals   = signal<any[]>([]);
  departures = signal<any[]>([]);
  ongoing    = signal<any[]>([]);

  private propNames: Record<string, string> = {};

  constructor(private bookingService: BookingService, private dialog: MatDialog, readonly reminder: MessageReminderService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin([
      this.bookingService.getToday(),
      this.bookingService.getPropertyNames()
    ]).subscribe({
      next: ([today, names]) => {
        this.departures.set(this.enrich(today.departures, names));
        this.arrivals.set(  this.enrich(today.arrivals,   names));
        this.ongoing.set(   this.enrich(today.ongoing,    names));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private enrich(list: any[], names: Record<string, string>): any[] {
    return (list ?? []).map(b => {
      const pid = String(b['propId'] ?? b['propertyId'] ?? '');
      return pid && names[pid] ? { ...b, propName: names[pid] } : b;
    });
  }

  openBooking(b: any): void {
    const ref = this.dialog.open(BookingDetailDialogComponent, {
      data: { ...b, propName: this.propName(b) },
      width: '600px'
    });
    ref.afterClosed().subscribe(result => { if (result?.cancelled || result?.updated) this.load(); });
  }

  guestName(b: any): string {
    const first = b.guestFirstName || b.firstName || '';
    const last  = b.guestLastName  || b.lastName  || '';
    return (first + ' ' + last).trim() || b.guestName || 'Voyageur';
  }

  propName(b: any): string {
    if (b.propName || b.propertyName) return b.propName || b.propertyName;
    const id = String(b.propertyId ?? b.propId ?? '');
    return this.propNames[id] || id || '—';
  }

  nights(b: any): number {
    const d1 = new Date((b.arrival   ?? '').substring(0, 10));
    const d2 = new Date((b.departure ?? '').substring(0, 10));
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }
}
