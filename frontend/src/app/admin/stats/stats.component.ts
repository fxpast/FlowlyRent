import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { ManualExpenseService, ManualExpense } from '../../core/services/manual-expense.service';
import { ManualRevenueService, ManualRevenue } from '../../core/services/manual-revenue.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';

interface RevenueData {
  year: number;
  month: number;
  monthLabel: string;
  caTotal: number;
  commissionTotal: number;
  nights: number;
  daysInMonth: number;
  occupancyRate: number;
  byProperty: { propId: string; propertyName: string; ca: number; nights: number; commission: number }[];
}

interface QontoSummary {
  totalDebits: number;
  totalCredits: number;
  byCategory: Record<string, number>;
  byProperty: Record<string, number>;
  transactionCount: number;
  uncategorized: number;
}

interface PropertyMargin {
  propId: string;
  propertyName: string;
  ca: number;
  expenses: number;
  qontoExpenses: number;
  hkExpenses: number;
  commission: number;
  manualExpenses: number;
  manualRevenues: number;
  margin: number;
  marginRate: number;
}

interface HousekeepingCosts {
  total: number;
  byProperty: Record<string, number>;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDividerModule,
    MatTabsModule, MatInputModule, MatFormFieldModule, MatCheckboxModule,
    MatSnackBarModule, TranslateModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h2>{{ 'stats.title' | translate }}</h2>
        <div class="nav-controls">
          <button mat-icon-button (click)="prevMonth()" [matTooltip]="'stats.prev_month' | translate">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <div class="month-selectors">
            <mat-select [(ngModel)]="selectedMonth" (selectionChange)="load()" class="month-sel">
              @for (m of months; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
            <mat-select [(ngModel)]="selectedYear" (selectionChange)="load()" class="year-sel">
              @for (y of years; track y) {
                <mat-option [value]="y">{{ y }}</mat-option>
              }
            </mat-select>
          </div>
          <button mat-icon-button (click)="nextMonth()" [disabled]="isCurrentMonth()"
                  [matTooltip]="'stats.next_month' | translate">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <mat-tab-group animationDuration="200ms">

        <mat-tab [label]="'stats.tab_stats' | translate">
          <div class="tab-content">
            @if (loading()) {
              <div class="center"><mat-spinner diameter="48" /></div>
            } @else if (error()) {
              <mat-card class="error-card">
                <mat-card-content>
                  <mat-icon class="error-icon">cloud_off</mat-icon>
                  <p>{{ error() }}</p>
                </mat-card-content>
              </mat-card>
            } @else if (data()) {
              @if (isIcal()) {
                <div class="ical-banner">
                  <mat-icon>info</mat-icon>
                  <span>{{ 'stats.ical_no_revenue' | translate }}</span>
                </div>
              }
              <div class="kpis">
                @if (!isIcal()) {
                  <mat-card class="kpi-card primary">
                    <mat-card-content>
                      <div class="kpi-label">{{ 'stats.ca_total' | translate }}</div>
                      <div class="kpi-value">{{ data()!.caTotal | number:'1.2-2' }} €</div>
                      <div class="kpi-sub">{{ data()!.monthLabel }} {{ data()!.year }}</div>
                    </mat-card-content>
                  </mat-card>
                }

                <mat-card class="kpi-card" [class.primary]="isIcal()">
                  <mat-card-content>
                    <div class="kpi-label">{{ 'stats.nights_sold' | translate }}</div>
                    <div class="kpi-value">{{ data()!.nights }}</div>
                    <div class="kpi-sub">/ {{ data()!.daysInMonth }} {{ 'stats.days' | translate }}</div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="kpi-card">
                  <mat-card-content>
                    <div class="kpi-label">{{ 'stats.occupancy' | translate }}</div>
                    <div class="kpi-value">{{ data()!.occupancyRate }} %</div>
                    @if (!isIcal()) {
                      <div class="kpi-sub">{{ 'stats.avg_per_night' | translate }} {{ avgPerNight() | number:'1.2-2' }} €</div>
                    }
                  </mat-card-content>
                </mat-card>

                @if (!isIcal()) {
                  <mat-card class="kpi-card" [class.margin-positive]="qontoData() !== null && marge >= 0"
                                             [class.margin-negative]="qontoData() !== null && marge < 0">
                    <mat-card-content>
                      <div class="kpi-label">{{ 'stats.margin' | translate }}</div>
                      @if (qontoData()) {
                        <div class="kpi-value" [class.value-positive]="marge >= 0" [class.value-negative]="marge < 0">
                          {{ marge | number:'1.2-2' }} €
                        </div>
                        <div class="kpi-sub">
                          {{ 'stats.expenses' | translate }} {{ qontoExpensesTotal | number:'1.2-2' }} €
                          @if (hkCostsTotal > 0) { + {{ 'stats.hk_costs' | translate }} {{ hkCostsTotal | number:'1.2-2' }} € }
                          @if (commissionTotal > 0) { + {{ 'stats.commission' | translate }} {{ commissionTotal | number:'1.2-2' }} € }
                          @if (manualExpensesTotal > 0) { + {{ 'stats.manual_expenses' | translate }} {{ manualExpensesTotal | number:'1.2-2' }} € }
                          @if (manualRevenuesTotal > 0) { + {{ 'stats.manual_revenues' | translate }} {{ manualRevenuesTotal | number:'1.2-2' }} € }
                          @if (data()!.caTotal > 0 || manualRevenuesTotal > 0) { · {{ margeRate | number:'1.0-0' }}% }
                        </div>
                      } @else {
                        <div class="kpi-value kpi-na">—</div>
                        <div class="kpi-sub">{{ 'stats.no_qonto' | translate }}</div>
                      }
                    </mat-card-content>
                  </mat-card>
                }
              </div>

              @if (data()!.byProperty.length > 0) {
                <mat-card class="prop-card">
                  <mat-card-header>
                    <mat-card-title>{{ 'stats.by_property' | translate }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="prop-list">
                      @for (p of data()!.byProperty; track p.propertyName) {
                        <div class="prop-row">
                          <div class="prop-name">{{ p.propertyName }}</div>
                          <div class="prop-bar-wrap">
                            <div class="prop-bar" [style.width]="barWidth(p.ca) + '%'"></div>
                          </div>
                          <div class="prop-nights">{{ p.nights }} {{ 'stats.nights_unit' | translate }}</div>
                          @if (!isIcal()) {
                            <div class="prop-ca">{{ p.ca | number:'1.2-2' }} €</div>
                          }
                        </div>
                      }
                    </div>
                    <mat-divider class="divider" />
                    <div class="prop-row total-row">
                      <div class="prop-name"><strong>Total</strong></div>
                      <div class="prop-bar-wrap"></div>
                      <div class="prop-nights"><strong>{{ data()!.nights }}</strong></div>
                      @if (!isIcal()) {
                        <div class="prop-ca"><strong>{{ data()!.caTotal | number:'1.2-2' }} €</strong></div>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              } @else {
                <div class="empty">{{ 'stats.no_data' | translate }}</div>
              }

              @if (qontoData() && propertyMargins().length > 0) {
                <mat-card class="prop-card">
                  <mat-card-header>
                    <mat-card-title>{{ 'stats.margin_by_property' | translate }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="margin-list">
                      @for (pm of propertyMargins(); track pm.propId) {
                        <div class="margin-item">
                          <div class="margin-row">
                            <div class="margin-name">{{ pm.propertyName }}</div>
                            <div class="margin-ca">{{ pm.ca | number:'1.0-0' }} €</div>
                            <div class="margin-exp">− {{ pm.expenses | number:'1.0-0' }} €</div>
                            <div class="margin-val" [class.value-positive]="pm.margin >= 0" [class.value-negative]="pm.margin < 0">
                              = {{ pm.margin | number:'1.0-0' }} € <span class="margin-pct">({{ propMarginRate(pm) }})</span>
                            </div>
                          </div>
                          @if (pm.expenses > 0) {
                            <div class="margin-detail">
                              @if (pm.qontoExpenses > 0) { <span>Qonto {{ pm.qontoExpenses | number:'1.0-0' }} €</span> }
                              @if (pm.hkExpenses > 0) { <span>{{ 'stats.hk_costs' | translate }} {{ pm.hkExpenses | number:'1.0-0' }} €</span> }
                              @if (pm.commission > 0) { <span>{{ 'stats.commission' | translate }} {{ pm.commission | number:'1.0-0' }} €</span> }
                              @if (pm.manualExpenses > 0) { <span>{{ 'stats.manual_expenses' | translate }} {{ pm.manualExpenses | number:'1.0-0' }} €</span> }
                              @if (pm.manualRevenues > 0) { <span class="value-positive">+ {{ 'stats.manual_revenues' | translate }} {{ pm.manualRevenues | number:'1.0-0' }} €</span> }
                            </div>
                          }
                        </div>
                      }
                    </div>
                    <div class="margin-note">{{ 'stats.margin_note' | translate }}</div>
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <mat-tab [label]="'expenses.manual_revenues' | translate">
          <div class="tab-content">
            <p class="rv-hint">{{ 'expenses.manual_revenues_hint' | translate }}</p>

            <div class="rv-header">
              <span></span>
              <button mat-flat-button color="primary" (click)="openManualRevenueForm()">
                <mat-icon>add</mat-icon> {{ 'expenses.new_manual_revenue' | translate }}
              </button>
            </div>

            @if (showManualRevenueForm()) {
              <mat-card class="rv-form-card">
                <mat-card-header>
                  <mat-card-title>{{ (editingManualRevenue()?.id ? 'expenses.edit_manual_revenue_title' : 'expenses.new_manual_revenue') | translate }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="rv-form">
                    <mat-form-field>
                      <mat-label>{{ 'expenses.manual_revenue_label' | translate }}</mat-label>
                      <input matInput [(ngModel)]="manualRevenueForm.label" />
                    </mat-form-field>
                    <mat-form-field>
                      <mat-label>{{ 'expenses.manual_revenue_amount' | translate }}</mat-label>
                      <input matInput type="number" step="0.01" [(ngModel)]="manualRevenueForm.amount" />
                    </mat-form-field>
                    <mat-form-field class="rv-form-full">
                      <mat-label>{{ 'expenses.rule_property' | translate }}</mat-label>
                      <mat-select [(ngModel)]="manualRevenueForm.beds24PropertyId">
                        <mat-option value="">{{ 'expenses.rule_property_none' | translate }}</mat-option>
                        @for (p of properties(); track p.id) {
                          <mat-option [value]="p.id">{{ p.name }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>{{ 'expenses.manual_revenue_property_hint' | translate }}</mat-hint>
                    </mat-form-field>
                    <mat-checkbox [(ngModel)]="manualRevenueForm.recurring">
                      {{ 'expenses.manual_revenue_recurring' | translate }}
                    </mat-checkbox>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-flat-button color="primary" (click)="saveManualRevenue()" [disabled]="savingManualRevenue()">
                    @if (savingManualRevenue()) { <mat-spinner diameter="18" /> } @else { {{ 'common.save' | translate }} }
                  </button>
                  <button mat-stroked-button (click)="cancelManualRevenueForm()" style="margin-left:8px">{{ 'common.cancel' | translate }}</button>
                </mat-card-actions>
              </mat-card>
            }

            @if (manualRevenues().length === 0) {
              <div class="empty">{{ 'expenses.no_manual_revenues' | translate }}</div>
            } @else {
              <div class="rv-list">
                @for (revenue of manualRevenues(); track revenue.id) {
                  <div class="rv-row">
                    <div class="rv-info">
                      <strong>{{ revenue.label }}</strong>
                      @if (revenue.beds24PropertyId) {
                        <span class="rv-prop-chip">{{ propertyName(revenue.beds24PropertyId) }}</span>
                      }
                      @if (revenue.recurring) {
                        <span class="rv-recur-chip">{{ 'expenses.recurring_badge' | translate }}</span>
                      }
                    </div>
                    <div class="rv-amount">{{ revenue.amount | number:'1.2-2' }} €</div>
                    <div class="rv-actions">
                      <button mat-icon-button (click)="editManualRevenue(revenue)" [matTooltip]="'common.edit' | translate">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteManualRevenue(revenue)" [matTooltip]="'common.delete' | translate">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
                <div class="rv-row rv-total-row">
                  <div class="rv-info"><strong>{{ 'expenses.manual_revenues_total' | translate }}</strong></div>
                  <div class="rv-amount"><strong>{{ manualRevenuesTotal | number:'1.2-2' }} €</strong></div>
                  <div class="rv-actions"></div>
                </div>
              </div>
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; font-size: 24px; font-weight: 700; }

    .nav-controls { display: flex; align-items: center; gap: 4px; }
    .month-selectors { display: flex; gap: 8px; }
    .month-sel { width: 130px; }
    .year-sel  { width: 90px; }

    .center { display: flex; justify-content: center; padding: 60px; }

    .error-card { max-width: 460px; margin-top: 24px; text-align: center; }
    .error-icon { font-size: 40px; width: 40px; height: 40px; color: #999; margin-bottom: 8px; }

    .kpis { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .kpi-card { flex: 1; min-width: 180px; }
    .kpi-card.primary { border-left: 4px solid #0288d1; }
    .kpi-card.margin-positive { border-left: 4px solid #4caf50; }
    .kpi-card.margin-negative { border-left: 4px solid #f44336; }
    .value-positive { color: #2e7d32 !important; }
    .value-negative { color: #c62828 !important; }
    .kpi-na { color: #bbb !important; }
    .kpi-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 28px; font-weight: 700; margin: 6px 0 2px; color: #111; }
    .kpi-sub   { font-size: 13px; color: #777; }

    .prop-card { margin-bottom: 16px; }
    .prop-list { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .prop-row { display: flex; align-items: center; gap: 12px; }
    .prop-name { width: 160px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .prop-bar-wrap { flex: 1; background: #f0f0f0; border-radius: 4px; height: 10px; overflow: hidden; }
    .prop-bar { height: 100%; background: #0288d1; border-radius: 4px; transition: width 0.4s ease; min-width: 4px; }
    .prop-nights { width: 80px; text-align: right; font-size: 13px; color: #666; flex-shrink: 0; }
    .prop-ca { width: 110px; text-align: right; font-size: 14px; font-weight: 600; color: #111; flex-shrink: 0; }
    .divider { margin: 12px 0 8px; }
    .total-row { margin-top: 4px; }

    .ical-banner { display: flex; align-items: center; gap: 10px; background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px; color: #795548; }
    .ical-banner mat-icon { color: #f9a825; font-size: 20px; height: 20px; width: 20px; flex-shrink: 0; }
    .empty { text-align: center; color: #999; padding: 48px 0; font-size: 15px; }

    .margin-list { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
    .margin-item { display: flex; flex-direction: column; gap: 2px; }
    .margin-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .margin-name { width: 160px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .margin-ca  { width: 90px; text-align: right; font-size: 13px; color: #555; flex-shrink: 0; }
    .margin-exp { width: 90px; text-align: right; font-size: 13px; color: #888; flex-shrink: 0; }
    .margin-val { flex: 1; text-align: right; font-size: 14px; font-weight: 600; flex-shrink: 0; }
    .margin-pct { font-size: 12px; font-weight: 400; opacity: 0.75; }
    .margin-detail { display: flex; gap: 12px; flex-wrap: wrap; padding-left: 168px; font-size: 11px; color: #999; }
    .margin-note { font-size: 11px; color: #aaa; margin-top: 12px; font-style: italic; }

    .tab-content { padding: 20px 0; }

    /* Revenus manuels tab */
    .rv-hint { margin: 0 0 16px; font-size: 13px; color: #666; max-width: 600px; }
    .rv-header { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .rv-form-card { margin-bottom: 20px; max-width: 700px; }
    .rv-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    .rv-form mat-form-field { width: 200px; }
    .rv-form-full { width: 100% !important; }
    .rv-list { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; max-width: 700px; }
    .rv-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; background: white; }
    .rv-row:last-child { border-bottom: none; }
    .rv-total-row { background: #fafafa; }
    .rv-info { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14px; }
    .rv-amount { width: 100px; text-align: right; font-size: 14px; font-weight: 500; flex-shrink: 0; }
    .rv-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .rv-prop-chip { background: #e3f2fd; color: #1565c0; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 500; }
    .rv-recur-chip { background: #f3e5f5; color: #7b1fa2; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 500; }

    @media (max-width: 600px) {
      .page { padding: 16px; }
      .kpis { flex-direction: column; }
      .prop-name { width: 110px; font-size: 13px; }
      .prop-nights { display: none; }
      .month-sel { width: 110px; }
      .margin-name { width: 110px; font-size: 13px; }
      .margin-detail { padding-left: 0; }
    }
  `]
})
export class StatsComponent implements OnInit {
  data           = signal<RevenueData | null>(null);
  qontoData      = signal<QontoSummary | null>(null);
  hkCosts        = signal<HousekeepingCosts | null>(null);
  manualExpenses = signal<ManualExpense[]>([]);
  manualRevenues = signal<ManualRevenue[]>([]);
  loading        = signal(false);
  error          = signal('');

  properties            = signal<{ id: string; name: string }[]>([]);
  showManualRevenueForm = signal(false);
  editingManualRevenue  = signal<ManualRevenue | null>(null);
  savingManualRevenue   = signal(false);
  manualRevenueForm     = { label: '', amount: 0, beds24PropertyId: '', recurring: false };

  selectedYear  = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  years  = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);
  months: { value: number; label: string }[] = [];

  constructor(
    private http: HttpClient,
    private t: TranslateService,
    private manualExpenseService: ManualExpenseService,
    private manualRevenueService: ManualRevenueService,
    private bookingService: BookingService,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  isIcal(): boolean { return this.auth.isIcal(); }

  ngOnInit(): void {
    this.buildMonths();
    this.load();
    this.loadProperties();
  }

  private buildMonths(): void {
    this.months = Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2000, i, 1).toLocaleDateString(this.t.currentLang || 'fr', { month: 'long' })
    }));
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.data.set(null);
    this.qontoData.set(null);
    this.hkCosts.set(null);
    this.manualExpenses.set([]);
    this.manualRevenues.set([]);

    this.http.get<RevenueData>(
      `${environment.apiUrl}/admin/stats/revenue?year=${this.selectedYear}&month=${this.selectedMonth}`
    ).subscribe({
      next: d  => { this.data.set(d);  this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.error || this.t.instant('stats.load_error'));
        this.loading.set(false);
      }
    });

    this.http.get<QontoSummary>(
      `${environment.apiUrl}/admin/qonto/summary?year=${this.selectedYear}&month=${this.selectedMonth}`
    ).pipe(catchError(() => of(null)))
    .subscribe(q => this.qontoData.set(q));

    this.http.get<HousekeepingCosts>(
      `${environment.apiUrl}/admin/stats/housekeeping-costs?year=${this.selectedYear}&month=${this.selectedMonth}`
    ).pipe(catchError(() => of(null)))
    .subscribe(c => this.hkCosts.set(c));

    this.manualExpenseService.list(this.selectedYear, this.selectedMonth)
      .pipe(catchError(() => of([])))
      .subscribe(e => this.manualExpenses.set(e));

    this.manualRevenueService.list(this.selectedYear, this.selectedMonth)
      .pipe(catchError(() => of([])))
      .subscribe(r => this.manualRevenues.set(r));
  }

  prevMonth(): void {
    if (this.selectedMonth === 1) { this.selectedMonth = 12; this.selectedYear--; }
    else this.selectedMonth--;
    this.load();
  }

  nextMonth(): void {
    if (this.selectedMonth === 12) { this.selectedMonth = 1; this.selectedYear++; }
    else this.selectedMonth++;
    this.load();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.selectedYear === now.getFullYear() && this.selectedMonth === (now.getMonth() + 1);
  }

  avgPerNight(): number {
    const d = this.data();
    if (!d || d.nights === 0) return 0;
    return d.caTotal / d.nights;
  }

  get hkCostsTotal(): number {
    return Number(this.hkCosts()?.total ?? 0);
  }

  get commissionTotal(): number {
    return Number(this.data()?.commissionTotal ?? 0);
  }

  get manualExpensesTotal(): number {
    return this.manualExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);
  }

  get manualRevenuesTotal(): number {
    return this.manualRevenues().reduce((s, r) => s + Number(r.amount || 0), 0);
  }

  // Dépenses Qonto catégorisées uniquement (les transactions NON_CATEGORISE
  // ne sont pas encore validées comme charges et ne doivent pas impacter la marge)
  get qontoExpensesTotal(): number {
    const q = this.qontoData();
    if (!q) return 0;
    const nonCategorise = Number(q.byCategory?.['NON_CATEGORISE'] ?? 0);
    return Math.round((Number(q.totalDebits) - nonCategorise) * 100) / 100;
  }

  get marge(): number {
    const d = this.data();
    const q = this.qontoData();
    if (!d || !q) return 0;
    return Math.round((d.caTotal + this.manualRevenuesTotal - this.qontoExpensesTotal - this.hkCostsTotal - this.commissionTotal - this.manualExpensesTotal) * 100) / 100;
  }

  get margeRate(): number {
    const d = this.data();
    if (!d) return 0;
    const totalCA = d.caTotal + this.manualRevenuesTotal;
    if (totalCA === 0) return 0;
    return Math.round((this.marge / totalCA) * 10000) / 100;
  }

  propertyMargins(): PropertyMargin[] {
    const d = this.data();
    const q = this.qontoData();
    if (!d || !q) return [];
    const hk = this.hkCosts();
    return d.byProperty.map(p => {
      const qontoExpenses = Math.round(Number(q.byProperty?.[p.propId] ?? 0) * 100) / 100;
      const hkExpenses = Math.round(Number(hk?.byProperty?.[p.propId] ?? 0) * 100) / 100;
      const commission = Math.round(Number(p.commission ?? 0) * 100) / 100;
      const manualExpenses = Math.round(
        this.manualExpenses()
          .filter(e => e.beds24PropertyId === p.propId)
          .reduce((s, e) => s + Number(e.amount || 0), 0) * 100
      ) / 100;
      const manualRevenues = Math.round(
        this.manualRevenues()
          .filter(r => r.beds24PropertyId === p.propId)
          .reduce((s, r) => s + Number(r.amount || 0), 0) * 100
      ) / 100;
      const expenses = Math.round((qontoExpenses + hkExpenses + commission + manualExpenses) * 100) / 100;
      const effectiveCA = Math.round((p.ca + manualRevenues) * 100) / 100;
      const margin = Math.round((effectiveCA - expenses) * 100) / 100;
      const marginRate = effectiveCA > 0 ? margin / effectiveCA : -Infinity;
      return {
        propId:       p.propId,
        propertyName: p.propertyName,
        ca:           p.ca,
        expenses,
        qontoExpenses,
        hkExpenses,
        commission,
        manualExpenses,
        manualRevenues,
        margin,
        marginRate
      };
    }).sort((a, b) => b.marginRate - a.marginRate);
  }

  propMarginRate(pm: PropertyMargin): string {
    if (pm.ca <= 0) return '—';
    return Math.round(pm.margin / pm.ca * 100) + '%';
  }

  barWidth(ca: number): number {
    const d = this.data();
    if (!d || d.caTotal === 0) return 0;
    return (ca / d.caTotal) * 100;
  }

  private loadProperties(): void {
    this.bookingService.getPropertiesWithDisplayNames().subscribe(props => {
      this.properties.set((props ?? []).map((p: Record<string, unknown>) => ({
        id: String(p['id'] ?? p['propId'] ?? ''),
        name: String(p['name'] || '')
      })).filter((p: { id: string; name: string }) => p.id));
    });
  }

  propertyName(propId: string): string {
    return this.properties().find(p => p.id === propId)?.name || propId;
  }

  openManualRevenueForm(): void {
    this.editingManualRevenue.set(null);
    this.manualRevenueForm = { label: '', amount: 0, beds24PropertyId: '', recurring: false };
    this.showManualRevenueForm.set(true);
  }

  editManualRevenue(revenue: ManualRevenue): void {
    this.editingManualRevenue.set(revenue);
    this.manualRevenueForm = {
      label: revenue.label,
      amount: revenue.amount,
      beds24PropertyId: revenue.beds24PropertyId || '',
      recurring: revenue.recurring
    };
    this.showManualRevenueForm.set(true);
  }

  cancelManualRevenueForm(): void {
    this.showManualRevenueForm.set(false);
    this.editingManualRevenue.set(null);
  }

  saveManualRevenue(): void {
    if (!this.manualRevenueForm.label.trim() || !this.manualRevenueForm.amount) return;
    this.savingManualRevenue.set(true);
    const editing = this.editingManualRevenue();
    const payload = {
      label: this.manualRevenueForm.label.trim(),
      amount: this.manualRevenueForm.amount,
      beds24PropertyId: this.manualRevenueForm.beds24PropertyId || undefined,
      year: this.selectedYear,
      month: this.selectedMonth,
      recurring: this.manualRevenueForm.recurring
    };
    const req = editing
      ? this.manualRevenueService.update(editing.id, payload)
      : this.manualRevenueService.create(payload);
    req.subscribe({
      next: () => {
        this.savingManualRevenue.set(false);
        this.showManualRevenueForm.set(false);
        this.manualRevenueService.list(this.selectedYear, this.selectedMonth)
          .pipe(catchError(() => of([])))
          .subscribe(r => this.manualRevenues.set(r));
        this.snack.open(this.t.instant('expenses.manual_revenue_saved'), '', { duration: 2000 });
      },
      error: () => this.savingManualRevenue.set(false)
    });
  }

  deleteManualRevenue(revenue: ManualRevenue): void {
    if (!confirm(this.t.instant('expenses.delete_manual_revenue_confirm') + ' "' + revenue.label + '" ?')) return;
    this.manualRevenueService.delete(revenue.id).subscribe(() => {
      this.manualRevenues.set(this.manualRevenues().filter(r => r.id !== revenue.id));
      this.snack.open(this.t.instant('expenses.manual_revenue_deleted'), '', { duration: 2000 });
    });
  }
}
