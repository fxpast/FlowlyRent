import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface QontoStatus {
  connected: boolean;
  lastSync?: string;
  lastSyncStatus?: string;
}

export interface QontoTransaction {
  transaction_id: string;
  label: string;
  reference?: string;      // Libellé complémentaire Qonto
  note?: string;           // Commentaire / Informations complémentaires Qonto
  counterparty_name?: string;
  amount: number;
  currency: string;
  side: 'debit' | 'credit';
  status: string;
  settled_at: string;
  emitted_at?: string;
  bankAccountIban?: string;
  category: string | null;
  ruleLabel: string | null;
  expenseRuleId: number | null;
  beds24PropertyId: string | null;
}

export interface ExpenseRule {
  id: number;
  label: string;
  beds24PropertyId: string;
  keywords: string[];
  altKeywords: string[];
  active: boolean;
  createdAt: string;
}

export interface QontoSummary {
  from: string;
  to: string;
  totalDebits: number;
  totalCredits: number;
  transactionCount: number;
  uncategorized: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class QontoService {
  private base = environment.apiUrl;

  private txCache = new Map<string, QontoTransaction[]>();
  private summaryCache = new Map<string, QontoSummary>();
  private rulesCache: ExpenseRule[] | null = null;

  constructor(private http: HttpClient) {}

  clearCache(): void {
    this.txCache.clear();
    this.summaryCache.clear();
    this.rulesCache = null;
  }

  private txKey(params: Record<string, string>): string {
    return Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
  }

  // ─── Connexion ───────────────────────────────────────────────────────────

  getStatus(): Observable<QontoStatus> {
    return this.http.get<QontoStatus>(`${this.base}/user/qonto/status`);
  }

  connect(login: string, secretKey: string): Observable<{ status?: string; connected?: boolean; legalName?: string; error?: string }> {
    return this.http.post<any>(`${this.base}/user/qonto/connect`, { login, secretKey });
  }

  disconnect(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/user/qonto/disconnect`).pipe(
      tap(() => this.clearCache())
    );
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  getTransactions(params?: { from?: string; to?: string; category?: string; side?: string }): Observable<QontoTransaction[]> {
    const clean: Record<string, string> = {};
    if (params?.from)     clean['from']     = params.from;
    if (params?.to)       clean['to']       = params.to;
    if (params?.category) clean['category'] = params.category;
    if (params?.side)     clean['side']     = params.side;

    const key = this.txKey(clean);
    if (this.txCache.has(key)) return of(this.txCache.get(key)!);

    let url = `${this.base}/admin/qonto/transactions`;
    const qs = Object.entries(clean).map(([k, v]) => `${k}=${v}`).join('&');
    if (qs) url += '?' + qs;

    return this.http.get<QontoTransaction[]>(url).pipe(
      tap(data => this.txCache.set(key, data))
    );
  }

  getSummary(year?: number, month?: number): Observable<QontoSummary> {
    const key = `${year ?? 'all'}-${month ?? 'all'}`;
    if (this.summaryCache.has(key)) return of(this.summaryCache.get(key)!);

    let url = `${this.base}/admin/qonto/summary`;
    const parts: string[] = [];
    if (year)  parts.push(`year=${year}`);
    if (month) parts.push(`month=${month}`);
    if (parts.length) url += '?' + parts.join('&');

    return this.http.get<QontoSummary>(url).pipe(
      tap(data => this.summaryCache.set(key, data))
    );
  }

  // ─── Règles de dépenses ───────────────────────────────────────────────────

  getRules(): Observable<ExpenseRule[]> {
    if (this.rulesCache) return of(this.rulesCache);
    return this.http.get<ExpenseRule[]>(`${this.base}/admin/expense-rules`).pipe(
      tap(data => { this.rulesCache = data; })
    );
  }

  createRule(rule: Partial<ExpenseRule>): Observable<ExpenseRule> {
    return this.http.post<ExpenseRule>(`${this.base}/admin/expense-rules`, rule).pipe(
      tap(() => this.clearCache())
    );
  }

  updateRule(id: number, rule: Partial<ExpenseRule>): Observable<ExpenseRule> {
    return this.http.put<ExpenseRule>(`${this.base}/admin/expense-rules/${id}`, rule).pipe(
      tap(() => this.clearCache())
    );
  }

  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/expense-rules/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }
}
