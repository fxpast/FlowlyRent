import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  category: string;
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

  constructor(private http: HttpClient) {}

  // ─── Connexion ───────────────────────────────────────────────────────────

  getStatus(): Observable<QontoStatus> {
    return this.http.get<QontoStatus>(`${this.base}/user/qonto/status`);
  }

  connect(login: string, secretKey: string): Observable<{ status?: string; connected?: boolean; legalName?: string; error?: string }> {
    return this.http.post<any>(`${this.base}/user/qonto/connect`, { login, secretKey });
  }

  disconnect(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/user/qonto/disconnect`);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  getTransactions(params?: { from?: string; to?: string; category?: string; side?: string }): Observable<QontoTransaction[]> {
    let url = `${this.base}/admin/qonto/transactions`;
    if (params) {
      const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
      if (qs) url += '?' + qs;
    }
    return this.http.get<QontoTransaction[]>(url);
  }

  getSummary(year?: number, month?: number): Observable<QontoSummary> {
    let url = `${this.base}/admin/qonto/summary`;
    const parts: string[] = [];
    if (year) parts.push(`year=${year}`);
    if (month) parts.push(`month=${month}`);
    if (parts.length) url += '?' + parts.join('&');
    return this.http.get<QontoSummary>(url);
  }

  // ─── Règles de dépenses ───────────────────────────────────────────────────

  getRules(): Observable<ExpenseRule[]> {
    return this.http.get<ExpenseRule[]>(`${this.base}/admin/expense-rules`);
  }

  createRule(rule: Partial<ExpenseRule>): Observable<ExpenseRule> {
    return this.http.post<ExpenseRule>(`${this.base}/admin/expense-rules`, rule);
  }

  updateRule(id: number, rule: Partial<ExpenseRule>): Observable<ExpenseRule> {
    return this.http.put<ExpenseRule>(`${this.base}/admin/expense-rules/${id}`, rule);
  }

  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/expense-rules/${id}`);
  }
}
