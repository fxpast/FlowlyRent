import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-faq',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="page-header">
      <mat-icon class="header-icon">quiz</mat-icon>
      <div>
        <h2>{{ 'faq.title' | translate }}</h2>
        <p class="subtitle">{{ 'faq.subtitle' | translate }}</p>
      </div>
    </div>

    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="40" /></div>
    } @else if (items().length === 0) {
      <p class="empty">{{ 'faq.no_items' | translate }}</p>
    } @else {
      <mat-accordion class="faq-accordion">
        @for (item of items(); track item.id) {
          <mat-expansion-panel class="faq-panel">
            <mat-expansion-panel-header>
              <mat-panel-title class="faq-question">{{ item.question }}</mat-panel-title>
            </mat-expansion-panel-header>
            <p class="faq-answer">{{ item.answer }}</p>
          </mat-expansion-panel>
        }
      </mat-accordion>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px; }
    .header-icon { font-size: 36px; width: 36px; height: 36px; color: #0288d1; margin-top: 2px; }
    .page-header h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .subtitle { margin: 0; color: #666; font-size: 14px; }
    .faq-accordion { border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .faq-panel { border-radius: 0 !important; }
    .faq-question { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .faq-answer { font-size: 14px; color: #444; line-height: 1.7; margin: 0; white-space: pre-wrap; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #999; padding: 40px 0; font-size: 15px; }
  `]
})
export class AdminFaqComponent implements OnInit {
  items   = signal<any[]>([]);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/public/faq`).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
