import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DynamicPricingService, PricingZone, PricingZonePeriod, PropertyPricingConfig, PricingSuggestion, LocalEvent } from '../../core/services/dynamic-pricing.service';
import { BookingService } from '../../core/services/booking.service';
import { PriceDialogComponent, PriceDialogResult } from '../price-dialog/price-dialog.component';
import { environment } from '../../../environments/environment';

const MONTHS = [
  { v: 1, l: 'Jan' }, { v: 2, l: 'Fév' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Avr' },
  { v: 5, l: 'Mai' }, { v: 6, l: 'Jun' }, { v: 7, l: 'Jul' }, { v: 8, l: 'Aoû' },
  { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Déc' }
];

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

@Component({
  selector: 'app-dynamic-pricing',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, MatDividerModule, MatChipsModule, MatDialogModule,
    MatDatepickerModule, MatNativeDateModule, TranslateModule
  ],
  template: `
    <div class="page-header">
      <mat-icon class="page-icon">trending_up</mat-icon>
      <h1>{{ 'pricing.title' | translate }}</h1>
    </div>

    <mat-tab-group animationDuration="200ms">

      <!-- ── TAB 1 : ANALYSE ─────────────────────────────────────────── -->
      <mat-tab [label]="'pricing.tab_analysis' | translate">
        <div class="tab-content">
          <mat-card class="analysis-form-card">
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>{{ 'pricing.select_property' | translate }}</mat-label>
                  <mat-select [(ngModel)]="selectedPropId">
                    @for (p of properties(); track p.id) {
                      <mat-option [value]="p.id">{{ p.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'pricing.start_date' | translate }}</mat-label>
                  <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDateVal"
                         (ngModelChange)="onStartDateChange($event)" [min]="todayDate">
                  <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'pricing.end_date' | translate }}</mat-label>
                  <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDateVal"
                         (ngModelChange)="onEndDateChange($event)" [min]="startDateVal ?? todayDate">
                  <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>
                <button mat-raised-button color="primary" (click)="analyze()"
                        [disabled]="!selectedPropId || !startDate || !endDate || loading()">
                  @if (loading()) { <mat-spinner diameter="18"></mat-spinner> }
                  @else { <mat-icon>search</mat-icon> }
                  {{ 'pricing.analyze' | translate }}
                </button>
              </div>
            </mat-card-content>
          </mat-card>

          @if (suggestion()) {
            <div class="result-grid">
              <!-- Carte alerte -->
              <mat-card class="alert-card" [class.underpriced]="suggestion()!.alert === 'underpriced'"
                        [class.overpriced]="suggestion()!.alert === 'overpriced'"
                        [class.ok]="suggestion()!.alert === 'ok'"
                        [class.no-data]="suggestion()!.alert === 'no_data'">
                <mat-card-content>
                  <div class="alert-header">
                    <mat-icon class="alert-icon">
                      {{ suggestion()!.alert === 'underpriced' ? 'trending_down'
                       : suggestion()!.alert === 'overpriced' ? 'trending_up'
                       : suggestion()!.alert === 'ok' ? 'check_circle'
                       : 'info' }}
                    </mat-icon>
                    <div class="alert-text">
                      <div class="alert-title">
                        {{ ('pricing.alert_' + suggestion()!.alert) | translate }}
                      </div>
                      @if (suggestion()!.currentPrice) {
                        <div class="current-price-row">
                          <span class="label">{{ 'pricing.current_price' | translate }}</span>
                          <span class="value">{{ suggestion()!.currentPrice | number:'1.2-2' }}€/nuit</span>
                          @if (suggestion()!.alert === 'underpriced') {
                            <mat-chip class="chip-warn">⚠️</mat-chip>
                          }
                        </div>
                      }
                      @if (suggestion()!.suggestedMin) {
                        <div class="range-row">
                          <span class="label">{{ 'pricing.suggested_range' | translate }}</span>
                          <span class="value range">{{ suggestion()!.suggestedMin }}€ – {{ suggestion()!.suggestedMax }}€/nuit</span>
                        </div>
                      }
                    </div>
                  </div>
                  @if (suggestion()!.alert === 'underpriced') {
                    <div class="under-msg">
                      → {{ 'pricing.underpriced_hint' | translate }}
                      {{ undervaluedPercent() }}%
                      {{ 'pricing.for_this_period' | translate }}
                    </div>
                  }
                  @if (suggestion()!.suggestedMin) {
                    <div class="action-row">
                      <button mat-stroked-button (click)="suggestion.set(null)">
                        {{ 'pricing.ignore' | translate }}
                      </button>
                      <button mat-raised-button color="primary" (click)="openAdjust()">
                        <mat-icon>edit</mat-icon>
                        {{ 'pricing.adjust_price' | translate }}
                      </button>
                    </div>
                  }
                </mat-card-content>
              </mat-card>

              <!-- Carte détail calcul -->
              <mat-card class="detail-card">
                <mat-card-header>
                  <mat-card-title>{{ 'pricing.calculation_detail' | translate }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="detail-row">
                    <span>{{ 'pricing.base_price' | translate }}</span>
                    <strong>{{ suggestion()!.basePrice ? suggestion()!.basePrice + '€' : '—' }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ 'pricing.season' | translate }}</span>
                    <strong>
                      {{ suggestion()!.seasonName || ('pricing.no_season' | translate) }}
                      @if (suggestion()!.seasonalAdjustmentPercent !== 0) {
                        <span class="adj" [class.pos]="suggestion()!.seasonalAdjustmentPercent > 0">
                          ({{ suggestion()!.seasonalAdjustmentPercent > 0 ? '+' : '' }}{{ suggestion()!.seasonalAdjustmentPercent }}%)
                        </span>
                      }
                    </strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ 'pricing.occupancy' | translate }}</span>
                    <strong>
                      {{ (suggestion()!.occupancyRate * 100).toFixed(0) }}%
                      <span class="adj" [class.pos]="suggestion()!.occupancyAdjustmentPercent > 0">
                        ({{ suggestion()!.occupancyAdjustmentPercent > 0 ? '+' : '' }}{{ suggestion()!.occupancyAdjustmentPercent }}%)
                      </span>
                    </strong>
                  </div>
                  @if (suggestion()!.eventName) {
                    <div class="detail-row">
                      <span>{{ 'pricing.local_event' | translate }}</span>
                      <strong>
                        {{ suggestion()!.eventName }}
                        <span class="adj pos">(+{{ suggestion()!.eventAdjustmentPercent }}%)</span>
                      </strong>
                    </div>
                  }
                  @if (suggestion()!.marketMin || suggestion()!.marketMax) {
                    <div class="detail-row">
                      <span>{{ 'pricing.market_range' | translate }}</span>
                      <strong>{{ suggestion()!.marketMin || '—' }}€ – {{ suggestion()!.marketMax || '—' }}€</strong>
                    </div>
                  }
                  <mat-divider class="divider"></mat-divider>
                  <div class="detail-row small">
                    <span>{{ 'pricing.data_points' | translate }}</span>
                    <span>{{ suggestion()!.historicalBookingsCount }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          }

          @if (!suggestion() && !loading()) {
            <div class="empty-hint">
              <mat-icon>insights</mat-icon>
              <p>{{ 'pricing.no_results' | translate }}</p>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ── TAB 2 : ZONES & SAISONS ────────────────────────────────── -->
      <mat-tab [label]="'pricing.tab_zones' | translate">
        <div class="tab-content">
          <div class="zones-header">
            <p class="zones-desc">{{ 'pricing.zones_desc' | translate }}</p>
            <button mat-raised-button color="primary" (click)="startNewZone()">
              <mat-icon>add</mat-icon> {{ 'pricing.add_zone' | translate }}
            </button>
          </div>

          @if (showZoneForm()) {
            <mat-card class="zone-form-card">
              <mat-card-content>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ 'pricing.zone_name' | translate }}</mat-label>
                  <input matInput [(ngModel)]="zoneForm.name" placeholder="Ex: Côte d'Azur">
                </mat-form-field>

                <div class="periods-section">
                  <div class="periods-title">{{ 'pricing.periods' | translate }}</div>
                  @for (p of zoneForm.periods; track $index) {
                    <div class="period-row">
                      <mat-form-field appearance="outline" class="period-name">
                        <mat-label>{{ 'pricing.period_name' | translate }}</mat-label>
                        <input matInput [(ngModel)]="p.name" placeholder="Ex: Haute saison">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="period-month">
                        <mat-label>{{ 'pricing.period_start_month' | translate }}</mat-label>
                        <mat-select [(ngModel)]="p.startMonth">
                          @for (m of months; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="period-day">
                        <mat-label>{{ 'pricing.period_start_day' | translate }}</mat-label>
                        <input matInput type="number" min="1" max="31" [(ngModel)]="p.startDay">
                      </mat-form-field>
                      <span class="arrow">→</span>
                      <mat-form-field appearance="outline" class="period-month">
                        <mat-label>{{ 'pricing.period_end_month' | translate }}</mat-label>
                        <mat-select [(ngModel)]="p.endMonth">
                          @for (m of months; track m.v) { <mat-option [value]="m.v">{{ m.l }}</mat-option> }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="period-day">
                        <mat-label>{{ 'pricing.period_end_day' | translate }}</mat-label>
                        <input matInput type="number" min="1" max="31" [(ngModel)]="p.endDay">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="period-adj">
                        <mat-label>{{ 'pricing.period_adj' | translate }}</mat-label>
                        <input matInput type="number" [(ngModel)]="p.adjustmentPercent">
                        <span matSuffix>%</span>
                      </mat-form-field>
                      <button mat-icon-button color="warn" (click)="removePeriod($index)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  }
                  <button mat-stroked-button (click)="addPeriod()" class="add-period-btn">
                    <mat-icon>add</mat-icon> {{ 'pricing.add_period' | translate }}
                  </button>
                </div>

                <div class="form-actions">
                  <button mat-button (click)="cancelZoneForm()">{{ 'common.cancel' | translate }}</button>
                  <button mat-raised-button color="primary" (click)="saveZone()"
                          [disabled]="!zoneForm.name || savingZone()">
                    {{ 'common.save' | translate }}
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }

          <div class="zones-list">
            @for (zone of zones(); track zone.id) {
              <mat-card class="zone-card">
                <mat-card-header>
                  <mat-card-title>{{ zone.name }}</mat-card-title>
                  <div class="zone-actions">
                    <button mat-icon-button (click)="editZone(zone)"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn" (click)="deleteZone(zone)"><mat-icon>delete</mat-icon></button>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  @if (zone.periods.length === 0) {
                    <p class="no-periods">{{ 'pricing.no_periods' | translate }}</p>
                  }
                  @for (p of zone.periods; track p.id) {
                    <div class="period-chip-row">
                      <span class="period-badge" [class.positive]="p.adjustmentPercent > 0"
                            [class.negative]="p.adjustmentPercent < 0">
                        {{ p.name }}
                        ({{ monthLabel(p.startMonth) }} {{ p.startDay }} → {{ monthLabel(p.endMonth) }} {{ p.endDay }})
                        {{ p.adjustmentPercent > 0 ? '+' : '' }}{{ p.adjustmentPercent }}%
                      </span>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>

          <!-- ── ÉVÉNEMENTS LOCAUX ──────────────────────────────────── -->
          <div class="events-section">
            <div class="events-header">
              <h3 class="events-title">
                <mat-icon>event</mat-icon> {{ 'pricing.local_events' | translate }}
              </h3>
              <button mat-raised-button color="accent" (click)="startNewEvent()">
                <mat-icon>add</mat-icon> {{ 'pricing.add_event' | translate }}
              </button>
            </div>

            @if (showEventForm()) {
              <mat-card class="event-form-card">
                <mat-card-content>
                  <div class="event-form-grid">
                    <mat-form-field appearance="outline" class="ef-name">
                      <mat-label>{{ 'pricing.event_name' | translate }}</mat-label>
                      <input matInput [(ngModel)]="eventForm.name" placeholder="Ex: Festival du Vieux-Port">
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="ef-zone">
                      <mat-label>{{ 'pricing.zone' | translate }}</mat-label>
                      <mat-select [(ngModel)]="eventForm.zoneId">
                        <mat-option [value]="null">{{ 'pricing.no_zone_assigned' | translate }}</mat-option>
                        @for (z of zones(); track z.id) {
                          <mat-option [value]="z.id">{{ z.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="ef-date">
                      <mat-label>{{ 'pricing.start_date' | translate }}</mat-label>
                      <input matInput [matDatepicker]="evtStart" [(ngModel)]="eventForm.startDateVal"
                             (ngModelChange)="onEvtStartChange($event)">
                      <mat-datepicker-toggle matIconSuffix [for]="evtStart"></mat-datepicker-toggle>
                      <mat-datepicker #evtStart></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="ef-date">
                      <mat-label>{{ 'pricing.end_date' | translate }}</mat-label>
                      <input matInput [matDatepicker]="evtEnd" [(ngModel)]="eventForm.endDateVal"
                             (ngModelChange)="onEvtEndChange($event)">
                      <mat-datepicker-toggle matIconSuffix [for]="evtEnd"></mat-datepicker-toggle>
                      <mat-datepicker #evtEnd></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="ef-impact">
                      <mat-label>{{ 'pricing.impact_level' | translate }}</mat-label>
                      <mat-select [(ngModel)]="eventForm.impactLevel">
                        <mat-option value="FAIBLE">{{ 'pricing.impact_faible' | translate }}</mat-option>
                        <mat-option value="MOYEN">{{ 'pricing.impact_moyen' | translate }}</mat-option>
                        <mat-option value="FORT">{{ 'pricing.impact_fort' | translate }}</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-checkbox [(ngModel)]="eventForm.recurring" class="ef-recurring">
                      {{ 'pricing.recurring_event' | translate }}
                    </mat-checkbox>
                  </div>

                  <div class="form-actions">
                    <button mat-button (click)="cancelEventForm()">{{ 'common.cancel' | translate }}</button>
                    <button mat-raised-button color="primary" (click)="saveEvent()"
                            [disabled]="!eventForm.name || !eventForm.startDate || !eventForm.endDate || savingEvent()">
                      {{ 'common.save' | translate }}
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            }

            <div class="events-list">
              @for (evt of events(); track evt.id) {
                <div class="event-row">
                  <div class="event-impact" [class.impact-faible]="evt.impactLevel === 'FAIBLE'"
                       [class.impact-moyen]="evt.impactLevel === 'MOYEN'"
                       [class.impact-fort]="evt.impactLevel === 'FORT'">
                    {{ evt.impactLevel }}
                  </div>
                  <div class="event-info">
                    <span class="event-name">{{ evt.name }}</span>
                    @if (evt.recurring) { <mat-icon class="event-recurring-icon" matTooltip="{{ 'pricing.recurring_event' | translate }}">repeat</mat-icon> }
                    <span class="event-dates">{{ evt.startDate }} → {{ evt.endDate }}</span>
                    @if (evt.zoneId) {
                      <span class="event-zone">{{ zoneNameById(evt.zoneId) }}</span>
                    }
                  </div>
                  <div class="event-actions">
                    <button mat-icon-button (click)="editEvent(evt)"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn" (click)="deleteEvent(evt)"><mat-icon>delete</mat-icon></button>
                  </div>
                </div>
              }
              @if (events().length === 0 && !showEventForm()) {
                <p class="no-events">{{ 'pricing.no_events' | translate }}</p>
              }
            </div>
          </div>

        </div>
      </mat-tab>

      <!-- ── TAB 3 : CONFIGURATION PAR LOGEMENT ─────────────────────── -->
      <mat-tab [label]="'pricing.tab_config' | translate">
        <div class="tab-content">
          <p class="config-desc">{{ 'pricing.config_desc' | translate }}</p>
          <div class="config-list">
            @for (p of properties(); track p.id) {
              <mat-card class="config-card">
                <mat-card-content>
                  <div class="config-prop-name">{{ p.name }}</div>
                  <div class="config-row">
                    <mat-form-field appearance="outline" class="config-zone">
                      <mat-label>{{ 'pricing.zone' | translate }}</mat-label>
                      <mat-select [(ngModel)]="configFor(p.id).zoneId">
                        <mat-option [value]="null">{{ 'pricing.no_zone_assigned' | translate }}</mat-option>
                        @for (z of zones(); track z.id) {
                          <mat-option [value]="z.id">{{ z.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="config-price">
                      <mat-label>{{ 'pricing.market_min' | translate }}</mat-label>
                      <input matInput type="number" [(ngModel)]="configFor(p.id).marketMin" min="0">
                      <span matSuffix>€</span>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="config-price">
                      <mat-label>{{ 'pricing.market_max' | translate }}</mat-label>
                      <input matInput type="number" [(ngModel)]="configFor(p.id).marketMax" min="0">
                      <span matSuffix>€</span>
                    </mat-form-field>
                    <button mat-raised-button color="primary" (click)="saveConfig(p.id)"
                            [disabled]="savingConfig() === p.id">
                      @if (savingConfig() === p.id) { <mat-spinner diameter="18"></mat-spinner> }
                      @else { <mat-icon>save</mat-icon> }
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .page-icon { font-size: 28px; width: 28px; height: 28px; color: #0288d1; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .tab-content { padding: 24px 0; }

    /* ── Analyse ── */
    .analysis-form-card { margin-bottom: 24px; }
    .form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .form-row .wide { flex: 2; min-width: 200px; }
    .form-row mat-form-field { flex: 1; min-width: 140px; }
    .form-row button { height: 56px; white-space: nowrap; }
    .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .result-grid { grid-template-columns: 1fr; } }

    .alert-card { border-left: 5px solid #ccc; }
    .alert-card.underpriced { border-left-color: #f57c00; background: #fff8f0; }
    .alert-card.overpriced { border-left-color: #e53935; background: #fff5f5; }
    .alert-card.ok { border-left-color: #43a047; background: #f5fff7; }
    .alert-card.no-data { border-left-color: #9e9e9e; }

    .alert-header { display: flex; gap: 16px; align-items: flex-start; }
    .alert-icon { font-size: 36px; width: 36px; height: 36px; margin-top: 4px; }
    .underpriced .alert-icon { color: #f57c00; }
    .overpriced .alert-icon { color: #e53935; }
    .ok .alert-icon { color: #43a047; }

    .alert-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .current-price-row, .range-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; }
    .label { color: #666; }
    .value { font-weight: 600; font-size: 16px; }
    .value.range { color: #0288d1; }
    .chip-warn { background: transparent !important; font-size: 18px; }
    .under-msg { margin-top: 12px; font-size: 13px; color: #f57c00; font-style: italic; }
    .action-row { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }

    .detail-card mat-card-content { padding-top: 8px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; }
    .detail-row.small { font-size: 12px; color: #888; }
    .adj { font-size: 12px; margin-left: 4px; color: #e53935; }
    .adj.pos { color: #43a047; }
    .divider { margin: 8px 0; }

    .empty-hint { text-align: center; padding: 60px 24px; color: #aaa; }
    .empty-hint mat-icon { font-size: 56px; width: 56px; height: 56px; }

    /* ── Zones ── */
    .zones-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .zones-desc { margin: 0; font-size: 13px; color: #666; max-width: 500px; }
    .zone-form-card { margin-bottom: 20px; border: 2px solid #0288d1; }
    .full { width: 100%; }
    .periods-section { margin: 12px 0; }
    .periods-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #333; }
    .period-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .period-name { flex: 2; min-width: 160px; }
    .period-month { flex: 1; min-width: 90px; }
    .period-day { width: 80px; }
    .period-adj { width: 100px; }
    .arrow { color: #888; font-size: 18px; padding: 0 4px; }
    .add-period-btn { margin-top: 8px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

    .zones-list { display: flex; flex-direction: column; gap: 16px; }
    .zone-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .zone-card mat-card-title { margin: 0; }
    .zone-actions { display: flex; gap: 4px; }
    .no-periods { color: #aaa; font-size: 13px; margin: 4px 0; }
    .period-chip-row { margin-bottom: 6px; }
    .period-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 13px; background: #e3f2fd; }
    .period-badge.positive { background: #e8f5e9; color: #2e7d32; }
    .period-badge.negative { background: #fff3e0; color: #e65100; }

    /* ── Événements ── */
    .events-section { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 24px; }
    .events-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .events-title { margin: 0; font-size: 16px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px; }
    .events-title mat-icon { color: #0288d1; }
    .event-form-card { margin-bottom: 20px; border: 2px solid #0288d1; }
    .event-form-grid { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .ef-name { flex: 3; min-width: 200px; }
    .ef-zone { flex: 2; min-width: 160px; }
    .ef-date { flex: 1; min-width: 140px; }
    .ef-impact { flex: 1; min-width: 130px; }
    .ef-recurring { white-space: nowrap; }
    .events-list { display: flex; flex-direction: column; gap: 8px; }
    .event-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; }
    .event-impact { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px; white-space: nowrap; }
    .impact-faible { background: #e8f5e9; color: #2e7d32; }
    .impact-moyen  { background: #fff3e0; color: #e65100; }
    .impact-fort   { background: #fce4ec; color: #c62828; }
    .event-info { flex: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
    .event-name { font-size: 14px; font-weight: 600; color: #333; }
    .event-recurring-icon { font-size: 16px; width: 16px; height: 16px; color: #888; }
    .event-dates { font-size: 12px; color: #888; }
    .event-zone { font-size: 12px; padding: 2px 8px; background: #e3f2fd; color: #1565c0; border-radius: 10px; }
    .event-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .no-events { color: #aaa; font-size: 13px; text-align: center; padding: 16px 0; }

    /* ── Config ── */
    .config-desc { font-size: 13px; color: #666; margin-bottom: 20px; }
    .config-list { display: flex; flex-direction: column; gap: 12px; }
    .config-prop-name { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #333; }
    .config-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .config-zone { flex: 2; min-width: 180px; }
    .config-price { flex: 1; min-width: 120px; }
    .config-row button { height: 56px; }
  `]
})
export class DynamicPricingComponent implements OnInit {
  readonly months = MONTHS;

