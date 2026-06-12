import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QontoService, QontoTransaction, ExpenseRule, QontoSummary, QontoStatus } from '../../core/services/qonto.service';

const COLOR_PALETTE = [
  '#1976d2','#388e3c','#f57c00','#7b1fa2','#c62828',
  '#00796b','#5d4037','#455a64','#e64a19','#0288d1',
  '#558b2f','#ad1457','#6a1b9a','#2e7d32','#bf360c',
];

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatDividerModule, TranslateModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'expenses.title' | translate }}</h2>
    </div>

    @if (!status()) {
      <div class="center"><mat-spinner /></div>
    } @else if (!status()!.connected) {
      <mat-card class="connect-card">
        <mat-card-content>
          <div class="connect-banner">
            <mat-icon class="connect-icon">account_balance</mat-icon>
            <div>
              <strong>{{ 'expenses.connect_prompt' | translate }}</strong>
              <p>{{ 'expenses.connect_detail_before' | translate }}<a href="/admin/settings">{{ 'nav.settings' | translate }}</a>{{ 'expenses.connect_detail_after' | translate }}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <mat-tab-group animationDuration="200ms">

        <mat-tab [label]="'expenses.transactions' | translate">
          <div class="tab-content">
            <div class="filters">
              <mat-form-field>
                <mat-label>{{ 'expenses.filter_date_label' | translate }}</mat-label>
                <mat-select [(ngModel)]="dateMode" (selectionChange)="onDateModeChange()">
                  <mat-option value="month">{{ 'expenses.filter_this_month' | translate }}</mat-option>
                  <mat-option value="range">{{ 'expenses.filter_period' | translate }}</mat-option>
                  <mat-option value="all">{{ 'expenses.filter_all_dates' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>

              @if (dateMode === 'range') {
                <mat-form-field>
                  <mat-label>{{ 'expenses.filter_from' | translate }}</mat-label>
                  <input matInput [matDatepicker]="pickerFrom" [(ngModel)]="filterFromDate"
                         (dateChange)="loadTransactions()" readonly />
                  <mat-datepicker-toggle matIconSuffix [for]="pickerFrom" />
                  <mat-datepicker #pickerFrom />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>{{ 'expenses.filter_to' | translate }}</mat-label>
                  <input matInput [matDatepicker]="pickerTo" [(ngModel)]="filterToDate"
                         (dateChange)="loadTransactions()" readonly />
                  <mat-datepicker-toggle matIconSuffix [for]="pickerTo" />
                  <mat-datepicker #pickerTo />
                </mat-form-field>
              }

              <mat-form-field>
                <mat-label>{{ 'expenses.filter_category' | translate }}</mat-label>
                <mat-select [(ngModel)]="filterCategory">
                  <mat-option value="">{{ 'expenses.filter_all_cat' | translate }}</mat-option>
                  @for (cat of uniqueCategories(); track cat) {
                    <mat-option [value]="cat">{{ cat }}</mat-option>
                  }
                  <mat-option value="NON_CATEGORISE">{{ 'expenses.uncategorized' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'expenses.filter_type' | translate }}</mat-label>
                <mat-select [(ngModel)]="filterSide">
                  <mat-option value="">{{ 'expenses.filter_all_types' | translate }}</mat-option>
                  <mat-option value="debit">{{ 'expenses.filter_debit' | translate }}</mat-option>
                  <mat-option value="credit">{{ 'expenses.filter_credit' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button (click)="clearFilters()">
                <mat-icon>clear</mat-icon> {{ 'expenses.filter_clear' | translate }}
              </button>
            </div>

            @if (loadingTx()) {
              <div class="center"><mat-spinner /></div>
            } @else {
              <div class="tx-summary">
                <span>{{ filteredTx().length }} {{ 'expenses.transactions_unit' | translate }}</span>
                @if (filteredTx().length > 0) {
                  <span class="debit-total">{{ 'expenses.total_debits' | translate }} {{ totalDebits() | number:'1.2-2' }} €</span>
                  <span class="credit-total">{{ 'expenses.total_credits' | translate }} {{ totalCredits() | number:'1.2-2' }} €</span>
                }
              </div>

              <div class="tx-list">
                @for (tx of filteredTx(); track tx.transaction_id) {
                  <div class="tx-row">
                    <div class="tx-date">{{ tx.settled_at | date:'dd/MM' }}</div>
                    <div class="tx-label">
                      <div class="tx-main-label">{{ tx.label }}</div>
                      @if (tx.counterparty_name && tx.counterparty_name !== tx.label) {
                        <div class="tx-sub">{{ tx.counterparty_name }}</div>
                      }
                      @if (tx.reference) {
                        <div class="tx-sub tx-ref">{{ 'expenses.ref' | translate }} {{ tx.reference }}</div>
                      }
                      @if (tx.note) {
                        <div class="tx-sub tx-note-qonto">{{ tx.note }}</div>
                      }
                    </div>
                    <div class="tx-amount" [class.debit]="tx.side === 'debit'" [class.credit]="tx.side === 'credit'">
                      {{ tx.side === 'debit' ? '-' : '+' }}{{ tx.amount | number:'1.2-2' }} €
                    </div>
                    <div class="tx-cat">
                      @if (tx.category) {
                        <span class="cat-badge" [style.background]="catColor(tx.category)">
                          {{ catLabel(tx.category) }}
                        </span>
                      } @else {
                        <span class="cat-empty">—</span>
                      }
                    </div>
                  </div>
                }
                @if (filteredTx().length === 0) {
                  <div class="empty">{{ 'expenses.no_transactions' | translate }}</div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab [label]="'expenses.rules' | translate">
          <div class="tab-content">
            <div class="rules-header">
              <p class="rules-hint">{{ 'expenses.rules_hint' | translate }}</p>
              <button mat-flat-button color="primary" (click)="openRuleForm()">
                <mat-icon>add</mat-icon> {{ 'expenses.new_rule' | translate }}
              </button>
            </div>

            @if (showRuleForm()) {
              <mat-card class="rule-form-card">
                <mat-card-header>
                  <mat-card-title>{{ (editingRule()?.id ? 'expenses.edit_rule_title' : 'expenses.new_rule') | translate }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="rule-form">
                    <mat-form-field>
                      <mat-label>{{ 'expenses.rule_name' | translate }}</mat-label>
                      <input matInput [(ngModel)]="ruleForm.label" />
                      <mat-hint>{{ 'expenses.rule_name_hint' | translate }}</mat-hint>
                    </mat-form-field>
                    <mat-form-field class="full-width">
                      <mat-label>{{ 'expenses.rule_keywords' | translate }}</mat-label>
                      <input matInput [(ngModel)]="ruleForm.keywordsRaw" />
                      <mat-hint>{{ 'expenses.rule_keywords_hint' | translate }}</mat-hint>
                    </mat-form-field>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-flat-button color="primary" (click)="saveRule()" [disabled]="savingRule()">
                    @if (savingRule()) { <mat-spinner diameter="18" /> } @else { {{ 'common.save' | translate }} }
                  </button>
                  <button mat-stroked-button (click)="cancelRuleForm()" style="margin-left:8px">{{ 'common.cancel' | translate }}</button>
                </mat-card-actions>
              </mat-card>
            }

            @if (loadingRules()) {
              <div class="center"><mat-spinner /></div>
            } @else if (rules().length === 0) {
              <div class="empty">{{ 'expenses.no_rules' | translate }}</div>
            } @else {
              <div class="rules-list">
                @for (rule of rules(); track rule.id) {
                  <div class="rule-row">
                    <span class="cat-badge" [style.background]="catColor(rule.label)">{{ rule.label }}</span>
                    <div class="rule-info">
                      <strong>{{ rule.label }}</strong>
                      <div class="rule-keywords">
                        @for (kw of rule.keywords; track kw) {
                          <span class="keyword-chip">{{ kw }}</span>
                        }
                        @for (kw of rule.altKeywords; track kw) {
                          <span class="keyword-chip alt">{{ kw }}</span>
                        }
                      </div>
                    </div>
                    <div class="rule-actions">
                      <button mat-icon-button (click)="editRule(rule)" [matTooltip]="'common.edit' | translate">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteRule(rule)" [matTooltip]="'common.delete' | translate">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab [label]="'expenses.summary' | translate">
          <div class="tab-content">
            <div class="summary-filters">
              <mat-form-field>
                <mat-label>{{ 'expenses.summary_year' | translate }}</mat-label>
                <mat-select [(ngModel)]="summaryYear" (selectionChange)="loadSummary()">
                  @for (y of years; track y) {
                    <mat-option [value]="y">{{ y }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'expenses.summary_month' | translate }}</mat-label>
                <mat-select [(ngModel)]="summaryMonth" (selectionChange)="loadSummary()">
                  <mat-option [value]="0">{{ 'expenses.summary_all_year' | translate }}</mat-option>
                  @for (m of months; track m) {
                    <mat-option [value]="m">{{ getMonthName(m) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            @if (loadingSummary()) {
              <div class="center"><mat-spinner /></div>
            } @else if (summary()) {
              <div class="summary-kpis">
                <mat-card class="kpi-card debit">
                  <div class="kpi-label">{{ 'expenses.total_expenses' | translate }}</div>
                  <div class="kpi-value">{{ summary()!.totalDebits | number:'1.2-2' }} €</div>
                  <div class="kpi-sub">{{ summary()!.transactionCount }} {{ 'expenses.transactions_unit' | translate }}</div>
                </mat-card>
                <mat-card class="kpi-card credit">
                  <div class="kpi-label">{{ 'expenses.total_income' | translate }}</div>
                  <div class="kpi-value">{{ summary()!.totalCredits | number:'1.2-2' }} €</div>
                </mat-card>
                <mat-card class="kpi-card">
                  <div class="kpi-label">{{ 'expenses.uncategorized' | translate }}</div>
                  <div class="kpi-value">{{ summary()!.uncategorized }}</div>
                  <div class="kpi-sub">{{ 'expenses.transactions_unit' | translate }}</div>
                </mat-card>
              </div>

              @if (summaryCategories().length > 0) {
                <mat-card class="summary-card">
                  <mat-card-header><mat-card-title>{{ 'expenses.by_category' | translate }}</mat-card-title></mat-card-header>
                  <mat-card-content>
                    <div class="cat-summary-list">
                      @for (entry of summaryCategories(); track entry.key) {
                        <div class="cat-summary-row">
                          <span class="cat-badge" [style.background]="catColor(entry.key)">{{ catLabel(entry.key) }}</span>
                          <div class="cat-bar-wrap">
                            <div class="cat-bar" [style.width]="barWidth(entry.value) + '%'"
                                 [style.background]="catColor(entry.key)"></div>
                          </div>
                          <span class="cat-amount">{{ entry.value | number:'1.2-2' }} €</span>
                        </div>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              }

              @if (monthlyEntries().length > 0) {
                <mat-card class="summary-card">
                  <mat-card-header><mat-card-title>{{ 'expenses.monthly_evolution' | translate }}</mat-card-title></mat-card-header>
                  <mat-card-content>
                    <div class="monthly-list">
                      @for (entry of monthlyEntries(); track entry.key) {
                        <div class="monthly-row">
                          <span class="month-label">{{ formatMonthKey(entry.key) }}</span>
                          <div class="cat-bar-wrap">
                            <div class="cat-bar" [style.width]="monthBarWidth(entry.value) + '%'"
                                 style="background: #1976d2"></div>
                          </div>
                          <span class="cat-amount">{{ entry.value | number:'1.2-2' }} €</span>
                        </div>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    }
  `,
  styles: [`
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .sync-info { font-size: 13px; color: #666; }
    .tab-content { padding: 20px 0; }
    .center { display: flex; justify-content: center; padding: 40px; }
    .empty { padding: 32px; text-align: center; color: #999; font-size: 14px; }

    /* Connect banner */
    .connect-card { max-width: 600px; margin-top: 24px; }
    .connect-banner { display: flex; align-items: flex-start; gap: 16px; }
    .connect-icon { font-size: 40px; width: 40px; height: 40px; color: #1976d2; flex-shrink: 0; }
    .connect-banner strong { font-size: 16px; }
    .connect-banner p { margin: 6px 0 0; font-size: 14px; color: #555; }
    .connect-banner a { color: #1976d2; }

    /* Filters */
    .filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .filters mat-form-field { width: 140px; }
    .filters mat-button-toggle-group { height: 40px; }

    /* Transactions */
    .tx-summary { display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px; color: #555; flex-wrap: wrap; }
    .debit-total { color: #d32f2f; font-weight: 500; }
    .credit-total { color: #2e7d32; font-weight: 500; }

    .tx-list { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .tx-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; background: white; transition: background 0.15s; }
    .tx-row:last-child { border-bottom: none; }
    .tx-row:hover { background: #fafafa; }
    .tx-row.editing { background: #f3f7ff; }

    .tx-date { width: 48px; font-size: 13px; color: #888; flex-shrink: 0; }
    .tx-label { flex: 1; min-width: 0; }
    .tx-main-label { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-sub { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-ref { color: #555; font-style: italic; }
    .tx-note-qonto { color: #777; }
    .tx-amount { width: 90px; text-align: right; font-size: 14px; font-weight: 500; flex-shrink: 0; }
    .tx-amount.debit { color: #d32f2f; }
    .tx-amount.credit { color: #2e7d32; }
    .tx-cat { display: flex; align-items: center; gap: 4px; width: 180px; flex-shrink: 0; }
    .cat-select { width: 140px; }
    .tx-note { font-size: 12px; color: #666; width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cat-empty { color: #ccc; font-size: 13px; }
    .edit-btn { opacity: 0; transition: opacity 0.15s; }
    .tx-row:hover .edit-btn { opacity: 1; }

    /* Category badge */
    .cat-badge { padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; color: white; white-space: nowrap; }

    /* Rules */
    .rules-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
    .rules-hint { margin: 0; font-size: 13px; color: #666; max-width: 600px; }
    .rule-form-card { margin-bottom: 20px; max-width: 700px; }
    .rule-form { display: flex; flex-direction: column; gap: 4px; }
    .rule-form mat-form-field { width: 100%; }
    .full-width { width: 100%; }

    .rules-list { display: flex; flex-direction: column; gap: 8px; }
    .rule-row { display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; }
    .rule-info { flex: 1; min-width: 0; }
    .rule-info strong { font-size: 14px; }
    .rule-keywords { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
    .keyword-chip { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
    .keyword-chip.alt { background: #f3e5f5; color: #6a1b9a; }
    .rule-actions { display: flex; gap: 4px; flex-shrink: 0; }

    /* Summary */
    .summary-filters { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-filters mat-form-field { width: 160px; }
    .summary-kpis { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .kpi-card { flex: 1; min-width: 160px; padding: 16px; text-align: center; }
    .kpi-card.debit { border-left: 4px solid #d32f2f; }
    .kpi-card.credit { border-left: 4px solid #2e7d32; }
    .kpi-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 24px; font-weight: 700; margin: 8px 0 4px; }
    .kpi-sub { font-size: 12px; color: #999; }
    .summary-card { margin-bottom: 16px; }

    .cat-summary-list, .monthly-list { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .cat-summary-row, .monthly-row { display: flex; align-items: center; gap: 12px; }
    .cat-bar-wrap { flex: 1; background: #f0f0f0; border-radius: 4px; height: 12px; overflow: hidden; }
    .cat-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; min-width: 4px; }
    .cat-amount { width: 90px; text-align: right; font-size: 13px; font-weight: 500; color: #333; flex-shrink: 0; }
    .month-label { width: 80px; font-size: 13px; color: #555; flex-shrink: 0; }

    @media (max-width: 600px) {
      .filters { flex-direction: column; }
      .filters mat-form-field { width: 100%; }
      .tx-cat { display: none; }
      .summary-kpis { flex-direction: column; }
    }
  `]
})
export class ExpensesComponent implements OnInit {

  status = signal<QontoStatus | null>(null);

  // Transactions
  transactions = signal<QontoTransaction[]>([]);
  loadingTx = signal(false);
  dateMode: 'month' | 'range' | 'all' = 'month';
  filterFromDate: Date | null = null;
  filterToDate: Date | null = null;
  filterCategory = '';
  filterSide = '';

  // Rules
  rules = signal<ExpenseRule[]>([]);
  loadingRules = signal(false);
  showRuleForm = signal(false);
  editingRule = signal<ExpenseRule | null>(null);
  savingRule = signal(false);
  ruleForm = { label: '', keywordsRaw: '', altKeywordsRaw: '' };

  // Summary
  summary = signal<QontoSummary | null>(null);
  loadingSummary = signal(false);
  summaryYear = new Date().getFullYear();
  summaryMonth = 0;
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  months = Array.from({ length: 12 }, (_, i) => i + 1);

  constructor(private qontoService: QontoService, private snack: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void {
    this.qontoService.getStatus().subscribe(s => {
      this.status.set(s);
      if (s.connected) {
        this.loadTransactions();
        this.loadRules();
        this.loadSummary();
      }
    });
  }

  // ─── Transactions ──────────────────────────────────────────────────────

  loadTransactions(): void {
    this.loadingTx.set(true);
    const params: Record<string, string> = {};
    const now = new Date();
    if (this.dateMode === 'month') {
      params['from'] = this.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      params['to']   = this.toDateStr(now);
    } else if (this.dateMode === 'all') {
      params['from'] = this.toDateStr(new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()));
      params['to']   = this.toDateStr(now);
    } else {
      if (this.filterFromDate) params['from'] = this.toDateStr(this.filterFromDate);
      if (this.filterToDate)   params['to']   = this.toDateStr(this.filterToDate);
    }
    this.qontoService.getTransactions(params).subscribe({
      next: txs => { this.transactions.set(txs); this.loadingTx.set(false); },
      error: () => this.loadingTx.set(false)
    });
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  filteredTx(): QontoTransaction[] {
    let txs = this.transactions();
    if (this.filterCategory === 'NON_CATEGORISE') {
      txs = txs.filter(t => !t.category);
    } else if (this.filterCategory) {
      txs = txs.filter(t => t.category === this.filterCategory);
    }
    if (this.filterSide) {
      txs = txs.filter(t => t.side === this.filterSide);
    }
    return txs;
  }

  totalDebits(): number {
    return this.filteredTx()
      .filter(t => t.side === 'debit')
      .reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  totalCredits(): number {
    return this.filteredTx()
      .filter(t => t.side === 'credit')
      .reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  onDateModeChange(): void {
    this.filterFromDate = null;
    this.filterToDate = null;
    this.loadTransactions();
  }

  clearFilters(): void {
    this.dateMode = 'month';
    this.filterFromDate = null;
    this.filterToDate = null;
    this.filterCategory = '';
    this.filterSide = '';
    this.loadTransactions();
  }

  // ─── Rules ─────────────────────────────────────────────────────────────

  loadRules(): void {
    this.loadingRules.set(true);
    this.qontoService.getRules().subscribe({
      next: r => { this.rules.set(r); this.loadingRules.set(false); },
      error: () => this.loadingRules.set(false)
    });
  }

  openRuleForm(): void {
    this.editingRule.set(null);
    this.ruleForm = { label: '', keywordsRaw: '', altKeywordsRaw: '' };
    this.showRuleForm.set(true);
  }

  editRule(rule: ExpenseRule): void {
    this.editingRule.set(rule);
    this.ruleForm = {
      label: rule.label,
      keywordsRaw: rule.keywords.join(', '),
      altKeywordsRaw: rule.altKeywords.join(', ')
    };
    this.showRuleForm.set(true);
  }

  cancelRuleForm(): void {
    this.showRuleForm.set(false);
    this.editingRule.set(null);
  }

  saveRule(): void {
    if (!this.ruleForm.label.trim()) return;
    this.savingRule.set(true);

    const payload = {
      label: this.ruleForm.label.trim(),
      keywords: this.ruleForm.keywordsRaw.split(',').map(s => s.trim()).filter(Boolean),
      altKeywords: this.ruleForm.altKeywordsRaw.split(',').map(s => s.trim()).filter(Boolean)
    };

    const req = this.editingRule()?.id
      ? this.qontoService.updateRule(this.editingRule()!.id, payload)
      : this.qontoService.createRule(payload);

    req.subscribe({
      next: () => {
        this.savingRule.set(false);
        this.showRuleForm.set(false);
        this.loadRules();
        this.loadTransactions();
        this.snack.open(this.t.instant('expenses.rule_saved'), '', { duration: 2000 });
      },
      error: () => this.savingRule.set(false)
    });
  }

  deleteRule(rule: ExpenseRule): void {
    if (!confirm(this.t.instant('expenses.delete_rule_confirm') + ' "' + rule.label + '" ?')) return;
    this.qontoService.deleteRule(rule.id).subscribe(() => {
      this.loadRules();
      this.loadTransactions();
      this.snack.open(this.t.instant('expenses.rule_deleted'), '', { duration: 2000 });
    });
  }

  // ─── Summary ───────────────────────────────────────────────────────────

  loadSummary(): void {
    this.loadingSummary.set(true);
    this.qontoService.getSummary(
      this.summaryYear,
      this.summaryMonth > 0 ? this.summaryMonth : undefined
    ).subscribe({
      next: s => { this.summary.set(s); this.loadingSummary.set(false); },
      error: () => this.loadingSummary.set(false)
    });
  }

  summaryCategories(): { key: string; value: number }[] {
    const s = this.summary();
    if (!s) return [];
    return Object.entries(s.byCategory)
      .map(([key, value]) => ({ key, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }

  monthlyEntries(): { key: string; value: number }[] {
    const s = this.summary();
    if (!s) return [];
    return Object.entries(s.byMonth)
      .map(([key, value]) => ({ key, value: Number(value) }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  barWidth(value: number): number {
    const max = Math.max(...this.summaryCategories().map(e => e.value));
    return max > 0 ? (value / max) * 100 : 0;
  }

  monthBarWidth(value: number): number {
    const max = Math.max(...this.monthlyEntries().map(e => e.value));
    return max > 0 ? (value / max) * 100 : 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  catLabel(key: string): string {
    return key || this.t.instant('expenses.uncategorized');
  }

  getMonthName(value: number): string {
    return new Date(2000, value - 1, 1).toLocaleDateString(this.t.currentLang || 'fr', { month: 'long' });
  }

  catColor(key: string): string {
    if (!key || key === 'NON_CATEGORISE') return '#9e9e9e';
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
  }

  uniqueCategories(): string[] {
    return [...new Set(this.rules().map(r => r.label))].sort();
  }

  formatMonthKey(key: string): string {
    const [y, m] = key.split('-');
    const date = new Date(2000, parseInt(m, 10) - 1, 1);
    const short = date.toLocaleDateString(this.t.currentLang || 'fr', { month: 'short' });
    return short.charAt(0).toUpperCase() + short.slice(1) + ' ' + y;
  }
}
