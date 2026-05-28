import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { environment } from '@env/environment';

interface Feedback {
  id: number;
  userId: number;
  userEmail: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#1976d2',
  IN_PROGRESS: '#f57c00',
  DONE: '#388e3c',
  REJECTED: '#757575',
};

const CATEGORY_ICONS: Record<string, string> = {
  bug: 'bug_report',
  amélioration: 'trending_up',
  suggestion: 'lightbulb',
  autre: 'help_outline',
};

@Component({
  selector: 'app-superadmin-feedbacks',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressSpinnerModule, MatSelectModule
  ],
  template: `
    <h2>Feedbacks utilisateurs</h2>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (feedbacks().length === 0) {
      <mat-card class="empty-card">
        <mat-icon>inbox</mat-icon>
        <p>Aucun feedback reçu pour l'instant.</p>
      </mat-card>
    } @else {
      <div class="count">{{ feedbacks().length }} feedback{{ feedbacks().length > 1 ? 's' : '' }}</div>
      <div class="list">
        @for (fb of feedbacks(); track fb.id) {
          <mat-card class="fb-card">
            <div class="fb-header">
              <div class="fb-meta">
                <mat-icon class="cat-icon">{{ categoryIcon(fb.category) }}</mat-icon>
                <span class="category">{{ fb.category }}</span>
                <span class="email">{{ fb.userEmail }}</span>
                <span class="date">{{ fb.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="fb-status">
                <mat-select [(ngModel)]="fb.status" (ngModelChange)="updateStatus(fb)"
                  class="status-select" [style.color]="statusColor(fb.status)">
                  <mat-option value="NEW">Nouveau</mat-option>
                  <mat-option value="IN_PROGRESS">En cours</mat-option>
                  <mat-option value="DONE">Traité</mat-option>
                  <mat-option value="REJECTED">Rejeté</mat-option>
                </mat-select>
              </div>
            </div>
            <p class="message">{{ fb.message }}</p>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 8px; font-size: 24px; font-weight: 500; }
    .loading { display: flex; justify-content: center; margin-top: 60px; }
    .count { color: #666; font-size: 14px; margin-bottom: 16px; }
    .list { display: flex; flex-direction: column; gap: 12px; max-width: 860px; }
    .fb-card { padding: 16px 20px; }
    .fb-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .fb-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .cat-icon { font-size: 18px; width: 18px; height: 18px; color: #1976d2; }
    .category { font-weight: 600; font-size: 13px; text-transform: capitalize; color: #333; }
    .email { font-size: 12px; color: #888; background: #f5f5f5; padding: 2px 8px; border-radius: 10px; }
    .date { font-size: 12px; color: #aaa; }
    .message { margin: 0; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap; }
    .status-select { font-size: 13px; font-weight: 600; }
    .empty-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px; color: #aaa; }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class SuperadminFeedbacksComponent implements OnInit {
  feedbacks = signal<Feedback[]>([]);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<Feedback[]>(`${environment.apiUrl}/superadmin/feedbacks`).subscribe({
      next: data => { this.feedbacks.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  categoryIcon(cat: string): string { return CATEGORY_ICONS[cat] ?? 'feedback'; }
  statusColor(status: string): string { return STATUS_COLORS[status] ?? '#333'; }

  updateStatus(fb: Feedback): void {
    this.http.patch(`${environment.apiUrl}/superadmin/feedbacks/${fb.id}/status`, { status: fb.status }).subscribe();
  }
}
