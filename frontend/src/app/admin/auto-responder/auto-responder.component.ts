import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AutoResponderService, AutoResponderConfig, AutoResponderLog } from '../../core/services/auto-responder.service';
import { BookingService } from '../../core/services/booking.service';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-auto-responder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDividerModule,
    MatChipsModule, MatTabsModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, TranslateModule
  ],
  template: `
    <div class="page-header">
      <mat-icon class="page-icon">smart_toy</mat-icon>
      <h1>{{ 'autoresponder.title' | translate }}</h1>
    </div>

    <mat-tab-group animationDuration="200ms">

      <!-- ── CONFIGURATION ──────────────────────────────────────────────── -->
      <mat-tab [label]="'autoresponder.tab_config' | translate">
        <div class="tab-content">

          <!-- Activation -->
          <mat-card class="section-card">
            <mat-card-content>
              <div class="toggle-row">
                <div class="toggle-info">
                  <div class="toggle-title">{{ 'autoresponder.enabled_label' | translate }}</div>
                  <div class="toggle-desc">{{ 'autoresponder.enabled_desc' | translate }}</div>
                </div>
                <mat-slide-toggle [(ngModel)]="config.enabled" color="primary"></mat-slide-toggle>
              </div>

              <div class="webhook-hint">
                <mat-icon>info</mat-icon>
                <span>{{ 'autoresponder.webhook_hint' | translate }}<br>
                  <code>{{ webhookUrl }}</code>
                </span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Message transitoire (cas sensible) -->
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon warn">warning</mat-icon>
                {{ 'autoresponder.transitional_title' | translate }}
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="section-desc">{{ 'autoresponder.transitional_desc' | translate }}</p>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'autoresponder.transitional_label' | translate }}</mat-label>
                <textarea matInput rows="3" [(ngModel)]="config.transitionalMessage"
                          [placeholder]="'autoresponder.transitional_placeholder' | translate"></textarea>
              </mat-form-field>

              <!-- Mots-clés sensibles -->
              <p class="kw-label">{{ 'autoresponder.keywords_label' | translate }}</p>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'autoresponder.keywords_field' | translate }}</mat-label>
                <input matInput [(ngModel)]="config.sensitiveKeywords"
                       [placeholder]="'autoresponder.keywords_placeholder' | translate">
                <mat-hint>{{ 'autoresponder.keywords_hint' | translate }}</mat-hint>
              </mat-form-field>
              <div class="default-kw">
                <span class="kw-default-label">{{ 'autoresponder.default_keywords' | translate }} :</span>
                @for (kw of defaultKeywords().slice(0, 12); track kw) {
                  <mat-chip class="kw-chip">{{ kw }}</mat-chip>
                }
                @if (defaultKeywords().length > 12) {
                  <mat-chip class="kw-chip more">+{{ defaultKeywords().length - 12 }}</mat-chip>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Prompt IA -->
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon">psychology</mat-icon>
                {{ 'autoresponder.prompt_title' | translate }}
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="section-desc">{{ 'autoresponder.prompt_desc' | translate }}</p>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'autoresponder.prompt_label' | translate }}</mat-label>
                <textarea matInput rows="4" [(ngModel)]="config.systemPromptExtra"
                          [placeholder]="'autoresponder.prompt_placeholder' | translate"></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <div class="save-row">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="18"></mat-spinner> }
              @else { <mat-icon>save</mat-icon> }
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </mat-tab>

      <!-- ── TEST ──────────────────────────────────────────────────────────── -->
      <mat-tab [label]="'autoresponder.tab_test' | translate">
        <div class="tab-content">
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>{{ 'autoresponder.test_title' | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="section-desc">{{ 'autoresponder.test_desc' | translate }}</p>

              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'autoresponder.test_booking_select' | translate }}</mat-label>
                <mat-select [(ngModel)]="selectedBookingId" (selectionChange)="onSelectBooking($event.value)">
                  <mat-option value="">{{ 'autoresponder.test_booking_manual_option' | translate }}</mat-option>
                  @if (bookingsLoading()) {
                    <mat-option disabled>
                      <mat-spinner diameter="16" style="display:inline-block; margin-right:8px"></mat-spinner>
                      {{ 'common.loading' | translate }}
                    </mat-option>
                  }
                  @for (b of upcomingBookings(); track b['id']) {
                    <mat-option [value]="b['id']">
                      {{ guestName(b) }} — {{ propLabel(b) }} — {{ b['arrival'] | date:'dd/MM/yy' }} → {{ b['departure'] | date:'dd/MM/yy' }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'autoresponder.test_booking_select_hint' | translate }}</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full" style="margin-top:12px">
                <mat-label>{{ 'autoresponder.test_booking_id' | translate }}</mat-label>
                <input matInput [(ngModel)]="testBookingId" (ngModelChange)="onManualBookingIdChange()"
                       [placeholder]="'autoresponder.test_booking_id_placeholder' | translate">
                <mat-hint>{{ 'autoresponder.test_booking_id_hint' | translate }}</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full" style="margin-top:16px">
                <mat-label>{{ 'autoresponder.test_message_label' | translate }}</mat-label>
                <textarea matInput rows="4" [(ngModel)]="testMessage"
                          [placeholder]="'autoresponder.test_message_placeholder' | translate"></textarea>
              </mat-form-field>

              <button mat-raised-button color="accent" (click)="runTest()"
                      [disabled]="!testMessage.trim() || testing()">
                @if (testing()) { <mat-spinner diameter="18"></mat-spinner> }
                @else { <mat-icon>science</mat-icon> }
                {{ 'autoresponder.test_btn' | translate }}
              </button>

              @if (testResult()) {
                <div class="test-result" [class.result-sensitive]="testResult()!.classification === 'SENSITIVE'">
                  <div class="result-classification">
                    <mat-icon [class.icon-simple]="testResult()!.classification === 'SIMPLE'"
                              [class.icon-sensitive]="testResult()!.classification === 'SENSITIVE'">
                      {{ testResult()!.classification === 'SIMPLE' ? 'check_circle' : 'warning' }}
                    </mat-icon>
                    <strong>{{ testResult()!.classification }}</strong>
                  </div>

                  @if (testResult()!.classification === 'SIMPLE') {
                    <div class="result-label">{{ 'autoresponder.test_would_reply' | translate }}</div>
                    <div class="result-text">{{ testResult()!.generatedReply }}</div>
                  } @else {
                    <div class="result-label">{{ 'autoresponder.test_would_send_transitional' | translate }}</div>
                    <div class="result-text">{{ testResult()!.transitionalMessage }}</div>
                    <div class="result-alert">
                      <mat-icon>notifications_active</mat-icon>
                      {{ testResult()!.hostAlert }}
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      </mat-tab>

      <!-- ── JOURNAL ─────────────────────────────────────────────────────── -->
      <mat-tab [label]="'autoresponder.tab_logs' | translate">
        <div class="tab-content">
          @if (logs().length === 0) {
            <div class="empty-hint">
              <mat-icon>history</mat-icon>
              <p>{{ 'autoresponder.no_logs' | translate }}</p>
            </div>
          }
          <div class="log-list">
            @for (log of logs(); track log.id) {
              <mat-card class="log-card" [class.sensitive]="log.classification === 'SENSITIVE'">
                <mat-card-content>
                  <div class="log-header">
                    <span class="log-badge" [class.badge-sensitive]="log.classification === 'SENSITIVE'"
                          [class.badge-simple]="log.classification === 'SIMPLE'">
                      {{ log.classification }}
                    </span>
                    <span class="log-date">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    @if (log.autoReplied) {
                      <mat-icon class="replied-icon" matTooltip="{{ 'autoresponder.replied' | translate }}">check_circle</mat-icon>
                    }
                  </div>
                  <div class="log-meta">
                    <span>{{ 'autoresponder.log_booking' | translate }} {{ log.bookingId }}</span>
                  </div>
                  @if (log.guestMessageExcerpt) {
                    <div class="log-excerpt">"{{ log.guestMessageExcerpt | slice:0:200 }}{{ (log.guestMessageExcerpt.length > 200) ? '…' : '' }}"</div>
                  }
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
    .tab-content { padding: 24px 0; display: flex; flex-direction: column; gap: 20px; }

    .section-card {}
    .section-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 6px; vertical-align: middle; color: #0288d1; }
    .section-icon.warn { color: #f57c00; }
    .section-desc { font-size: 13px; color: #666; margin: 0 0 16px; }

    .toggle-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .toggle-title { font-size: 15px; font-weight: 600; }
    .toggle-desc { font-size: 13px; color: #666; margin-top: 2px; }

    .webhook-hint { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px;
      font-size: 12px; color: #888; background: #f5f5f5; padding: 10px 12px; border-radius: 6px; }
    .webhook-hint mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    code { display: block; margin-top: 4px; font-family: monospace; word-break: break-all; color: #333; }

    .full { width: 100%; }
    .kw-label { font-size: 14px; font-weight: 500; margin: 16px 0 8px; }
    .default-kw { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; align-items: center; }
    .kw-default-label { font-size: 12px; color: #888; }
    .kw-chip { font-size: 11px !important; height: 24px !important; }
    .kw-chip.more { background: #e0e0e0; }

    .save-row { display: flex; justify-content: flex-end; }

    /* Test */
    .test-result { margin-top: 24px; padding: 16px; border-radius: 8px; background: #f5f5f5; border-left: 4px solid #43a047; }
    .test-result.result-sensitive { border-left-color: #f57c00; background: #fff8f0; }
    .result-classification { display: flex; align-items: center; gap: 8px; font-size: 15px; margin-bottom: 12px; }
    .icon-simple { color: #43a047; }
    .icon-sensitive { color: #f57c00; }
    .result-label { font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }
    .result-text { font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6; }
    .result-alert { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 13px; color: #f57c00; }
    .result-alert mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Logs */
    .empty-hint { text-align: center; padding: 60px 24px; color: #aaa; }
    .empty-hint mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .log-list { display: flex; flex-direction: column; gap: 12px; }
    .log-card { }
    .log-card.sensitive { border-left: 4px solid #f57c00; }
    .log-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .log-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .badge-simple { background: #e8f5e9; color: #2e7d32; }
    .badge-sensitive { background: #fff3e0; color: #e65100; }
    .log-date { font-size: 12px; color: #888; margin-left: auto; }
    .replied-icon { font-size: 16px; width: 16px; height: 16px; color: #43a047; }
    .log-meta { font-size: 12px; color: #888; margin-bottom: 6px; }
    .log-excerpt { font-size: 13px; color: #444; font-style: italic; padding: 8px; background: #fafafa; border-radius: 4px; }
  `]
})
export class AutoResponderComponent implements OnInit {
  config: AutoResponderConfig = {
    enabled: false,
    sensitiveKeywords: null,
    transitionalMessage: null,
    systemPromptExtra: null
  };

