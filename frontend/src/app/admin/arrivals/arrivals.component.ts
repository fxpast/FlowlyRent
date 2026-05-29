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
import { BookingService } from '../../core/services/booking.service';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-arrivals',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatCardModule, MatTableModule, MatChipsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <h1>Arrivées</h1>

    <div class="week-nav">
      <button mat-icon-button (click)="prevWeek()"><mat-icon>chevron_left</mat-icon></button>
      <span class="week-label">{{ weekLabel() }}</span>
      <button mat-icon-button (click)="nextWeek()"><mat-icon>chevron_right</mat-icon></button>
      <button mat-button (click)="goToCurrentWeek()">Cette semaine</button>
    </div>

    <!-- Cartes mobile -->
    <div class="mobile-list">
      @for (b of arrivals(); track b['id']) {
        <mat-card class="mobile-card">
          <div class="mc-top">
            <div>
              <strong>{{ guestName(b) }}</strong>
              @if (b['guestPhone'] || b['phone']) {
                <div class="mc-phone">{{ b['guestPhone'] || b['phone'] }}</div>
              }
            </div>
            <mat-chip [class]="'status-' + b['status']">{{ b['status'] }}</mat-chip>
          </div>
          <div class="mc-meta">
            <span><mat-icon>home</mat-icon>{{ propLabel(b) }}</span>
            <span><mat-icon>login</mat-icon>{{ dayName(b['arrival']) }} {{ b['arrival'] | date:'dd/MM' }}</span>
            <span><mat-icon>logout</mat-icon>{{ dayName(b['departure']) }} {{ b['departure'] | date:'dd/MM' }}</span>
            <span><mat-icon>nights_stay</mat-icon>{{ nights(b) }} nuit(s)</span>
            <span><mat-icon>group</mat-icon>{{ (b['numAdult'] || 0) + (b['numChild'] || 0) }} pers.</span>
            <span><mat-icon>sell</mat-icon>{{ b['channel'] || 'Direct' }}</span>
          </div>
          <div class="mc-actions">
            <button mat-stroked-button (click)="openDetail(b)">
              <mat-icon>info</mat-icon> Détail
            </button>
            <button mat-stroked-button (click)="editBooking(b)">
              <mat-icon>edit</mat-icon> Modifier
            </button>
          </div>
        </mat-card>
      }
      @if (arrivals().length === 0) {
        <p class="empty">Aucune arrivée cette semaine</p>
      }
    </div>

    <!-- Tableau desktop -->
    <mat-card class="desktop-card">
      <mat-card-content>
        <table mat-table [dataSource]="arrivals()" class="full-width">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date d'arrivée</th>
            <td mat-cell *matCellDef="let b">{{ dayName(b['arrival']) }} {{ b['arrival'] | date:'dd/MM' }}</td>
          </ng-container>
          <ng-container matColumnDef="guest">
            <th mat-header-cell *matHeaderCellDef>Voyageur</th>
            <td mat-cell *matCellDef="let b">
              {{ guestName(b) }}<br>
              <small>{{ b['guestPhone'] || b['phone'] }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="property">
            <th mat-header-cell *matHeaderCellDef>Logement</th>
            <td mat-cell *matCellDef="let b">{{ propLabel(b) }}</td>
          </ng-container>
          <ng-container matColumnDef="checkout">
            <th mat-header-cell *matHeaderCellDef>Départ prévu</th>
            <td mat-cell *matCellDef="let b">{{ dayName(b['departure']) }} {{ b['departure'] | date:'dd/MM' }}</td>
          </ng-container>
          <ng-container matColumnDef="nights">
            <th mat-header-cell *matHeaderCellDef>Nuits</th>
            <td mat-cell *matCellDef="let b">{{ nights(b) }}</td>
          </ng-container>
          <ng-container matColumnDef="guests">
            <th mat-header-cell *matHeaderCellDef>Voyageurs</th>
            <td mat-cell *matCellDef="let b">{{ (b['numAdult'] || 0) + (b['numChild'] || 0) }}</td>
          </ng-container>
          <ng-container matColumnDef="channel">
            <th mat-header-cell *matHeaderCellDef>Canal</th>
            <td mat-cell *matCellDef="let b"><mat-chip>{{ b['channel'] || 'Direct' }}</mat-chip></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let b">
              <mat-chip [class]="'status-' + b['status']">{{ b['status'] }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let b" class="actions-cell" (click)="$event.stopPropagation()">
              <button mat-icon-button color="primary" (click)="editBooking(b)" matTooltip="Modifier">
                <mat-icon>edit</mat-icon>
              </button>
              @if (b['status'] !== 'cancelled') {
                <button mat-icon-button color="warn" (click)="cancelBooking(b)" matTooltip="Annuler">
                  <mat-icon>cancel</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" class="clickable-row" (click)="openDetail(row)"></tr>
        </table>
        @if (arrivals().length === 0) {
          <p class="empty">Aucune arrivée cette semaine</p>
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
    .mc-actions { display: flex; gap: 8px; margin-top: 12px; }

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
  weekStart = signal(this.getMonday(new Date()));
  columns = ['date', 'guest', 'property', 'checkout', 'nights', 'guests', 'channel', 'status', 'actions'];

  constructor(private bookingService: BookingService, private snackBar: MatSnackBar, private dialog: MatDialog, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const ws = this.weekStart().toISOString().split('T')[0];
    forkJoin([this.bookingService.getArrivals(ws), this.bookingService.getPropertyNames()]).subscribe({
      next: ([data, names]) => {
        this.arrivals.set((data ?? []).map(b => {
          if (!b['propName'] && !b['propertyName']) {
            const pid = String(b['propId'] ?? b['propertyId'] ?? '');
            if (pid && names[pid]) return { ...b, propName: names[pid] };
          }
          return b;
        }));
      },
      error: () => {}
    });
  }

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
  goToCurrentWeek(): void { this.weekStart.set(this.getMonday(new Date())); this.load(); }

  weekLabel(): string {
    const start = this.weekStart();
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  openDetail(b: any): void {
    const ref = this.dialog.open(BookingDetailDialogComponent, { data: b, width: '520px' });
    ref.afterClosed().subscribe(result => { if (result?.cancelled || result?.updated) this.load(); });
  }

  editBooking(b: any): void {
    this.router.navigate(['/admin/bookings', b['id'], 'edit'], { state: { booking: b } });
  }

  cancelBooking(b: any): void {
    const name = this.guestName(b);
    if (!confirm(`Annuler la réservation de ${name} ?`)) return;
    this.bookingService.cancel(String(b['id'])).subscribe({
      next: () => { this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 }); this.load(); },
      error: err => this.snackBar.open(err.error?.error ?? 'Erreur', 'Fermer', { duration: 4000 })
    });
  }

  dayName(dateStr: string): string {
    if (!dateStr) return '';
    const d     = new Date(dateStr.substring(0, 10) + 'T12:00:00');
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
  }

  private getMonday(d: Date): Date {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}