  properties = signal<{ id: string; name: string }[]>([]);
  zones = signal<PricingZone[]>([]);
  configs = signal<PropertyPricingConfig[]>([]);

  selectedPropId = '';
  startDate = '';
  endDate = '';
  startDateVal: Date | null = null;
  endDateVal: Date | null = null;
  readonly todayDate = new Date();
  suggestion = signal<PricingSuggestion | null>(null);
  loading = signal(false);

  showZoneForm = signal(false);
  savingZone = signal(false);
  editingZoneId = signal<number | null>(null);
  zoneForm: { name: string; periods: Partial<PricingZonePeriod>[] } = { name: '', periods: [] };

  events = signal<LocalEvent[]>([]);
  showEventForm = signal(false);
  savingEvent = signal(false);
  editingEventId = signal<number | null>(null);
  eventForm: { name: string; zoneId: number | null; startDate: string; endDate: string; startDateVal: Date | null; endDateVal: Date | null; impactLevel: 'FAIBLE' | 'MOYEN' | 'FORT'; recurring: boolean } =
    { name: '', zoneId: null, startDate: '', endDate: '', startDateVal: null, endDateVal: null, impactLevel: 'MOYEN', recurring: false };

  savingConfig = signal<string | null>(null);
  private configMap = new Map<string, PropertyPricingConfig>();

