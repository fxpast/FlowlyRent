import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';

const CATEGORIES = [
  { value: 'bug',          labelKey: 'feedback.category_bug',          icon: 'bug_report' },
  { value: 'amélioration', labelKey: 'feedback.category_amélioration', icon: 'trending_up' },
  { value: 'suggestion',   labelKey: 'feedback.category_suggestion',   icon: 'lightbulb' },
  { value: 'autre',        labelKey: 'feedback.category_autre',        icon: 'help_outline' },
];

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <h2>{{ 'feedback.title' | translate }}</h2>
    <p class="subtitle">{{ 'feedback.subtitle' | translate }}</p>

    @if (sent()) {
      <mat-card class="success-card">
        <mat-icon>check_circle</mat-icon>
        <div>
          <strong>{{ 'feedback.thanks_title' | translate }}</strong>
          <p>{{ 'feedback.thanks_body' | translate }}</p>
        </div>
        <button mat-stroked-button (click)="reset()">{{ 'feedback.send_another' | translate }}</button>
      </mat-card>
    } @else {
      <mat-card class="feedback-card">
        <mat-card-content>
          <div class="category-grid">
            @for (cat of categories; track cat.value) {
              <button class="cat-btn" [class.selected]="form.category === cat.value"
                      (click)="form.category = cat.value">
                <mat-icon>{{ cat.icon }}</mat-icon>
                <span>{{ cat.labelKey | translate }}</span>
              </button>
            }
          </div>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>{{ 'feedback.message_label' | translate }}</mat-label>
            <textarea matInput [(ngModel)]="form.message" rows="6"
              [placeholder]="'feedback.message_label' | translate"></textarea>
            <mat-hint align="end">{{ form.message.length }} / 2000</mat-hint>
          </mat-form-field>

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="submit()"
            [disabled]="loading() || !form.category || form.message.trim().length < 10">
            @if (loading()) { <mat-spinner diameter="18" /> }
            @else { <mat-icon>send</mat-icon> {{ 'common.send' | translate }} }
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    h2 { margin: 0 0 8px; font-size: 24px; font-weight: 500; }
    .subtitle { color: #666; margin: 0 0 28px; font-size: 14px; }
    .feedback-card { max-width: 680px; }
    mat-card-content { padding-top: 20px; }
    .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .cat-btn {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      border: 2px solid #e0e0e0; border-radius: 10px; background: white;
      cursor: pointer; font-size: 14px; font-weight: 500; color: #333;
      transition: border-color 0.15s, background 0.15s; text-align: left;
    }
    .cat-btn mat-icon { color: #666; }
    .cat-btn:hover { border-color: #1976d2; background: #f0f7ff; }
    .cat-btn.selected { border-color: #1976d2; background: #e3f2fd; color: #1976d2; }
    .cat-btn.selected mat-icon { color: #1976d2; }
    .full-width { width: 100%; }
    mat-card-actions { padding: 0 16px 16px; }
    .error { color: #d32f2f; font-size: 13px; margin: 0 0 8px; }
    .success-card {
      display: flex; align-items: center; gap: 16px; padding: 24px;
      max-width: 680px; background: #e8f5e9;
    }
    .success-card mat-icon { font-size: 40px; width: 40px; height: 40px; color: #2e7d32; flex-shrink: 0; }
    .success-card strong { font-size: 16px; color: #1b5e20; }
    .success-card p { margin: 4px 0 0; color: #388e3c; font-size: 14px; }
    .success-card div { flex: 1; }
  `]
})
export class FeedbackComponent {
  categories = CATEGORIES;
  form = { category: '', message: '' };
  loading = signal(false);
  error = signal('');
  sent = signal(false);

  constructor(private http: HttpClient, private t: TranslateService) {}

  submit(): void {
    if (this.form.message.length > 2000) { this.error.set(this.t.instant('feedback.msg_too_long')); return; }
    this.loading.set(true);
    this.error.set('');
    this.http.post(`${environment.apiUrl}/user/feedback`, this.form).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: () => { this.loading.set(false); this.error.set(this.t.instant('feedback.send_error')); }
    });
  }

  reset(): void { this.form = { category: '', message: '' }; this.sent.set(false); }
}