  logs = signal<AutoResponderLog[]>([]);
  saving = signal(false);
  defaultKeywords = signal<string[]>([]);

  testMessage = '';
  testBookingId = '';
  testPropertyId = '';
  selectedBookingId = '';
  upcomingBookings = signal<any[]>([]);
  bookingsLoading = signal(false);
  private propertyNames: Record<string, string> = {};
  testing = signal(false);
  testResult = signal<any>(null);

  get webhookUrl(): string {
    const base = window.location.hostname === 'localhost'
      ? 'https://flowlyrent-production.up.railway.app/api'
      : `https://flowlyrent-production.up.railway.app/api`;
    return `${base}/webhooks/beds24/{votre_userId}`;
  }

  constructor(
    private svc: AutoResponderService,
    private bookingService: BookingService,
    private snack: MatSnackBar,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.svc.getConfig().subscribe({ next: c => this.config = c, error: () => {} });
    this.svc.getLogs().subscribe({ next: l => this.logs.set(l), error: () => {} });
    this.svc.getDefaultKeywords().subscribe({ next: d => this.defaultKeywords.set(d.keywords), error: () => {} });
    this.loadUpcomingBookings();
  }

  private loadUpcomingBookings(): void {
    this.bookingsLoading.set(true);
    const from = new Date(); from.setDate(from.getDate() - 60);
    const today = localDateStr();
    this.bookingService.getPropertyNames().subscribe({
      next: names => { this.propertyNames = names; },
      error: () => {}
    });
    this.bookingService.getAll({ arrivalFrom: localDateStr(from) }).subscribe({
      next: bookings => {
        const upcoming = (bookings ?? [])
          .filter(b => b['status'] !== 'cancelled' && b['departure'] >= today)
          .sort((a, b) => String(a['arrival']).localeCompare(String(b['arrival'])));
        this.upcomingBookings.set(upcoming);
        this.bookingsLoading.set(false);
      },
      error: () => this.bookingsLoading.set(false)
    });
  }

