import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingService } from '../../core/services/booking.service';
import { Booking, BookingStatus } from '../../core/models/booking.model';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatInputModule, MatSelectModule, MatCardModule, MatDialogModule, MatSnackBarModule
  ],
  template: `
    <div class="header">
      <h1>Réservations</h1>
      <a mat-raised-button color="primary" routerLink="/admin/bookings/new">
        <mat-icon>add</mat-icon> Nouvelle réservation
      </a>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Rechercher</mat-label>
            <input matInput [(ngModel)]="searchText" (input)="filterBookings()" placeholder="Nom, email, code...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filterStatus" (selectionChange)="filterBookings()">
              <mat-option value="">Tous</mat-option>
              <mat-option value="PENDING">En attente</mat-option>
              <mat-option value="CONFIRMED">Confirmé</mat-option>
              <mat-option value="CANCELLED">Annulé</mat-option>
              <mat-option value="COMPLETED">Terminé</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Source</mat-label>
            <mat-select [(ngModel)]="filterSource" (selectionChange)="filterBookings()">
              <mat-option value="">Toutes</mat-option>
              <mat-option value="DIRECT">Direct</mat-option>
              <mat-option value="BOOKING_COM">Booking.com</mat-option>
              <mat-option value="AIRBNB">Airbnb</mat-option>
              <mat-option value="ABRITEL">Abritel</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <table mat-table [dataSource]="filtered()" class="full-width">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let b">{{ b.confirmationCode }}</td>
          </ng-container>
          <ng-container matColumnDef="guest">
            <th mat-header-cell *matHeaderCellDef>Voyageur</th>
            <td mat-cell *matCellDef="let b">
              {{ b.guest?.firstName }} {{ b.guest?.lastName }}<br>
              <small>{{ b.guest?.email }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="property">
            <th mat-header-cell *matHeaderCellDef>Logement</th>
            <td mat-cell *matCellDef="let b">{{ b.property?.name }}</td>
          </ng-container>
          <ng-container matColumnDef="dates">
            <th mat-header-cell *matHeaderCellDef>Dates</th>
            <td mat-cell *matCellDef="let b">
              {{ b.checkIn | date:'dd/MM/yy' }} → {{ b.checkOut | date:'dd/MM/yy' }}<br>
              <small>{{ b.nightsCount }} nuit(s)</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="source">
            <th mat-header-cell *matHeaderCellDef>Source</th>
            <td mat-cell *matCellDef="let b">
              <mat-chip class="source-chip">{{ sourceLabel(b.source) }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let b">
              <mat-chip [class]="'status-' + b.status?.toLowerCase()">{{ statusLabel(b.status) }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Montant</th>
            <td mat-cell *matCellDef="let b">{{ b.totalAmount | currency:'EUR':'symbol':'1.0-0' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let b">
              <a mat-icon-button [routerLink]="['/admin/bookings', b.id, 'edit']" title="Modifier">
                <mat-icon>edit</mat-icon>
              </a>
              <a mat-icon-button [routerLink]="['/admin/messages']" [queryParams]="{bookingId: b.id}" title="Messages">
                <mat-icon>chat</mat-icon>
              </a>
              <button mat-icon-button color="warn" (click)="cancelBooking(b)" title="Annuler"
                      [disabled]="b.status === 'CANCELLED'">
                <mat-icon>cancel</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .filters { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .filters mat-form-field { min-width: 200px; }
    .full-width { width: 100%; }
    .status-confirmed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background: #fff3e0 !important; color: #e65100 !important; }
    .status-cancelled { background: #ffebee !important; color: #c62828 !important; }
    .status-completed { background: #e3f2fd !important; color: #1565c0 !important; }
    .source-chip { background: #ede7f6 !important; }
    td { padding: 8px 16px; }
    small { color: #666; }
  `]
})
export class BookingsComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  filtered = signal<Booking[]>([]);
  searchText = '';
  filterStatus = '';
  filterSource = '';
  columns = ['code', 'guest', 'property', 'dates', 'source', 'status', 'amount', 'actions'];

  constructor(private bookingService: BookingService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.bookingService.getAll().subscribe(data => {
      this.bookings.set(data);
      this.filterBookings();
    });
  }

  filterBookings(): void {
    let data = this.bookings();
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(b =>
        b.guest?.firstName?.toLowerCase().includes(q) ||
        b.guest?.lastName?.toLowerCase().includes(q) ||
        b.guest?.email?.toLowerCase().includes(q) ||
        b.confirmationCode?.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus) data = data.filter(b => b.status === this.filterStatus);
    if (this.filterSource) data = data.filter(b => b.source === this.filterSource);
    this.filtered.set(data);
  }

  cancelBooking(booking: Booking): void {
    if (!booking.id) return;
    this.bookingService.updateStatus(booking.id, 'CANCELLED').subscribe(() => {
      this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 });
      this.load();
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente', CONFIRMED: 'Confirmé',
      CANCELLED: 'Annulé', COMPLETED: 'Terminé', NO_SHOW: 'No-show'
    };
    return labels[status || ''] || status || '';
  }

  sourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      DIRECT: 'Direct', BOOKING_COM: 'Booking.com',
      AIRBNB: 'Airbnb', ABRITEL: 'Abritel'
    };
    return labels[source || ''] || source || '';
  }
}
