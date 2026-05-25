import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { environment } from '@env/environment';

interface CalProperty { id: number; name: string; city: string; }
interface CalBooking  { id: number; propertyId: number; arrival: string; departure: string; guestName: string; status: string; channel: string; }
interface CalBlock    { id: number; propertyId: number; startDate: string; endDate: string; type: string; notes: string; }

interface DayCell {
  date: string;        // YYYY-MM-DD
  bookingId?: number;
  guestName?: string;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  channel?: string;
  blockId?: number;
  blockType?: string;
  blockNotes?: string;
  isBlockFirst?: boolean;
  isBlockLast?: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

const BLOCK_LABELS: Record<string, string> = {
  OWNER_STAY:  'Séjour propriétaire',
  MAINTENANCE: 'Maintenance',
  CLEANING:    'Nettoyage',
  OTHER:       'Blocage'
};

const CHANNEL_COLORS: Record<string, string> = {
  airbnb:  '#FF5A5F',
  booking: '#003580',
  abritel: '#E8572A',
  direct:  '#1976d2',
  beds24:  '#607d8b'
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule,
    MatProgressSpinnerModule, MatCardModule
  ],
  template: `
    <div class="cal-header">
      <h2>Calendrier des disponibilités</h2>
    </div>

    <!-- Navigation mois -->
    <div class="nav-bar">
      <button mat-icon-button (click)="prevMonth()"><mat-icon>chevron_left</mat-icon></button>
      <span class="month-label">{{ monthLabel() }}</span>
      <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
      <button mat-stroked-button (click)="goToday()" style="margin-left:12px">Aujourd'hui</button>
      <span class="spacer"></span>
      <!-- Légende -->
      <div class="legend">
        <span class="leg"><span class="dot" style="background:#1976d2"></span> Direct</span>
        <span class="leg"><span class="dot" style="background:#FF5A5F"></span> Airbnb</span>
        <span class="leg"><span class="dot" style="background:#003580"></span> Booking</span>
        <span class="leg"><span class="dot" style="background:#f57c00"></span> Blocage</span>
      </div>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else {

    <!-- Grille calendrier -->
    <div class="cal-wrapper">
      <table class="cal-table">
        <thead>
          <tr>
            <th class="prop-col">Logement</th>
            @for (d of days(); track d.date) {
              <th class="day-th" [class.weekend]="d.isWeekend" [class.today]="d.isToday">
                <div class="day-num">{{ d.date.slice(8) }}</div>
                <div class="day-name">{{ getDayName(d.date) }}</div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of grid(); track row.property.id) {
            <tr>
              <td class="prop-cell">
                <div class="prop-name" [title]="row.property.name">{{ row.property.name }}</div>
                @if (row.property.city) {
                  <div class="prop-city">{{ row.property.city }}</div>
                }
              </td>
              @for (cell of row.cells; track cell.date) {
                <td class="day-cell"
                    [class.weekend]="cell.isWeekend"
                    [class.today]="cell.isToday"
                    [class.booked]="!!cell.bookingId"
                    [class.blocked]="!!cell.blockId && !cell.bookingId"
                    [class.first-day]="cell.isFirstDay"
                    [class.last-day]="cell.isLastDay"
                    [class.block-first]="cell.isBlockFirst"
                    [class.block-last]="cell.isBlockLast"
                    [style.background]="cellBg(cell)"
                    [title]="cellTooltip(cell)"
                    (click)="onCellClick(row.property, cell)">
                  @if (cell.isFirstDay && cell.guestName) {
                    <span class="guest-chip">{{ cell.guestName | slice:0:14 }}</span>
                  }
                  @if (cell.isBlockFirst && !cell.bookingId) {
                    <span class="block-chip">{{ blockLabel(cell.blockType!) }}</span>
                  }
                </td>
              }
            </tr>
          }
          @if (grid().length === 0) {
            <tr><td [attr.colspan]="days().length + 1" class="empty-row">
              Aucun logement. Connectez votre compte Beds24 ou créez des propriétés.
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    }<!-- end @if loading -->

    <!-- Panel création de blocage -->
    @if (selection) {
      <div class="block-panel">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Bloquer des dates</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p><strong>{{ selection.property.name }}</strong> — du {{ selection.startDate }} au {{ selection.endDate }}</p>
            <div class="form-row">
              <mat-form-field>
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="blockForm.type">
                  <mat-option value="OWNER_STAY">Séjour propriétaire</mat-option>
                  <mat-option value="MAINTENANCE">Maintenance</mat-option>
                  <mat-option value="CLEANING">Nettoyage</mat-option>
                  <mat-option value="OTHER">Autre</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex2">
                <mat-label>Notes (optionnel)</mat-label>
                <input matInput [(ngModel)]="blockForm.notes" />
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="warn" (click)="confirmBlock()">
              <mat-icon>block</mat-icon> Bloquer
            </button>
            <button mat-button (click)="selection = null">Annuler</button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .cal-header { margin-bottom: 16px; }
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .nav-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .month-label { font-size: 20px; font-weight: 600; min-width: 180px; text-align: center; }
    .spacer { flex: 1; }
    .legend { display: flex; gap: 16px; font-size: 12px; }
    .leg { display: flex; align-items: center; gap: 4px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

    .center { display: flex; justify-content: center; padding: 60px; }

    .cal-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e0e0e0; }
    .cal-table { border-collapse: collapse; min-width: 100%; table-layout: fixed; }

    .prop-col { width: 160px; min-width: 160px; background: #f5f5f5; position: sticky; left: 0; z-index: 2; border-right: 2px solid #ddd; }
    .day-th { width: 38px; min-width: 38px; text-align: center; padding: 4px 0; background: #fafafa; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #f0f0f0; }
    .day-th.weekend { background: #f3e5f5; }
    .day-th.today { background: #e3f2fd; }
    .day-num { font-size: 13px; font-weight: 600; }
    .day-name { font-size: 10px; color: #888; text-transform: capitalize; }

    .prop-cell { background: #f5f5f5; padding: 8px 12px; border-right: 2px solid #ddd; border-bottom: 1px solid #e0e0e0; position: sticky; left: 0; z-index: 1; }
    .prop-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    .prop-city { font-size: 11px; color: #888; }

    .day-cell {
      height: 44px; min-width: 38px;
      border-right: 1px solid #f0f0f0;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      vertical-align: middle;
      transition: filter 0.1s;
    }
    .day-cell:hover { filter: brightness(0.92); }
    .day-cell.weekend { background: rgba(0,0,0,0.02); }
    .day-cell.today { outline: 2px solid #1976d2; outline-offset: -2px; }

    .day-cell.booked  { color: white; border-top: 3px solid transparent; border-bottom: 3px solid transparent; }
    .day-cell.blocked { color: white; }
    .day-cell.first-day { border-radius: 6px 0 0 6px; margin-left: 2px; }
    .day-cell.last-day  { border-radius: 0 6px 6px 0; margin-right: 2px; }

    .guest-chip, .block-chip {
      position: absolute;
      left: 4px; top: 50%;
      transform: translateY(-50%);
      font-size: 11px; font-weight: 600;
      white-space: nowrap;
      color: white !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      pointer-events: none;
    }

    .empty-row { text-align: center; padding: 40px; color: #888; font-style: italic; }

    .block-panel {
      position: fixed; bottom: 24px; right: 24px;
      z-index: 100; width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      border-radius: 12px;
      overflow: hidden;
    }
    .form-row { display: flex; gap: 12px; margin-top: 8px; }
    .form-row mat-form-field { flex: 1; }
    .form-row .flex2 { flex: 2; }
    mat-card-actions { padding: 8px 16px; display: flex; gap: 8px; }
  `]
})
export class CalendarComponent implements OnInit {
  private base = environment.apiUrl;

