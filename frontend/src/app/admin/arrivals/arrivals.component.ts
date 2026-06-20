import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookingService } from '../../core/services/booking.service';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { MessageReminderService } from '../../core/services/message-reminder.service';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-arrivals',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatCardModule, MatTableModule, MatChipsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, TranslateModule],
  template: `
    <h1>{{ 'arrivals.title' | translate }}</h1>

    <div class="week-nav">
      <button mat-icon-button (click)="prevWeek()"><mat-icon>chevron_left</mat-icon></button>
      <span class="week-label">{{ weekLabel() }}</span>
      <button mat-icon-button (click)="nextWeek()"><mat-icon>chevron_right</mat-icon></button>
      <button mat-button (click)="goToCurrentWeek()">{{ 'common.today' | translate }}</button>
    </div>

    <!-- Cartes mobile -->
    <div class="mobile-list">
      @for (b of arrivals(); track b['id']) {
        <mat-card class="mobile-card clickable-card" (click)="openDetail(b)">
          <div class="mc-top">
            <div>
              <strong>{{ guestName(b) }}</strong>
              @if (b['guestPhone'] || b['phone']) {
                <div class="mc-phone">{{ b['guestPhone'] || b['phone'] }}</div>
              }
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              @if (!isPast(b['arrival']) && !reminder.hasSent(b['id'])) {
                <mat-icon class="msg-reminder" [matTooltip]="'arrivals.checkin_message_unsent' | translate">mark_email_unread</mat-icon>
              }
              <mat-chip [class]="'status-' + b['status']">{{ 'status.' + b['status'] | translate }}</mat-chip>
            </div>
          </div>
          <div class="mc-meta">
            <span><mat-icon>home</mat-icon>{{ propLabel(b) }}</span>
            <span><mat-icon>login</mat-icon>{{ dayName(b['arrival']) }} {{ b['arrival'] | date:'dd/MM' }}</span>
            <span><mat-icon>logout</mat-icon>{{ dayName(b['departure']) }} {{ b['departure'] | date:'dd/MM' }}</span>
            <span><mat-icon>nights_stay</mat-icon>{{ nights(b) }} {{ 'common.nights' | translate }}</span>
            <span><mat-icon>group</mat-icon>{{ (b['numAdult'] || 0) + (b['numChild'] || 0) }} pers.</span>
            <span><mat-icon>sell</mat-icon>{{ b['channel'] || ('bookings.channel_direct' | translate) }}</span>
          </div>
        </mat-card>
      }
      @if (arrivals().length === 0) {
        <p class="empty">{{ 'arrivals.no_arrivals' | translate }}</p>
      }
    </div>

    <!-- Tableau desktop -->
    <mat-card class="desktop-card">
      <mat-card-content>
        <table mat-table [dataSource]="arrivals()" class="full-width">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>{{ 'arrivals.checkin_date' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ dayName(b['arrival']) }} {{ b['arrival'] | date:'dd/MM' }}</td>
          </ng-container>
          <ng-container matColumnDef="guest">
            <th mat-header-cell *matHeaderCellDef>{{ 'bookings.guest' | translate }}</th>
            <td mat-cell *matCellDef="let b">
              {{ guestName(b) }}<br>
              <small>{{ b['guestPhone'] || b['phone'] }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="property">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.property' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ propLabel(b) }}</td>
          </ng-container>
          <ng-container matColumnDef="checkout">
            <th mat-header-cell *matHeaderCellDef>{{ 'arrivals.checkout_date' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ dayName(b['departure']) }} {{ b['departure'] | date:'dd/MM' }}</td>
          </ng-container>
          <ng-container matColumnDef="nights">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.nights' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ nights(b) }}</td>
          </ng-container>
          <ng-container matColumnDef="guests">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.guests' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ (b['numAdult'] || 0) + (b['numChild'] || 0) }}</td>
          </ng-container>
          <ng-container matColumnDef="channel">
            <th mat-header-cell *matHeaderCellDef>{{ 'bookings.source' | translate }}</th>
            <td mat-cell *matCellDef="let b"><mat-chip>{{ b['channel'] || ('bookings.channel_direct' | translate) }}</mat-chip></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let b">
              <mat-chip [class]="'status-' + b['status']">{{ 'status.' + b['status'] | translate }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let b" class="actions-cell" (click)="$event.stopPropagation()">
              @if (!isPast(b['arrival']) && !reminder.hasSent(b['id'])) {
                <mat-icon class="msg-reminder" [matTooltip]="'arrivals.checkin_message_unsent' | translate">mark_email_unread</mat-icon>
              }
              @if (b['status'] !== 'cancelled') {
                <button mat-icon-button color="warn" (click)="cancelBooking(b)" [matTooltip]="'common.cancel' | translate">
                  <mat-icon>cancel</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" class="clickable-row" (click)="openDetail(row)"></tr>
        </table>
        @if (arrivals().length === 0) {
          <p class="empty">{{ 'arrivals.no_arrivals' | translate }}</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }
    .week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .week-label { font-size: 16px; font-weight: 500; min-width: 160px; text-align: center; }
    .full-width { width: 100%; }
    .empty { text-align: center; padding: 24px; color: #999; }
    .status-confirmed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background: #fff3e0 !important; color: #e65100 !important; }
    td { padding: 8px 16px; }
    small { color: #666; }
    .actions-cell { white-space: nowrap; padding: 4px 8px !important; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f5f5f5; }

    /* Mobile */
    .mobile-list { display: none; flex-direction: column; gap: 10px; }
    .mobile-card { padding: 14px 16px; }
    .mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .mc-phone { font-size: 12px; color: #666; margin-top: 2px; }
    .mc-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; }
    .mc-meta span { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; }
    .mc-meta mat-icon { font-size: 15px; width: 15px; height: 15px; color: #0288d1; }
    .clickable-card { cursor: pointer; transition: box-shadow 0.15s; }
    .clickable-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.15); }
    .msg-reminder { font-size: 18px; width: 18px; height: 18px; color: #f57c00; flex-shrink: 0; cursor: help; }

    @media (max-width: 768px) {
      .mobile-list { display: flex; }
      .desktop-card { display: none; }
      h1 { font-size: 20px; margin-bottom: 12px; }
      .week-label { min-width: 120px; font-size: 14px; }
    }
  `]
})
export class ArrivalsComponent implements OnInit {
  arrivals = signal<any[]>([]);
  weekStart = signal(new Date(new Date().toDateString()));
  columns = ['date', 'guest', 'property', 'checkout', 'nights', 'guests', 'channel', 'status', 'actions'];