  constructor(
    private pricingSvc: DynamicPricingService,
    private bookingService: BookingService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.bookingService.getPropertiesWithDisplayNames().subscribe({
      next: (props: any[]) => this.properties.set(props.map(p => ({
        id: String(p['id'] ?? p['propId'] ?? ''),
        name: p.name ?? ''
      }))),
      error: () => {}
    });
    this.loadZones();
    this.loadEvents();
    this.loadConfigs();
  }

  private loadZones(): void {
    this.pricingSvc.listZones().subscribe({ next: z => this.zones.set(z), error: () => {} });
  }

  private loadEvents(): void {
    this.pricingSvc.listEvents().subscribe({ next: e => this.events.set(e), error: () => {} });
  }

  private loadConfigs(): void {
    this.pricingSvc.listPropertyConfigs().subscribe({
      next: configs => {
        this.configMap.clear();
        configs.forEach(c => this.configMap.set(String(c.beds24PropertyId), c));
        this.configs.set(configs);
      },
      error: () => {}
    });
  }

  configFor(propId: string): PropertyPricingConfig {
    const key = String(propId);
    if (!this.configMap.has(key)) {
      this.configMap.set(key, { beds24PropertyId: key, zoneId: null, marketMin: null, marketMax: null });
    }
    return this.configMap.get(key)!;
  }

