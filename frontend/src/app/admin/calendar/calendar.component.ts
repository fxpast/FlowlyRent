import { Component, OnInit, ViewChild, ElementRef, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';
import { localDateStr } from '../../core/utils/date.utils';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { BlackoutDialogComponent, BlackoutDialogResult } from '../blackout-dialog/blackout-dialog.component';
import { PriceDialogComponent, PriceDialogResult } from '../price-dialog/price-dialog.component';

interface CalProperty { id: string; name: string; city: string; }
interface CalBooking  { id: string; propertyId: string; arrival: string; departure: string; guestName: string; status: string; channel: string; }
interface CalBlock    { id: string; propertyId: string; startDate: string; endDate: string; type: string; notes: string; }

interface DayCell {
  date: string;        // YYYY-MM-DD
  bookingId?: string;
  guestName?: string;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  showName?: boolean;
  bookingSpan?: number;       // visible days in this month for the booking (set on showName cell)
  bookingMidOffset?: number;  // cells from visStart to mid (for left positioning)
  channel?: string;
  splitCheckoutChannel?: string;  // set when this day is both a checkout and a checkin
  blockId?: string;
  blockType?: string;
  blockNotes?: string;
  isBlockFirst?: boolean;
  isBlockLast?: boolean;
  isWeekend: boolean;
  isToday: boolean;
  price?: number;
  minStay?: number;
  override?: number;
}

const BLOCK_TYPE_KEYS: Record<string, string> = {
  OWNER_STAY:  'calendar.block_owner_stay',
  MAINTENANCE: 'calendar.block_maintenance',
  CLEANING:    'calendar.block_cleaning',
  OTHER:       'calendar.block_other'
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
    CommonModule, FormsModule, RouterLink, MatDialogModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatProgressSpinnerModule, TranslateModule
  ],
  template: `
    <div class="cal-header">
      <h2>{{ 'calendar.page_title' | translate }}</h2>
      @if (!auth.isIcal()) {
        <a mat-raised-button color="primary" routerLink="/admin/bookings/new">
          <mat-icon>add</mat-icon> {{ 'calendar.new_booking' | translate }}
        </a>
      }
    </div>

    <!-- Navigation mois -->
    <div class="nav-bar">
      <button mat-icon-button (click)="prevMonth()"><mat-icon>chevron_left</mat-icon></button>
      <span class="month-label">{{ monthLabel() }}</span>
      <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
      <button mat-stroked-button (click)="goToday()" style="margin-left:12px">{{ 'common.today' | translate }}</button>

      <mat-form-field appearance="outline" class="prop-filter" subscriptSizing="dynamic">
        <mat-select [value]="selectedPropertyId()" (selectionChange)="selectedPropertyId.set($event.value)">
          <mat-option value="all">{{ 'calendar.all_properties' | translate }}</mat-option>
          @for (p of properties(); track p.id) {
            <mat-option [value]="p.id">{{ p.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <span class="spacer"></span>
      <!-- Légende -->
      <div class="legend">
        <span class="leg"><span class="dot" style="background:#1976d2"></span> Direct</span>
        <span class="leg"><span class="dot" style="background:#FF5A5F"></span> Airbnb</span>
        <span class="leg"><span class="dot" style="background:#003580"></span> Booking</span>
        <span class="leg"><span class="dot" style="background:#E8572A"></span> Abritel</span>
        <span class="leg"><span class="dot blackout-dot"></span> {{ 'calendar.legend_blackout' | translate }}</span>
      </div>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else {

    <!-- Grille calendrier -->
    <div class="cal-wrapper" [class.sidebar-collapsed]="sidebarCollapsed()" #calWrapper>
      <table class="cal-table">
        <thead>
          <tr>
            <th class="prop-col">
              <div class="prop-col-head">
                <span class="prop-col-label">{{ 'common.property' | translate }}</span>
                <button class="toggle-sidebar-btn" (click)="sidebarCollapsed.set(!sidebarCollapsed())"
                        [title]="sidebarCollapsed() ? ('calendar.show_properties' | translate) : ('calendar.collapse_sidebar' | translate)">
                  <mat-icon>{{ sidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
                </button>
              </div>
            </th>
            <th class="type-col"></th>
            @for (d of days(); track d.date) {
              <th class="day-th" [class.weekend]="d.isWeekend" [class.today]="d.isToday">
                <div class="day-num">{{ d.date.slice(8) }}</div>
                <div class="day-name">{{ getDayName(d.date) }}</div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of filteredGrid(); track row.property.id) {
            <!-- Ligne blackout -->
            <tr class="info-row">
              <td class="prop-cell" rowspan="4">
                <div class="prop-name" [title]="row.property.name">{{ row.property.name }}</div>
                @if (row.property.city) {
                  <div class="prop-city">{{ row.property.city }}</div>
                }
              </td>
              <td class="type-cell type-block"><mat-icon class="row-icon">block</mat-icon></td>
              @for (cell of row.cells; track cell.date) {
                <td class="info-cell blackout-cell"
                    [class.weekend]="cell.isWeekend"
                    [class.is-blocked]="!!cell.blockId"
                    [class.block-first]="cell.isBlockFirst"
                    [class.block-last]="cell.isBlockLast"
                    [class.in-drag]="isDragRange(row.property.id, cell.date)"
                    [title]="cell.blockId ? cellTooltip(cell) : dragToBlockLabel"
                    (mousedown)="onBlackoutMouseDown(row.property, cell, $event)"
                    (mouseenter)="onBlackoutMouseEnter(row.property, cell)"
                    (mouseup)="onBlackoutMouseUp(row.property, cell)">
                  @if (cell.isBlockFirst) {
                    <span class="block-chip-small">{{ blockLabel(cell.blockType!) }}</span>
                  }
                </td>
              }
            </tr>
            <!-- Ligne prix -->
            <tr class="info-row">
              <td class="type-cell type-price"><mat-icon class="row-icon">euro</mat-icon></td>
              @for (cell of row.cells; track cell.date) {
                <td class="info-cell price-cell clickable"
                    [class.weekend]="cell.isWeekend"
                    (click)="onCellClick(row.property, cell, 'price')">
                  @if (cell.price) { {{ cell.price | number:'1.0-0' }} }
                </td>
              }
            </tr>
            <!-- Ligne durée minimum -->
            <tr class="info-row">
              <td class="type-cell type-minstay"><mat-icon class="row-icon">schedule</mat-icon></td>
              @for (cell of row.cells; track cell.date) {
                <td class="info-cell minstay-cell clickable"
                    [class.weekend]="cell.isWeekend"
                    (click)="onCellClick(row.property, cell, 'minstay')">
                  @if (cell.minStay && cell.minStay > 0) { {{ cell.minStay }}n }
                </td>
              }
            </tr>
            <!-- Ligne réservations -->
            <tr class="last-subrow">
              <td class="type-cell">{{ 'calendar.bookings_abbr' | translate }}</td>
              @for (cell of row.cells; track cell.date) {
                <td class="day-cell"
                    [class.weekend]="cell.isWeekend"
                    [class.today]="cell.isToday"
                    [class.booked]="!!cell.bookingId"
                    [class.show-name]="cell.showName"
                    [title]="cellTooltip(cell)"
                    (click)="onCellClick(row.property, cell)">
                  @if (cell.bookingId) {
                    @if (cell.splitCheckoutChannel !== undefined) {
                      <div class="bkg bkg-split-co" [style.background]="getColor(cell.splitCheckoutChannel)"></div>
                      <div class="bkg bkg-split-ci" [style.background]="getColor(cell.channel)"></div>
                    } @else {
                      <div class="bkg"
                           [class.bkg-first]="cell.isFirstDay && !cell.isLastDay"
                           [class.bkg-last]="!cell.isFirstDay && cell.isLastDay"
                           [class.bkg-only]="cell.isFirstDay && cell.isLastDay"
                           [style.background]="getColor(cell.channel)">
                      </div>
                    }
                  }
                  @if (cell.showName && cell.guestName) {
                    <span class="guest-chip"
                          [style.left.px]="-(cell.bookingMidOffset ?? 0) * 38 + 4"
                          [style.width.px]="(cell.bookingSpan ?? 1) * 38 - 8">
                      {{ cell.guestName }}
                    </span>
                  }
                </td>
              }
            </tr>
          }
          @if (filteredGrid().length === 0) {
            <tr><td [attr.colspan]="days().length + 2" class="empty-row">
              {{ 'calendar.no_properties_hint' | translate }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    }<!-- end @if loading -->
  `,
  styles: [`
    .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .nav-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .month-label { font-size: 20px; font-weight: 600; min-width: 180px; text-align: center; }
    .spacer { flex: 1; }
    .prop-filter { width: 220px; margin-left: 16px; }
    .prop-filter .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; min-height: unset; }
    .legend { display: flex; gap: 16px; font-size: 12px; }
    .leg { display: flex; align-items: center; gap: 4px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .blackout-dot { border-radius: 2px; background: repeating-linear-gradient(45deg,#546e7a 0,#546e7a 3px,#b0bec5 3px,#b0bec5 7px); }

    .center { display: flex; justify-content: center; padding: 60px; }

    .cal-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e0e0e0; }
    .cal-table { border-collapse: collapse; min-width: 100%; table-layout: fixed; }

    .prop-col { width: 150px; min-width: 150px; background: #f5f5f5; position: sticky; left: 0; z-index: 2; border-right: 1px solid #ddd; }
    .type-col { width: 36px; min-width: 36px; background: #f5f5f5; position: sticky; left: 150px; z-index: 2; border-right: 2px solid #ddd; }

    /* ── Sidebar collapse ── */
    .prop-col-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 0 2px; }
    .prop-col-label { font-size: 11px; color: #888; font-weight: 500; }
    .toggle-sidebar-btn {
      background: none; border: none; cursor: pointer; padding: 2px;
      color: #888; display: flex; align-items: center; border-radius: 4px;
      transition: background .15s, color .15s; flex-shrink: 0;
    }
    .toggle-sidebar-btn:hover { background: #e0e0e0; color: #333; }
    .toggle-sidebar-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .sidebar-collapsed th.prop-col { width: 32px !important; min-width: 32px !important; padding: 0 !important; }
    .sidebar-collapsed td.prop-cell { width: 32px !important; min-width: 32px !important; padding: 0 !important; overflow: hidden; }
    .sidebar-collapsed .prop-name,
    .sidebar-collapsed .prop-city,
    .sidebar-collapsed .prop-col-label { display: none !important; }
    .sidebar-collapsed .toggle-sidebar-btn { margin: 0 auto; }
    .sidebar-collapsed th.type-col,
    .sidebar-collapsed td.type-cell { left: 32px !important; }
    .day-th { width: 38px; min-width: 38px; text-align: center; padding: 4px 0; background: #fafafa; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #f0f0f0; }
    .day-th.weekend { background: #f3e5f5; }
    .day-th.today { background: #e3f2fd; }
    .day-num { font-size: 13px; font-weight: 600; }
    .day-name { font-size: 10px; color: #888; text-transform: capitalize; }

    .prop-cell {
      background: #f5f5f5; padding: 8px 10px;
      border-right: 1px solid #ddd; border-bottom: 2px solid #ddd;
      position: sticky; left: 0; z-index: 1;
      vertical-align: middle;
    }
    .prop-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 132px; }
    .prop-city { font-size: 11px; color: #888; }

    .type-cell {
      background: #f5f5f5; font-size: 10px; color: #aaa;
      text-align: center; padding: 2px 4px;
      border-right: 2px solid #ddd; border-bottom: 1px solid #e8e8e8;
      position: sticky; left: 150px; z-index: 1;
      vertical-align: middle;
    }
    .type-price   { color: #2e7d32; }
    .type-minstay { color: #0288d1; }
    .row-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; }

    .day-cell {
      height: 40px; min-width: 38px;
      border-right: 1px solid #f0f0f0;
      border-bottom: 1px solid #e0e0e0;
      cursor: default;
      position: relative;
      overflow: hidden;
      vertical-align: middle;
      transition: filter 0.1s;
    }
    .day-cell.booked   { cursor: pointer; }
    .day-cell:hover    { filter: brightness(0.92); }
    .day-cell.weekend  { background: rgba(0,0,0,0.02); }
    .day-cell.today    { outline: 2px solid #1976d2; outline-offset: -2px; }
    .day-cell.show-name { overflow: visible; z-index: 1; }

    /* Background blocks with parallelogram clip-path (SKEW = 10px, leans left going down) */
    .bkg {
      position: absolute; inset: 0; z-index: 0;
    }
    /* checkin: angled left edge — top starts at 10px, bottom at 0 */
    .bkg-first { clip-path: polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%); }
    /* checkout: angled right edge — top ends at 100%, bottom ends at calc(100%-10px) */
    .bkg-last  { clip-path: polygon(0% 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%); }
    /* single-day: both edges angled */
    .bkg-only  { clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%); }
    /* split day: checkout occupies left half, checkin right half, shared diagonal */
    .bkg-split-co { clip-path: polygon(0% 0%, calc(50% + 10px) 0%, calc(50% - 10px) 100%, 0% 100%); }
    .bkg-split-ci { clip-path: polygon(calc(50% + 10px) 0%, 100% 0%, 100% 100%, calc(50% - 10px) 100%); }

    .guest-chip {
      position: absolute; top: 50%;
      transform: translateY(-50%);
      text-align: center;
      font-size: 11px; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      color: white !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      pointer-events: none; z-index: 2;
    }

    .blackout-cell {
      height: 18px; min-width: 38px;
      border-right: 1px solid #f0f0f0;
      vertical-align: middle; position: relative; overflow: hidden;
      cursor: crosshair; user-select: none;
    }
    .blackout-cell.is-blocked {
      background: repeating-linear-gradient(
        45deg, #546e7a 0px, #546e7a 3px, #b0bec5 3px, #b0bec5 9px
      ) !important;
    }
    .blackout-cell.in-drag {
      background: rgba(84, 110, 122, 0.35) !important;
      outline: 1px solid #546e7a;
    }
    .blackout-cell.block-first { border-radius: 4px 0 0 4px; }
    .blackout-cell.block-last  { border-radius: 0 4px 4px 0; }
    .block-chip-small {
      position: absolute; left: 3px; top: 50%;
      transform: translateY(-50%);
      font-size: 9px; font-weight: 600; color: #263238;
      white-space: nowrap; pointer-events: none;
      text-shadow: 0 0 3px #eceff1;
    }
    .type-block { color: #546e7a; }

    .info-row td { border-bottom: 1px solid #efefef; }
    .last-subrow td { border-bottom: 2px solid #ddd; }

    .info-cell {
      height: 18px; min-width: 38px;
      font-size: 10px; text-align: center;
      border-right: 1px solid #f0f0f0;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
    }
    .info-cell.weekend { background: rgba(0,0,0,0.015); }
    .price-cell   { color: #2e7d32; font-weight: 500; }
    .minstay-cell { color: #0288d1; }

    .clickable { cursor: pointer; }
    .clickable:hover { filter: brightness(0.9); }

    .empty-row { text-align: center; padding: 40px; color: #888; font-style: italic; }
  `]
})
export class CalendarComponent implements OnInit {
  @ViewChild('calWrapper') calWrapper!: ElementRef<HTMLDivElement>;
  private base = environment.apiUrl;