  year  = signal(new Date().getFullYear());
  month = signal(new Date().getMonth() + 1); // 1-12

  loading = signal(false);
  properties = signal<CalProperty[]>([]);
  bookings   = signal<CalBooking[]>([]);
  blocks     = signal<CalBlock[]>([]);

  days = computed(() => this.buildDays(this.year(), this.month()));
  grid = computed(() => this.buildGrid());

  monthLabel = computed(() => {
    const d = new Date(this.year(), this.month() - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  selection: { property: CalProperty; startDate: string; endDate: string } | null = null;
  blockForm = { type: 'OWNER_STAY', notes: '' };

  private dragStart: string | null = null;
  private dragProperty: CalProperty | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  prevMonth(): void {
    if (this.month() === 1) { this.year.update(y => y - 1); this.month.set(12); }
    else this.month.update(m => m - 1);
    this.load();
  }

  nextMonth(): void {
    if (this.month() === 12) { this.year.update(y => y + 1); this.month.set(1); }
    else this.month.update(m => m + 1);
    this.load();
  }

  goToday(): void {
    const now = new Date();
    this.year.set(now.getFullYear());
    this.month.set(now.getMonth() + 1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.selection = null;
    const from = `${this.year()}-${String(this.month()).padStart(2,'0')}-01`;
    const lastDay = new Date(this.year(), this.month(), 0).getDate();
    const to = `${this.year()}-${String(this.month()).padStart(2,'0')}-${lastDay}`;

    this.http.get<{ properties: CalProperty[]; bookings: CalBooking[]; blocks: CalBlock[] }>(
      `${this.base}/admin/availability/calendar`, { params: { from, to } }
    ).subscribe({
      next: r => {
        this.properties.set(r.properties);
        this.bookings.set(r.bookings);
        this.blocks.set(r.blocks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onCellClick(property: CalProperty, cell: DayCell): void {
    if (cell.blockId) {
      if (confirm(`Supprimer le blocage "${this.blockLabel(cell.blockType!)}" ?`)) {
        this.http.delete(`${this.base}/admin/availability/blocks/${cell.blockId}`).subscribe(() => this.load());
      }
      return;
    }
    if (cell.bookingId) return;

    if (!this.selection || this.selection.property.id !== property.id) {
      this.selection = { property, startDate: cell.date, endDate: cell.date };
      this.blockForm = { type: 'OWNER_STAY', notes: '' };
    } else {
      const s = this.selection.startDate <= cell.date ? this.selection.startDate : cell.date;
      const e = this.selection.startDate <= cell.date ? cell.date : this.selection.startDate;
      this.selection = { ...this.selection, startDate: s, endDate: e };
    }
  }

  confirmBlock(): void {
    if (!this.selection) return;
    const payload = {
      propertyId: this.selection.property.id,
      startDate:  this.selection.startDate,
      endDate:    this.selection.endDate,
      type:       this.blockForm.type,
      notes:      this.blockForm.notes
    };
    this.http.post(`${this.base}/admin/availability/blocks`, payload).subscribe(() => {
      this.selection = null;
      this.load();
    });
  }

  cellBg(cell: DayCell): string {
    if (cell.bookingId) {
      const booking = this.bookings().find(b => b.id === cell.bookingId);
      return CHANNEL_COLORS[booking?.channel ?? ''] ?? '#1976d2';
    }
    if (cell.blockId) return '#f57c00';
    return '';
  }

  cellTooltip(cell: DayCell): string {
    if (cell.bookingId && cell.guestName) return `${cell.guestName} (${cell.date})`;
    if (cell.blockId) return `${this.blockLabel(cell.blockType!)}${cell.blockNotes ? ' — ' + cell.blockNotes : ''}`;
    return cell.date;
  }

  blockLabel(type: string): string { return BLOCK_LABELS[type] ?? type; }

  getDayName(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
  }

  private buildDays(year: number, month: number): DayCell[] {
    const today = new Date().toISOString().split('T')[0];
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(date + 'T12:00:00').getDay();
      return { date, isWeekend: dow === 0 || dow === 6, isToday: date === today } as DayCell;
    });
  }

  private buildGrid(): { property: CalProperty; cells: DayCell[] }[] {
    const ds = this.days();
    const bs = this.bookings();
    const bls = this.blocks();

    return this.properties().map(prop => ({
      property: prop,
      cells: ds.map(d => {
        const cell: DayCell = { ...d };

        const booking = bs.find(b =>
          b.propertyId === prop.id && b.arrival <= d.date && b.departure > d.date
        );
        if (booking) {
          cell.bookingId  = booking.id;
          cell.guestName  = booking.guestName.trim() || 'Voyageur';
          cell.isFirstDay = booking.arrival === d.date;
          cell.isLastDay  = booking.departure === this.nextDay(d.date);
          cell.channel    = booking.channel;
        }

        const block = bls.find(b =>
          b.propertyId === prop.id && b.startDate <= d.date && b.endDate >= d.date
        );
        if (block && !booking) {
          cell.blockId     = block.id;
          cell.blockType   = block.type;
          cell.blockNotes  = block.notes;
          cell.isBlockFirst = block.startDate === d.date;
          cell.isBlockLast  = block.endDate   === d.date;
        }

        return cell;
      })
    }));
  }

  private nextDay(date: string): string {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
}