  onStartDateChange(d: Date | null): void {
    this.startDate = d ? localDate(d) : '';
  }

  onEndDateChange(d: Date | null): void {
    this.endDate = d ? localDate(d) : '';
  }

  analyze(): void {
    if (!this.selectedPropId || !this.startDate || !this.endDate) return;
    this.loading.set(true);
    this.suggestion.set(null);
    this.pricingSvc.getSuggestion(this.selectedPropId, this.startDate, this.endDate).subscribe({
      next: s => { this.suggestion.set(s); this.loading.set(false); },
      error: e => {
        this.snack.open(e.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 4000 });
        this.loading.set(false);
      }
    });
  }

  undervaluedPercent(): number {
    const s = this.suggestion();
    if (!s?.currentPrice || !s.suggestedMin) return 0;
    return Math.round(((s.suggestedMin - s.currentPrice) / s.currentPrice) * 100);
  }

  openAdjust(): void {
    const s = this.suggestion();
    if (!s?.suggestedMin) return;
    const mid = Math.round((s.suggestedMin + (s.suggestedMax ?? s.suggestedMin)) / 2);
    const propName = this.properties().find(p => p.id === this.selectedPropId)?.name ?? '';
    const ref = this.dialog.open(PriceDialogComponent, {
      data: { propertyName: propName, date: this.startDate, field: 'price', price: mid },
      width: '380px'
    });
    ref.afterClosed().subscribe((result: PriceDialogResult | undefined) => {
      if (!result) return;
      const params: Record<string, string> = {
        propertyId: this.selectedPropId, from: result.from, to: result.to
      };
      if (result.price != null) params['price'] = String(result.price);
      this.http.post(`${environment.apiUrl}/admin/availability/price`, null, { params }).subscribe({
        next: () => {
          this.snack.open(this.t.instant('pricing.applied'), this.t.instant('common.close'), { duration: 3000 });
          this.analyze();
        },
        error: () => this.snack.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
      });
    });
  }

  startNewZone(): void {
    this.editingZoneId.set(null);
    this.zoneForm = { name: '', periods: [] };
    this.showZoneForm.set(true);
  }

  editZone(zone: PricingZone): void {
    this.editingZoneId.set(zone.id ?? null);
    this.zoneForm = { name: zone.name, periods: zone.periods.map(p => ({ ...p })) };
    this.showZoneForm.set(true);
  }

  cancelZoneForm(): void { this.showZoneForm.set(false); }

  addPeriod(): void {
    this.zoneForm.periods.push({ name: '', startMonth: 7, startDay: 1, endMonth: 8, endDay: 31, adjustmentPercent: 20 });
  }

  removePeriod(index: number): void { this.zoneForm.periods.splice(index, 1); }

  saveZone(): void {
    if (!this.zoneForm.name) return;
    this.savingZone.set(true);
    const payload: PricingZone = { name: this.zoneForm.name, periods: this.zoneForm.periods as PricingZonePeriod[] };
    const id = this.editingZoneId();
    const req = id ? this.pricingSvc.updateZone(id, payload) : this.pricingSvc.createZone(payload);
    req.subscribe({
      next: () => { this.loadZones(); this.showZoneForm.set(false); this.savingZone.set(false); },
      error: () => { this.savingZone.set(false); this.snack.open(this.t.instant('common.error'), '', { duration: 3000 }); }
    });
  }

  deleteZone(zone: PricingZone): void {
    if (!zone.id) return;
    this.pricingSvc.deleteZone(zone.id).subscribe({
      next: () => this.loadZones(),
      error: () => this.snack.open(this.t.instant('common.error'), '', { duration: 3000 })
    });
  }

  startNewEvent(): void {
    this.editingEventId.set(null);
    this.eventForm = { name: '', zoneId: null, startDate: '', endDate: '', startDateVal: null, endDateVal: null, impactLevel: 'MOYEN', recurring: false };
    this.showEventForm.set(true);
  }

  editEvent(evt: LocalEvent): void {
    this.editingEventId.set(evt.id ?? null);
    this.eventForm = {
      name: evt.name, zoneId: evt.zoneId,
      startDate: evt.startDate, endDate: evt.endDate,
      startDateVal: evt.startDate ? new Date(evt.startDate) : null,
      endDateVal: evt.endDate ? new Date(evt.endDate) : null,
      impactLevel: evt.impactLevel, recurring: evt.recurring
    };
    this.showEventForm.set(true);
  }

  cancelEventForm(): void { this.showEventForm.set(false); }

  onEvtStartChange(d: Date | null): void { this.eventForm.startDate = d ? localDate(d) : ''; }
  onEvtEndChange(d: Date | null): void   { this.eventForm.endDate   = d ? localDate(d) : ''; }

  saveEvent(): void {
    if (!this.eventForm.name || !this.eventForm.startDate || !this.eventForm.endDate) return;
    this.savingEvent.set(true);
    const payload: LocalEvent = {
      zoneId: this.eventForm.zoneId, name: this.eventForm.name,
      startDate: this.eventForm.startDate, endDate: this.eventForm.endDate,
      impactLevel: this.eventForm.impactLevel, recurring: this.eventForm.recurring
    };
    const id = this.editingEventId();
    const req = id ? this.pricingSvc.updateEvent(id, payload) : this.pricingSvc.createEvent(payload);
    req.subscribe({
      next: () => { this.loadEvents(); this.showEventForm.set(false); this.savingEvent.set(false); },
      error: () => { this.savingEvent.set(false); this.snack.open(this.t.instant('common.error'), '', { duration: 3000 }); }
    });
  }

  deleteEvent(evt: LocalEvent): void {
    if (!evt.id) return;
    this.pricingSvc.deleteEvent(evt.id).subscribe({
      next: () => this.loadEvents(),
      error: () => this.snack.open(this.t.instant('common.error'), '', { duration: 3000 })
    });
  }

  zoneNameById(zoneId: number): string {
    return this.zones().find(z => z.id === zoneId)?.name ?? '';
  }

  saveConfig(propId: string): void {
    const key = String(propId);
    const config = this.configFor(key);
    this.savingConfig.set(key);
    this.pricingSvc.savePropertyConfig({ ...config, beds24PropertyId: key }).subscribe({
      next: saved => {
        this.configMap.set(key, saved);
        this.savingConfig.set(null);
        this.snack.open(this.t.instant('common.saved'), '', { duration: 2000 });
      },
      error: () => { this.savingConfig.set(null); this.snack.open(this.t.instant('common.error'), '', { duration: 3000 }); }
    });
  }

  monthLabel(m: number): string { return MONTHS.find(x => x.v === m)?.l ?? String(m); }
}