  constructor(private bookingService: BookingService, private snackBar: MatSnackBar, private dialog: MatDialog, private router: Router, readonly reminder: MessageReminderService, private t: TranslateService) {}

  ngOnInit(): void { this.load(); this.reminder.load().subscribe({ error: () => {} }); }

  load(): void {
    const ws = localDateStr(this.weekStart());
    this.bookingService.getArrivals(ws).subscribe({
      next: data => {
        this.arrivals.set((data ?? []).sort((a, b) => (a['arrival'] ?? '').localeCompare(b['arrival'] ?? '')));
        this.bookingService.getPropertyNames().subscribe(names => {
          this.arrivals.update(list => list.map(b => {
            const pid = String(b['propId'] ?? b['propertyId'] ?? '');
            if (pid && names[pid]) return { ...b, propName: names[pid] };
            return b;
          }));
        });
      },
      error: () => {}
    });
  }

  isPast(date: string): boolean { return (date ?? '').substring(0, 10) < localDateStr(); }

  guestName(b: any): string {
    const first = b['guestFirstName'] || b['firstName'] || '';
    const last  = b['guestLastName']  || b['lastName']  || '';
    return (first + ' ' + last).trim() || '—';
  }

  propLabel(b: any): string {
    return b['propName'] || b['propertyName'] || (b['propId'] ? '#' + b['propId'] : '—');
  }

  nights(b: any): number {
    if (!b['arrival'] || !b['departure']) return 0;
    const a = new Date(b['arrival']), d = new Date(b['departure']);
    return Math.round((d.getTime() - a.getTime()) / 86400000);
  }

  prevWeek(): void {
    const d = new Date(this.weekStart()); d.setDate(d.getDate() - 7);
    this.weekStart.set(d); this.load();
  }
  nextWeek(): void {
    const d = new Date(this.weekStart()); d.setDate(d.getDate() + 7);
    this.weekStart.set(d); this.load();
  }
  goToCurrentWeek(): void { this.weekStart.set(new Date(new Date().toDateString())); this.load(); }

  weekLabel(): string {
    const lang = this.t.currentLang || 'fr';
    const start = this.weekStart();
    const today = new Date(new Date().toDateString());
    const end   = new Date(start); end.setDate(end.getDate() + 6);
    const startStr = start.getTime() === today.getTime()
      ? this.t.instant('common.today')
      : start.toLocaleDateString(lang, { day: '2-digit', month: 'short' });
    return `${startStr} — ${end.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  openDetail(b: any): void {
    const ref = this.dialog.open(BookingDetailDialogComponent, { data: { ...b, templateContext: 'checkin' }, width: '600px' });
    ref.afterClosed().subscribe(result => {
      if (result?.cancelled || result?.updated) this.load();
      if (result?.editDirect) this.router.navigate(['/admin/bookings'], { state: { editDirectBooking: b } });
    });
  }

  editBooking(b: any): void {
    this.router.navigate(['/admin/bookings', b['id'], 'edit'], { state: { booking: b } });
  }

  cancelBooking(b: any): void {
    const name = this.guestName(b);
    if (!confirm(`${this.t.instant('arrivals.cancel_confirm')} ${name} ?`)) return;
    this.bookingService.cancel(String(b['id'])).subscribe({
      next: () => { this.snackBar.open(this.t.instant('bookings.cancelled_ok'), this.t.instant('common.ok'), { duration: 3000 }); this.load(); },
      error: err => this.snackBar.open(err.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 4000 })
    });
  }

  dayName(dateStr: string): string {
    if (!dateStr) return '';
    const lang  = this.t.currentLang || 'fr';
    const d     = new Date(dateStr.substring(0, 10) + 'T12:00:00');
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return this.t.instant('common.today');
    if (diff === 1) return this.t.instant('common.tomorrow');
    return d.toLocaleDateString(lang, { weekday: 'short' });
  }
}