  year  = signal(new Date().getFullYear());
  month = signal(new Date().getMonth() + 1); // 1-12

  loading    = signal(false);
  properties = signal<CalProperty[]>([]);
  bookings   = signal<CalBooking[]>([]);
  blocks     = signal<CalBlock[]>([]);
  calendarData = signal<Record<string, Record<string, { price?: number; minStay?: number; override?: number }>>>({});

  days = computed(() => this.buildDays(this.year(), this.month()));
  grid = signal<{ property: CalProperty; cells: DayCell[] }[]>([]);

  sidebarCollapsed = signal(false);

  private dragging = false;
  private dragPropId = signal<string | null>(null);
  private dragFrom   = signal<string | null>(null);
  private dragTo     = signal<string | null>(null);
  selectedPropertyId = signal<string>('all');
  filteredGrid = computed(() => {
    const id = this.selectedPropertyId();
    return id === 'all' ? this.grid() : this.grid().filter(r => r.property.id === id);
  });

  monthLabel = computed(() => {
    const d = new Date(this.year(), this.month() - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  dragToBlockLabel = '';

  constructor(private http: HttpClient, private router: Router, private dialog: MatDialog, private bookingService: BookingService, private t: TranslateService, private auth: AuthService) {
    this.t.get('calendar.drag_to_block').subscribe(v => this.dragToBlockLabel = v);
  }

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
    const from = `${this.year()}-${String(this.month()).padStart(2,'0')}-01`;
    const lastDay = new Date(this.year(), this.month(), 0).getDate();
    const to = `${this.year()}-${String(this.month()).padStart(2,'0')}-${lastDay}`;

    this.http.get<{
      properties: CalProperty[];
      bookings: CalBooking[];
      blocks: CalBlock[];
      calendarData?: Record<string, Record<string, { price?: number; minStay?: number }>>;
    }>(
      `${this.base}/admin/availability/calendar`, { params: { from, to } }
    ).subscribe({
      next: r => {
        this.bookings.set(r.bookings ?? []);
        this.blocks.set(r.blocks ?? []);
        this.calendarData.set(r.calendarData ?? {});
        this.bookingService.applyDisplayNames(r.properties ?? []).subscribe(mapped => {
          this.properties.set(mapped);
          this.grid.set(this.buildGrid());
          this.loading.set(false);
          setTimeout(() => this.scrollToToday(), 50);
        });
      },
      error: (e) => { console.error('[Calendar] error', e); this.loading.set(false); }
    });
  }

  onCellClick(property: CalProperty, cell: DayCell, rowType: 'booking' | 'price' | 'minstay' = 'booking'): void {
    if (rowType === 'booking') {
      if (!cell.bookingId) return;
      const booking = this.bookings().find(b => String(b.id) === String(cell.bookingId));
      if (booking) {
        const data = { ...booking, propName: property.name, propCity: property.city };
        const ref = this.dialog.open(BookingDetailDialogComponent, { data, width: '600px' });
        ref.afterClosed().subscribe(result => { if (result?.cancelled || result?.updated) this.load(); });
      } else {
        this.router.navigate(['/admin/bookings', cell.bookingId, 'edit']);
      }
    } else if (rowType === 'price' || rowType === 'minstay') {
      const field = rowType === 'price' ? 'price' : 'minStay';
      const ref = this.dialog.open(PriceDialogComponent, {
        data: { propertyName: property.name, date: cell.date, field, price: cell.price, minStay: cell.minStay },
        width: '380px'
      });
      ref.afterClosed().subscribe((result: PriceDialogResult | undefined) => {
        if (!result) return;
        const params: Record<string, string> = {
          propertyId: property.id, from: result.from, to: result.to
        };
        if (result.price   != null) params['price']   = String(result.price);
        if (result.minStay != null) params['minStay'] = String(result.minStay);
        this.http.post(`${this.base}/admin/availability/price`, null, { params }).subscribe({
          next: () => this.load(),
          error: (e) => console.error('[Calendar] price error', e)
        });
      });
    }
  }

  isDragRange(propId: string, date: string): boolean {
    if (this.dragPropId() !== propId) return false;
    const from = this.dragFrom();
    const to   = this.dragTo();
    if (!from || !to) return false;
    const [a, b] = from <= to ? [from, to] : [to, from];
    return date >= a && date <= b;
  }

  onBlackoutMouseDown(prop: CalProperty, cell: DayCell, e: MouseEvent): void {
    e.preventDefault();
    this.dragging = true;
    this.dragPropId.set(prop.id);
    this.dragFrom.set(cell.date);
    this.dragTo.set(cell.date);
  }

  onBlackoutMouseEnter(prop: CalProperty, cell: DayCell): void {
    if (!this.dragging || this.dragPropId() !== prop.id) return;
    this.dragTo.set(cell.date);
  }

  onBlackoutMouseUp(prop: CalProperty, cell: DayCell): void {
    if (!this.dragging) return;
    this.dragging = false;
    const rawFrom = this.dragFrom()!;
    const rawTo   = cell.date;
    this.dragPropId.set(null);
    this.dragFrom.set(null);
    this.dragTo.set(null);

    let startDate: string, endDate: string;
    if (rawFrom === rawTo) {
      const block = this.blocks().find(b => b.id === cell.blockId);
      startDate = block?.startDate ?? cell.date;
      endDate   = block?.endDate   ?? cell.date;
    } else {
      [startDate, endDate] = rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom];
    }
    this.openBlackoutDialog(prop, startDate, endDate);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (this.dragging) {
      this.dragging = false;
      this.dragPropId.set(null);
      this.dragFrom.set(null);
      this.dragTo.set(null);
    }
  }

  private openBlackoutDialog(prop: CalProperty, startDate: string, endDate: string): void {
    const ref = this.dialog.open(BlackoutDialogComponent, {
      data: { propertyName: prop.name, startDate, endDate },
      width: '400px'
    });
    ref.afterClosed().subscribe((result: BlackoutDialogResult | undefined) => {
      if (!result) return;
      this.http.post(`${this.base}/admin/availability/blackout`, null, {
        params: { propertyId: prop.id, from: result.from, to: result.to, override: result.override }
      }).subscribe({ next: () => this.load(), error: (e) => console.error('[Calendar] blackout error', e) });
    });
  }

  getColor(channel?: string): string {
    return CHANNEL_COLORS[channel ?? ''] ?? '#1976d2';
  }

  cellTooltip(cell: DayCell): string {
    if (cell.bookingId && cell.guestName) return `${cell.guestName} (${cell.date})`;
    if (cell.blockId) return `${this.blockLabel(cell.blockType!)}${cell.blockNotes ? ' — ' + cell.blockNotes : ''}`;
    return cell.date;
  }

  blockLabel(type: string): string { return this.t.instant(BLOCK_TYPE_KEYS[type] ?? type); }

  getDayName(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
  }

  private buildDays(year: number, month: number): DayCell[] {
    const today = localDateStr();
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(date + 'T12:00:00').getDay();
      return { date, isWeekend: dow === 0 || dow === 6, isToday: date === today } as DayCell;
    });
  }

  private scrollToToday(): void {
    const today = localDateStr();
    const dayIndex = this.days().findIndex(d => d.date === today);
    if (dayIndex < 0 || !this.calWrapper?.nativeElement) return;
    const colWidth = 38;
    // Recule de 3 jours pour montrer du contexte avant aujourd'hui
    const scrollLeft = Math.max(0, (dayIndex - 3) * colWidth);
    this.calWrapper.nativeElement.scrollLeft = scrollLeft;
  }

  private buildGrid(): { property: CalProperty; cells: DayCell[] }[] {
    const ds   = this.days();
    const bs   = this.bookings();
    const bls  = this.blocks();
    const cal  = this.calendarData();

    // Pre-compute midpoint, span and offset for each booking's visible range in this month
    const midDates     = new Map<string, string>();
    const bookingSpans = new Map<string, number>();
    const midOffsets   = new Map<string, number>();
    bs.forEach(b => {
      const visStart = ds.findIndex(d => d.date >= b.arrival && d.date <= b.departure);
      if (visStart < 0) return;
      let visEnd = visStart;
      for (let i = ds.length - 1; i >= visStart; i--) {
        if (ds[i].date >= b.arrival && ds[i].date <= b.departure) { visEnd = i; break; }
      }
      const midIdx = Math.round((visStart + visEnd) / 2);
      midDates.set(b.id, ds[midIdx].date);
      bookingSpans.set(b.id, visEnd - visStart + 1);
      midOffsets.set(b.id, midIdx - visStart);
    });

    return this.properties().map(prop => ({
      property: prop,
      cells: ds.map(d => {
        const cell: DayCell = { ...d };
        const propCal = cal[prop.id] ?? {};

        // Separate checkin, checkout and through-day lookups to handle split days
        const bookingCO  = bs.find(b => b.propertyId === prop.id && b.departure === d.date && b.arrival < d.date);
        const bookingCI  = bs.find(b => b.propertyId === prop.id && b.arrival === d.date);
        const bookingMid = (!bookingCO && !bookingCI)
          ? bs.find(b => b.propertyId === prop.id && b.arrival < d.date && b.departure > d.date)
          : undefined;

        if (bookingCO && bookingCI) {
          // Split day: left half = checkout color, right half = checkin color
          cell.bookingId            = bookingCI.id;
          cell.guestName            = bookingCI.guestName.trim() || 'Voyageur';
          cell.isFirstDay           = true;
          cell.isLastDay            = false;
          cell.channel              = bookingCI.channel;
          cell.splitCheckoutChannel = bookingCO.channel;
          cell.showName             = false;
        } else if (bookingCI) {
          cell.bookingId  = bookingCI.id;
          cell.guestName  = bookingCI.guestName.trim() || 'Voyageur';
          cell.isFirstDay = true;
          cell.isLastDay  = bookingCI.departure === d.date;
          cell.channel    = bookingCI.channel;
          if (midDates.get(bookingCI.id) === d.date) {
            cell.showName         = true;
            cell.bookingSpan      = bookingSpans.get(bookingCI.id) ?? 1;
            cell.bookingMidOffset = midOffsets.get(bookingCI.id) ?? 0;
          }
        } else if (bookingCO) {
          cell.bookingId  = bookingCO.id;
          cell.guestName  = bookingCO.guestName.trim() || 'Voyageur';
          cell.isFirstDay = false;
          cell.isLastDay  = true;
          cell.channel    = bookingCO.channel;
          if (midDates.get(bookingCO.id) === d.date) {
            cell.showName         = true;
            cell.bookingSpan      = bookingSpans.get(bookingCO.id) ?? 1;
            cell.bookingMidOffset = midOffsets.get(bookingCO.id) ?? 0;
          }
        } else if (bookingMid) {
          cell.bookingId  = bookingMid.id;
          cell.guestName  = bookingMid.guestName.trim() || 'Voyageur';
          cell.isFirstDay = false;
          cell.isLastDay  = false;
          cell.channel    = bookingMid.channel;
          if (midDates.get(bookingMid.id) === d.date) {
            cell.showName         = true;
            cell.bookingSpan      = bookingSpans.get(bookingMid.id) ?? 1;
            cell.bookingMidOffset = midOffsets.get(bookingMid.id) ?? 0;
          }
        }

        const block = bls.find(b =>
          b.propertyId === prop.id && b.startDate <= d.date && b.endDate >= d.date
        );
        if (block) {
          cell.blockId      = block.id;
          cell.blockType    = block.type;
          cell.blockNotes   = block.notes;
          cell.isBlockFirst = block.startDate === d.date;
          cell.isBlockLast  = block.endDate   === d.date;
        }

        const dayData = propCal[d.date];
        if (dayData) {
          if (dayData.price    != null) cell.price    = Number(dayData.price);
          if (dayData.minStay  != null) cell.minStay  = Number(dayData.minStay);
          if (dayData.override != null) cell.override = Number(dayData.override);
        }

        return cell;
      })
    }));
  }

}
