import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';

interface MonthStat { label: string; revenue: number; pct: number; key: string; }
interface ChannelStat { channel: string; revenue: number; count: number; pct: number; }

interface Stats {
  revenueThisMonth:  number;
  revenueLastMonth:  number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  propertiesCount:   number;
  monthlyRevenue:    MonthStat[];
  byChannel:         ChannelStat[];
}

const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', abritel: 'Abritel',
  direct: 'Direct', beds24: 'Beds24', '': 'Direct'
};
const CHANNEL_COLORS: Record<string, string> = {
  airbnb: '#FF5A5F', booking: '#003580', abritel: '#E8572A',
  direct: '#1976d2', beds24: '#607d8b', '': '#1976d2'
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <h2>{{ 'stats.title' | translate }}</h2>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else if (stats()) {

    <div class="kpi-grid">
      <mat-card class="kpi-card">
        <div class="kpi-icon" style="background:#e3f2fd"><mat-icon style="color:#1976d2">euro</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ stats()!.revenueThisMonth | currency:'EUR':'symbol':'1.0-0':'fr' }}</div>
          <div class="kpi-label">{{ 'stats.revenue_this_month' | translate }}</div>
          <div class="kpi-delta" [class.up]="delta('revenue') >= 0" [class.down]="delta('revenue') < 0">
            <mat-icon>{{ delta('revenue') >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
            {{ deltaStr('revenue') }} {{ 'stats.vs_last_month' | translate }}
          </div>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <div class="kpi-icon" style="background:#f3e5f5"><mat-icon style="color:#7b1fa2">book_online</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ stats()!.bookingsThisMonth }}</div>
          <div class="kpi-label">{{ 'stats.bookings_this_month' | translate }}</div>
          <div class="kpi-delta" [class.up]="delta('bookings') >= 0" [class.down]="delta('bookings') < 0">
            <mat-icon>{{ delta('bookings') >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
            {{ deltaStr('bookings') }} {{ 'stats.vs_last_month' | translate }}
          </div>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <div class="kpi-icon" style="background:#e8f5e9"><mat-icon style="color:#2e7d32">home</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ stats()!.propertiesCount }}</div>
          <div class="kpi-label">{{ 'stats.properties_active' | translate }}</div>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <div class="kpi-icon" style="background:#fff3e0"><mat-icon style="color:#e65100">payments</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ avgNightly() | currency:'EUR':'symbol':'1.0-0':'fr' }}</div>
          <div class="kpi-label">{{ 'stats.avg_per_booking' | translate }}</div>
        </div>
      </mat-card>
    </div>

    <div class="charts-row">

      <mat-card class="chart-card">
        <mat-card-header><mat-card-title>{{ 'stats.revenue_6_months' | translate }}</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="bar-chart">
            @for (m of stats()!.monthlyRevenue; track m.key) {
              <div class="bar-col">
                <div class="bar-val">{{ m.revenue > 0 ? (m.revenue | currency:'EUR':'symbol':'1.0-0':'fr') : '' }}</div>
                <div class="bar-wrap">
                  <div class="bar" [style.height.%]="m.pct || 2"
                       [class.current]="isCurrentMonth(m.key)"></div>
                </div>
                <div class="bar-label">{{ m.label }}</div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="chart-card">
        <mat-card-header><mat-card-title>{{ 'stats.by_channel_year' | translate:{ year: currentYear } }}</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (stats()!.byChannel.length === 0) {
            <p class="empty-chart">{{ 'stats.no_data_year' | translate }}</p>
          } @else {
            <div class="channel-list">
              @for (c of stats()!.byChannel; track c.channel) {
                <div class="channel-row">
                  <div class="channel-name">
                    <span class="dot" [style.background]="channelColor(c.channel)"></span>
                    {{ channelLabel(c.channel) }}
                  </div>
                  <div class="channel-bar-wrap">
                    <div class="channel-bar" [style.width.%]="c.pct"
                         [style.background]="channelColor(c.channel)"></div>
                  </div>
                  <div class="channel-stats">
                    {{ c.revenue | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    <span class="channel-count">({{ c.count }} {{ 'stats.bookings_abbr' | translate }})</span>
                  </div>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>

    </div>

    } <!-- end @if stats -->
  `,
  styles: [`
    h2 { margin: 0 0 24px; font-size: 24px; font-weight: 500; }
    .center { display: flex; justify-content: center; padding: 60px; }

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .kpi-icon { border-radius: 12px; padding: 12px; display: flex; }
    .kpi-icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .kpi-value { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .kpi-label { font-size: 13px; color: #666; margin: 4px 0; }
    .kpi-delta { display: flex; align-items: center; gap: 2px; font-size: 12px; }
    .kpi-delta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .kpi-delta.up { color: #2e7d32; }
    .kpi-delta.down { color: #c62828; }

    /* Charts row */
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-card mat-card-content { padding-top: 16px; }

    /* Bar chart */
    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; padding: 0 8px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-val { font-size: 10px; color: #555; text-align: center; min-height: 16px; }
    .bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; padding: 4px 4px 0; }
    .bar { width: 100%; background: #90caf9; border-radius: 4px 4px 0 0; min-height: 3px; transition: height 0.3s; }
    .bar.current { background: #1976d2; }
    .bar-label { font-size: 12px; color: #666; margin-top: 4px; text-transform: capitalize; }

    /* Channel bars */
    .channel-list { display: flex; flex-direction: column; gap: 14px; }
    .channel-row { display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: 12px; }
    .channel-name { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .channel-bar-wrap { height: 14px; background: #f5f5f5; border-radius: 7px; overflow: hidden; }
    .channel-bar { height: 100%; border-radius: 7px; min-width: 4px; transition: width 0.4s; }
    .channel-stats { font-size: 13px; font-weight: 500; white-space: nowrap; }
    .channel-count { color: #888; font-weight: 400; }
    .empty-chart { color: #888; text-align: center; padding: 32px; font-style: italic; }
  `]
})
export class StatsComponent implements OnInit {
  stats  = signal<Stats | null>(null);
  loading = signal(true);
  currentYear = new Date().getFullYear();
  private currentMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  })();

  constructor(private http: HttpClient, private t: TranslateService) {}

  ngOnInit(): void {
    this.http.get<Stats>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  delta(type: 'revenue' | 'bookings'): number {
    const s = this.stats()!;
    if (type === 'revenue') return s.revenueThisMonth - s.revenueLastMonth;
    return s.bookingsThisMonth - s.bookingsLastMonth;
  }

  deltaStr(type: 'revenue' | 'bookings'): string {
    const d = this.delta(type);
    if (type === 'revenue') return (d >= 0 ? '+' : '') + d.toFixed(0) + ' €';
    return (d >= 0 ? '+' : '') + d;
  }

  avgNightly(): number {
    const s = this.stats()!;
    if (!s.bookingsThisMonth) return 0;
    return s.revenueThisMonth / s.bookingsThisMonth;
  }

  isCurrentMonth(key: string): boolean { return key === this.currentMonthKey; }
  channelLabel(ch: string): string { return CHANNEL_LABELS[ch] ?? ch; }
  channelColor(ch: string): string { return CHANNEL_COLORS[ch] ?? '#607d8b'; }
}