  guestName(b: any): string {
    return `${b['firstName'] ?? ''} ${b['lastName'] ?? ''}`.trim() || (b['guestName'] ?? '—');
  }

  propLabel(b: any): string {
    const id = String(b['propId'] ?? b['propertyId'] ?? '');
    return this.propertyNames[id] || id;
  }

  onSelectBooking(bookingId: string): void {
    if (!bookingId) return;
    const b = this.upcomingBookings().find(x => String(x['id']) === String(bookingId));
    if (!b) return;
    this.testBookingId = String(b['id']);
    this.testPropertyId = String(b['propId'] ?? b['propertyId'] ?? '');
  }

  onManualBookingIdChange(): void {
    this.selectedBookingId = '';
    this.testPropertyId = '';
  }

  runTest(): void {
    if (!this.testMessage.trim()) return;
    this.testing.set(true);
    this.testResult.set(null);
    const body: any = { message: this.testMessage };
    if (this.testBookingId.trim()) body.bookingId = this.testBookingId.trim();
    if (this.testPropertyId.trim()) body.propertyId = this.testPropertyId.trim();
    this.svc.testMessage(body).subscribe({
      next: r => { this.testResult.set(r); this.testing.set(false); },
      error: () => { this.testing.set(false); this.snack.open(this.t.instant('common.error'), '', { duration: 3000 }); }
    });
  }

  save(): void {
    this.saving.set(true);
    this.svc.saveConfig(this.config).subscribe({
      next: c => {
        this.config = c;
        this.saving.set(false);
        this.snack.open(this.t.instant('common.saved'), '', { duration: 2000 });
      },
      error: () => { this.saving.set(false); this.snack.open(this.t.instant('common.error'), '', { duration: 3000 }); }
    });
  }
}
