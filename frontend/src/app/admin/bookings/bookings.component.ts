import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { BookingService } from '../../core/services/booking.service';
import { forkJoin } from 'rxjs';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatDialogModule,
    MatTableModule, MatSortModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatInputModule, MatSelectModule, MatCardModule, MatSnackBarModule, MatFormFieldModule,
    MatTooltipModule, MatPaginatorModule
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
            <input matInput [ngModel]="searchText()" (ngModelChange)="onSearch($event)" placeholder="Nom, prénom, id…"
                   autocomplete="off" [attr.readonly]="searchReady ? null : true" (focus)="searchReady = true">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Statut</mat-label>
            <mat-select [ngModel]="filterStatus()" (ngModelChange)="onStatusFilter($event)">
              <mat-option value="">Tous</mat-option>
              <mat-option value="new">Nouveau</mat-option>
              <mat-option value="confirmed">Confirmé</mat-option>
              <mat-option value="request">Demande</mat-option>
              <mat-option value="inquiry">Renseignement</mat-option>
              <mat-option value="black">Bloqué</mat-option>
              <mat-option value="cancelled">Annulé</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Canal</mat-label>
            <mat-select [ngModel]="filterChannel()" (ngModelChange)="onChannelFilter($event)">
              <mat-option value="">Tous</mat-option>
              <mat-option value="Airbnb">Airbnb</mat-option>
              <mat-option value="Booking.com">Booking.com</mat-option>
              <mat-option value="Direct">Direct</mat-option>
            </mat-select>
          </mat-form-field>
          <span class="total-count">{{ sortedFiltered().length }} réservation(s)</span>
        </div>

        <!-- Cartes mobile -->
        <div class="mobile-list">
          @for (b of paged(); track b['id']) {
            <mat-card class="mobile-card">
              <div class="mc-top">
                <div>
                  <strong>{{ guestName(b) }}</strong>
                  @if (b['guestEmail'] || b['email']) {
                    <div class="mc-email">{{ b['guestEmail'] || b['email'] }}</div>
                  }
                </div>
                <mat-chip [class]="'status-' + b['status']">{{ b['status'] }}</mat-chip>
              </div>
              <div class="mc-meta">
                <span><mat-icon>home</mat-icon>{{ propLabel(b) }}</span>
                <span><mat-icon>login</mat-icon>{{ b['arrival'] | date:'dd/MM/yy' }}</span>
                <span><mat-icon>logout</mat-icon>{{ b['departure'] | date:'dd/MM/yy' }}</span>
                <span><mat-icon>nights_stay</mat-icon>{{ nights(b) }} nuit(s)</span>
                <span><mat-icon>sell</mat-icon>{{ b['channel'] || 'Direct' }}</span>
                @if (b['totalPrice']) {
                  <span><mat-icon>euro</mat-icon>{{ b['totalPrice'] | currency:'EUR':'symbol':'1.0-0' }}</span>
                }
              </div>
              <div class="mc-actions">
                <button mat-stroked-button (click)="openDetail(b)"><mat-icon>info</mat-icon> Détail</button>
                <button mat-stroked-button (click)="editBooking(b)"><mat-icon>edit</mat-icon> Modifier</button>
              </div>
            </mat-card>
          }
          @if (sortedFiltered().length === 0) {
            <p class="empty">Aucune réservation trouvée</p>
          }
          <mat-paginator
            [length]="sortedFiltered().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        </div>

        <!-- Tableau desktop -->
        <div class="desktop-table">
          <table mat-table [dataSource]="paged()" matSort (matSortChange)="onSortChange($event)" class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let b">{{ b['id'] }}</td>
            </ng-container>
            <ng-container matColumnDef="guest">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Voyageur</th>
              <td mat-cell *matCellDef="let b">
                {{ guestName(b) }}<br>
                <small>{{ b['guestEmail'] || b['email'] }}</small>
              </td>
            </ng-container>
            <ng-container matColumnDef="property">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Logement</th>
              <td mat-cell *matCellDef="let b">{{ propLabel(b) }}</td>
            </ng-container>
            <ng-container matColumnDef="dates">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Dates</th>
              <td mat-cell *matCellDef="let b">
                {{ b['arrival'] | date:'dd/MM/yy' }} → {{ b['departure'] | date:'dd/MM/yy' }}<br>
                <small>{{ nights(b) }} nuit(s)</small>
              </td>
            </ng-container>
            <ng-container matColumnDef="channel">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Canal</th>
              <td mat-cell *matCellDef="let b">
                <mat-chip class="source-chip">{{ b['channel'] || 'Direct' }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
              <td mat-cell *matCellDef="let b">
                <mat-chip [class]="'status-' + b['status']">{{ b['status'] }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Montant</th>
              <td mat-cell *matCellDef="let b">{{ b['totalPrice'] | currency:'EUR':'symbol':'1.0-0' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let b" class="actions-cell" (click)="$event.stopPropagation()">
                <button mat-icon-button color="primary" (click)="editBooking(b)" matTooltip="Modifier">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="cancelBooking(b)" matTooltip="Annuler">
                  <mat-icon>cancel</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;" class="clickable-row" (click)="openDetail(row)"></tr>
          </table>
          @if (sortedFiltered().length === 0) {
            <p class="empty">Aucune réservation trouvée</p>
          }
          <mat-paginator
            [length]="sortedFiltered().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        </div>

      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .filters { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .filters mat-form-field { min-width: 200px; flex: 1; }
    .total-count { color: #666; font-size: 13px; white-space: nowrap; }
    .full-width { width: 100%; }
    .status-new { background: #e3f2fd !important; color: #1565c0 !important; }
    .status-confirmed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-request { background: #fff8e1 !important; color: #f57f17 !important; }
    .status-inquiry { background: #f3e5f5 !important; color: #6a1b9a !important; }
    .status-black { background: #424242 !important; color: #fff !important; }
    .status-cancelled { background: #ffebee !important; color: #c62828 !important; }
    .status-checked-in { background: #fff3e0 !important; color: #e65100 !important; }
    .source-chip { background: #ede7f6 !important; }
    td { padding: 8px 16px; }
    small { color: #666; }
    .empty { text-align: center; padding: 24px; color: #999; }
    .actions-cell { white-space: nowrap; padding: 4px 8px !important; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f5f5f5; }

    /* Mobile */
    .mobile-list { display: none; flex-direction: column; gap: 10px; }
    .mobile-card { padding: 14px 16px; }
    .mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .mc-email { font-size: 12px; color: #666; margin-top: 2px; }
    .mc-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; }
    .mc-meta span { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; }
    .mc-meta mat-icon { font-size: 15px; width: 15px; height: 15px; color: #0288d1; }
    .mc-actions { display: flex; gap: 8px; margin-top: 12px; }

    @media (max-width: 768px) {
      .mobile-list { display: flex; }
      .desktop-table { display: none; }
      h1 { font-size: 20px; }
      .filters mat-form-field { min-width: 100%; }
    }
  `]
})
export class BookingsComponent implements OnInit {
  searchReady = false;
  bookings = signal<any[]>([]);
  searchText = signal('');
  filterStatus = signal('');
  filterChannel = signal('');
  pageSize = signal(20);
  pageIndex = signal(0);
  sortColumn = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');
  columns = ['id', 'guest', 'property', 'dates', 'channel', 'status', 'amount', 'actions'];

  sortedFiltered = computed(() => this.sortData(this.applyFilters(this.bookings())));
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedFiltered().slice(start, start + this.pageSize());
  });

  constructor(
    private bookingService: BookingService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    const arrivalFrom = localDateStr(from);
    forkJoin([this.bookingService.getAll({ arrivalFrom }), this.bookingService.getPropertyNames()]).subscribe({
      next: ([data, names]) => {
        this.bookings.set((data ?? []).map(b => {
          if (!b['propName'] && !b['propertyName']) {
            const pid = String(b['propId'] ?? b['propertyId'] ?? '');
            if (pid && names[pid]) return { ...b, propName: names[pid] };
          }
          return b;
        }));
      },
      error: err => this.snackBar.open(err.error?.error ?? 'Erreur chargement', 'Fermer', { duration: 4000 })
    });
  }

  onSearch(value: string): void {
    this.searchText.set(value);
    this.pageIndex.set(0);
  }

  onStatusFilter(value: string): void {
    this.filterStatus.set(value);
    this.pageIndex.set(0);
  }

  onChannelFilter(value: string): void {
    this.filterChannel.set(value);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }

  onSortChange(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDir.set((sort.direction || 'asc') as 'asc' | 'desc');
    this.pageIndex.set(0);
  }

  private applyFilters(data: any[]): any[] {
    const q = this.searchText().toLowerCase();
    const st = this.filterStatus();
    const ch = this.filterChannel();
    if (q) data = data.filter(b =>
      b['guestFirstName']?.toLowerCase().includes(q) ||
      b['guestLastName']?.toLowerCase().includes(q) ||
      b['guestEmail']?.toLowerCase().includes(q) ||
      String(b['id']).includes(q)
    );
    if (st) data = data.filter(b => (b['status'] ?? '') === st);
    if (ch) data = data.filter(b => (b['channel'] || 'Direct') === ch);
    return data;
  }

  private sortData(data: any[]): any[] {
    const col = this.sortColumn();
    const dir = this.sortDir();
    if (!col) return data;
    return [...data].sort((a, b) => {
      let va: any, vb: any;
      switch (col) {
        case 'id':       va = Number(a['id'] ?? 0);           vb = Number(b['id'] ?? 0); break;
        case 'guest':    va = this.guestName(a);               vb = this.guestName(b); break;
        case 'property': va = this.propLabel(a);               vb = this.propLabel(b); break;
        case 'dates':    va = a['arrival'] ?? '';              vb = b['arrival'] ?? ''; break;
        case 'channel':  va = a['channel'] ?? 'Direct';        vb = b['channel'] ?? 'Direct'; break;
        case 'status':   va = a['status'] ?? '';               vb = b['status'] ?? ''; break;
        case 'amount':   va = Number(a['totalPrice'] ?? 0);    vb = Number(b['totalPrice'] ?? 0); break;
        default: return 0;
      }
      if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va;
      const cmp = String(va).localeCompare(String(vb), 'fr');
      return dir === 'asc' ? cmp : -cmp;
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

  openDetail(b: any): void {
    const ref = this.dialog.open(BookingDetailDialogComponent, { data: b, width: '600px' });
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
      error: err => this.snackBar.open(err.error?.error ?? 'Erreur lors de l\'annulation', 'Fermer', { duration: 4000 })
    });
  }
}
