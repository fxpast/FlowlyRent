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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { QontoService, QontoTransaction, ExpenseRule, QontoSummary, QontoStatus } from '../../core/services/qonto.service';

const CATEGORIES: Record<string, { label: string; color: string }> = {
  ELECTRICITY:  { label: 'Électricité',   color: '#ff9800' },
  WATER:        { label: 'Eau',            color: '#2196f3' },
  INTERNET:     { label: 'Internet',       color: '#9c27b0' },
  RENT:         { label: 'Loyer',          color: '#f44336' },
  SOFTWARE:     { label: 'Logiciels',      color: '#3f51b5' },
  INSURANCE:    { label: 'Assurance',      color: '#009688' },
  CLEANING:     { label: 'Ménage',         color: '#4caf50' },
  MAINTENANCE:  { label: 'Entretien',      color: '#795548' },
  MISC:         { label: 'Divers',         color: '#607d8b' },
  INCOME:       { label: 'Revenus',        color: '#4caf50' },
  NON_CATEGORISE: { label: 'Non catégorisé', color: '#9e9e9e' },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES).filter(k => k !== 'NON_CATEGORISE');

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule,
    MatSnackBarModule, MatDividerModule
  ],
  template: `
    <div class="page-header">
      <h2>Dépenses Qonto</h2>
      @if (status()?.connected) {
        <div class="header-actions">
          @if (status()?.lastSync) {
            <span class="sync-info">Dernière sync : {{ formatDate(status()!.lastSync!) }}</span>
          }
          <button mat-stroked-button (click)="syncNow()" [disabled]="syncing()">
            @if (syncing()) { <mat-spinner diameter="18" /> } @else { <mat-icon>sync</mat-icon> Synchroniser }
          </button>
        </div>
      }
    </div>

    @if (!status()) {
      <div class="center"><mat-spinner /></div>
    } @else if (!status()!.connected) {
      <mat-card class="connect-card">
        <mat-card-content>
          <div class="connect-banner">
            <mat-icon class="connect-icon">account_balance</mat-icon>
            <div>
              <strong>Connectez votre compte Qonto</strong>
              <p>Pour accéder à vos transactions et catégoriser vos dépenses, connectez votre compte Qonto dans les <a href="/admin/settings">Paramètres</a>.</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <mat-tab-group animationDuration="200ms">

        <!-- ── Onglet Transactions ───────────────────────────────────────── -->
        <mat-tab label="Transactions">
          <div class="tab-content">
            <!-- Filtres -->
            <div class="filters">
              <mat-form-field>
                <mat-label>De</mat-label>
                <input matInput type="date" [(ngModel)]="filterFrom" (change)="loadTransactions()" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>À</mat-label>
                <input matInput type="date" [(ngModel)]="filterTo" (change)="loadTransactions()" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Catégorie</mat-label>
                <mat-select [(ngModel)]="filterCategory" (selectionChange)="loadTransactions()">
                  <mat-option value="">Toutes</mat-option>
                  @for (key of categoryKeys; track key) {
                    <mat-option [value]="key">{{ catLabel(key) }}</mat-option>
                  }
                  <mat-option value="NON_CATEGORISE">Non catégorisé</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="filterSide" (selectionChange)="loadTransactions()">
                  <mat-option value="">Tous</mat-option>
                  <mat-option value="DEBIT">Débit</mat-option>
                  <mat-option value="CREDIT">Crédit</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button (click)="clearFilters()">
                <mat-icon>clear</mat-icon> Effacer
              </button>
            </div>

            @if (loadingTx()) {
              <div class="center"><mat-spinner /></div>
            } @else {
              <div class="tx-summary">
                <span>{{ filteredTx().length }} transactions</span>
                @if (filteredTx().length > 0) {
                  <span class="debit-total">Débits : {{ totalDebits() | number:'1.2-2' }} €</span>
                  <span class="credit-total">Crédits : {{ totalCredits() | number:'1.2-2' }} €</span>
                }
              </div>

              <div class="tx-list">
                @for (tx of filteredTx(); track tx.id) {
                  <div class="tx-row" [class.editing]="editingId() === tx.id">
                    <div class="tx-date">{{ tx.settledAt | date:'dd/MM' }}</div>
                    <div class="tx-label">
                      <div class="tx-main-label">{{ tx.label }}</div>
                      @if (tx.counterpartyName && tx.counterpartyName !== tx.label) {
                        <div class="tx-counterparty">{{ tx.counterpartyName }}</div>
                      }
                    </div>
                    <div class="tx-amount" [class.debit]="tx.side === 'DEBIT'" [class.credit]="tx.side === 'CREDIT'">
                      {{ tx.side === 'DEBIT' ? '-' : '+' }}{{ tx.amount | number:'1.2-2' }} €
                    </div>
                    <div class="tx-cat">
                      @if (editingId() === tx.id) {
                        <mat-form-field class="cat-select">
                          <mat-select [(ngModel)]="editCategory" (selectionChange)="saveCategory(tx)">
                            <mat-option value="">— Aucune —</mat-option>
                            @for (key of categoryKeys; track key) {
                              <mat-option [value]="key">{{ catLabel(key) }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <button mat-icon-button (click)="editingId.set(0)" matTooltip="Annuler">
                          <mat-icon>close</mat-icon>
                        </button>
                      } @else {
                        @if (tx.category) {
                          <span class="cat-badge" [style.background]="catColor(tx.category)">
                            {{ catLabel(tx.category) }}
                          </span>
                        } @else {
                          <span class="cat-empty">—</span>
                        }
                        <button mat-icon-button class="edit-btn" (click)="startEdit(tx)" matTooltip="Changer la catégorie">
                          <mat-icon>edit</mat-icon>
                        </button>
                      }
                    </div>
                    @if (tx.userNote) {
                      <div class="tx-note">{{ tx.userNote }}</div>
                    }
                  </div>
                }
                @if (filteredTx().length === 0) {
                  <div class="empty">Aucune transaction trouvée</div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ── Onglet Règles ─────────────────────────────────────────────── -->
        <mat-tab label="Règles de catégorisation">
          <div class="tab-content">
            <div class="rules-header">
              <p class="rules-hint">
                Les règles s'appliquent aux transactions Qonto par correspondance de mots-clés dans le libellé.
                La première règle qui correspond est appliquée.
              </p>
              <button mat-flat-button color="primary" (click)="openRuleForm()">
                <mat-icon>add</mat-icon> Nouvelle règle
              </button>
            </div>

            @if (showRuleForm()) {
              <mat-card class="rule-form-card">
                <mat-card-header>
                  <mat-card-title>{{ editingRule()?.id ? 'Modifier la règle' : 'Nouvelle règle' }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="rule-form">
                    <mat-form-field>
                      <mat-label>Nom affiché</mat-label>
                      <input matInput [(ngModel)]="ruleForm.label" placeholder="Ex : EDF Appartement Paris" />
                    </mat-form-field>
                    <mat-form-field>
                      <mat-label>Catégorie</mat-label>
                      <mat-select [(ngModel)]="ruleForm.category">
                        @for (key of categoryKeys; track key) {
                          <mat-option [value]="key">{{ catLabel(key) }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field class="full-width">
                      <mat-label>Mots-clés libellé (séparés par virgule)</mat-label>
                      <input matInput [(ngModel)]="ruleForm.keywordsRaw"
                             placeholder="Ex : EDF, electricite, électricité" />
                      <mat-hint>Recherche dans le libellé Qonto (insensible à la casse)</mat-hint>
                    </mat-form-field>
                    <mat-form-field class="full-width">
                      <mat-label>Mots-clés alternatifs (bénéficiaire, nom)</mat-label>
                      <input matInput [(ngModel)]="ruleForm.altKeywordsRaw"
                             placeholder="Ex : EDF, ENEDIS" />
                      <mat-hint>Recherche dans le nom du bénéficiaire</mat-hint>
                    </mat-form-field>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-flat-button color="primary" (click)="saveRule()" [disabled]="savingRule()">
                    @if (savingRule()) { <mat-spinner diameter="18" /> } @else { Enregistrer }
                  </button>
                  <button mat-stroked-button (click)="cancelRuleForm()" style="margin-left:8px">Annuler</button>
                </mat-card-actions>
              </mat-card>
            }

            @if (loadingRules()) {
              <div class="center"><mat-spinner /></div>
            } @else if (rules().length === 0) {
              <div class="empty">Aucune règle définie. Créez votre première règle pour catégoriser automatiquement vos transactions.</div>
            } @else {
              <div class="rules-list">
                @for (rule of rules(); track rule.id) {
                  <div class="rule-row">
                    <span class="cat-badge" [style.background]="catColor(rule.category)">{{ catLabel(rule.category) }}</span>
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
                      <button mat-icon-button (click)="editRule(rule)" matTooltip="Modifier">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteRule(rule)" matTooltip="Supprimer">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ── Onglet Résumé ─────────────────────────────────────────────── -->
        <mat-tab label="Résumé">
          <div class="tab-content">
            <div class="summary-filters">
              <mat-form-field>
                <mat-label>Année</mat-label>
                <mat-select [(ngModel)]="summaryYear" (selectionChange)="loadSummary()">
                  @for (y of years; track y) {
                    <mat-option [value]="y">{{ y }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Mois</mat-label>
                <mat-select [(ngModel)]="summaryMonth" (selectionChange)="loadSummary()">
                  <mat-option [value]="0">Toute l'année</mat-option>
                  @for (m of months; track m.value) {
                    <mat-option [value]="m.value">{{ m.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            @if (loadingSummary()) {
              <div class="center"><mat-spinner /></div>
            } @else if (summary()) {
              <div class="summary-kpis">
                <mat-card class="kpi-card debit">
                  <div class="kpi-label">Total dépenses</div>
                  <div class="kpi-value">{{ summary()!.totalDebits | number:'1.2-2' }} €</div>
                  <div class="kpi-sub">{{ summary()!.transactionCount }} transactions</div>
                </mat-card>
                <mat-card class="kpi-card credit">
                  <div class="kpi-label">Total entrées</div>
                  <div class="kpi-value">{{ summary()!.totalCredits | number:'1.2-2' }} €</div>
                </mat-card>
                <mat-card class="kpi-card">
                  <div class="kpi-label">Non catégorisé</div>
                  <div class="kpi-value">{{ summary()!.uncategorized }}</div>
                  <div class="kpi-sub">transactions</div>
                </mat-card>
              </div>

              @if (summaryCategories().length > 0) {
                <mat-card class="summary-card">
                  <mat-card-header><mat-card-title>Par catégorie</mat-card-title></mat-card-header>
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
                  <mat-card-header><mat-card-title>Évolution mensuelle des dépenses</mat-card-title></mat-card-header>
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
    .filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; margin-bottom: 16px; }
    .filters mat-form-field { width: 140px; }

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
    .tx-counterparty { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
  syncing = signal(false);

  // Transactions
  transactions = signal<QontoTransaction[]>([]);
  loadingTx = signal(false);
  filterFrom = '';
  filterTo = '';
  filterCategory = '';
  filterSide = '';
  editingId = signal(0);
  editCategory = '';

  // Rules
  rules = signal<ExpenseRule[]>([]);
  loadingRules = signal(false);
  showRuleForm = signal(false);
  editingRule = signal<ExpenseRule | null>(null);
  savingRule = signal(false);
  ruleForm = { label: '', category: 'MISC', keywordsRaw: '', altKeywordsRaw: '' };

  // Summary
  summary = signal<QontoSummary | null>(null);
  loadingSummary = signal(false);
  summaryYear = new Date().getFullYear();
  summaryMonth = 0;
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  months = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
  ];

  readonly categoryKeys = CATEGORY_KEYS;

  constructor(private qontoService: QontoService, private snack: MatSnackBar) {}

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

  // ─── Sync ──────────────────────────────────────────────────────────────

  syncNow(): void {
    this.syncing.set(true);
    this.qontoService.sync().subscribe({
      next: r => {
        this.syncing.set(false);
        this.snack.open(`Sync OK — ${r.synced ?? 0} transactions`, '', { duration: 3000 });
        this.loadTransactions();
        this.loadSummary();
        this.qontoService.getStatus().subscribe(s => this.status.set(s));
      },
      error: err => {
        this.syncing.set(false);
        this.snack.open(err.error?.error ?? 'Erreur lors de la synchronisation', 'OK', { duration: 5000 });
      }
    });
  }

  // ─── Transactions ──────────────────────────────────────────────────────

  loadTransactions(): void {
    this.loadingTx.set(true);
    const params: Record<string, string> = {};
    if (this.filterFrom) params['from'] = this.filterFrom;
    if (this.filterTo) params['to'] = this.filterTo;
    if (this.filterCategory) params['category'] = this.filterCategory;
    if (this.filterSide) params['side'] = this.filterSide;

    this.qontoService.getTransactions(params).subscribe({
      next: txs => { this.transactions.set(txs); this.loadingTx.set(false); },
      error: () => this.loadingTx.set(false)
    });
  }

  filteredTx(): QontoTransaction[] {
    return this.transactions();
  }

  totalDebits(): number {
    return this.filteredTx()
      .filter(t => t.side === 'DEBIT')
      .reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  totalCredits(): number {
    return this.filteredTx()
      .filter(t => t.side === 'CREDIT')
      .reduce((s, t) => s + (t.amount ?? 0), 0);
  }

  clearFilters(): void {
    this.filterFrom = '';
    this.filterTo = '';
    this.filterCategory = '';
    this.filterSide = '';
    this.loadTransactions();
  }

  startEdit(tx: QontoTransaction): void {
    this.editingId.set(tx.id);
    this.editCategory = tx.category ?? '';
  }

  saveCategory(tx: QontoTransaction): void {
    this.qontoService.patchTransaction(tx.id, { category: this.editCategory || undefined }).subscribe({
      next: updated => {
        const list = this.transactions();
        const idx = list.findIndex(t => t.id === tx.id);
        if (idx >= 0) list[idx] = { ...updated };
        this.transactions.set([...list]);
        this.editingId.set(0);
      },
      error: () => this.editingId.set(0)
    });
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
    this.ruleForm = { label: '', category: 'MISC', keywordsRaw: '', altKeywordsRaw: '' };
    this.showRuleForm.set(true);
  }

  editRule(rule: ExpenseRule): void {
    this.editingRule.set(rule);
    this.ruleForm = {
      label: rule.label,
      category: rule.category,
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
    if (!this.ruleForm.label.trim() || !this.ruleForm.category) return;
    this.savingRule.set(true);

    const payload = {
      label: this.ruleForm.label.trim(),
      category: this.ruleForm.category,
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
        this.snack.open('Règle enregistrée', '', { duration: 2000 });
      },
      error: () => this.savingRule.set(false)
    });
  }

  deleteRule(rule: ExpenseRule): void {
    if (!confirm(`Supprimer la règle "${rule.label}" ?`)) return;
    this.qontoService.deleteRule(rule.id).subscribe(() => {
      this.loadRules();
      this.loadTransactions();
      this.snack.open('Règle supprimée', '', { duration: 2000 });
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
    return CATEGORIES[key]?.label ?? key;
  }

  catColor(key: string): string {
    return CATEGORIES[key]?.color ?? '#9e9e9e';
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatMonthKey(key: string): string {
    const [y, m] = key.split('-');
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[parseInt(m, 10) - 1] + ' ' + y;
  }
}
