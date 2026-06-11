import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule, MatIconModule, MatInputModule, MatFormFieldModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="page-header">
      <mat-icon class="header-icon">quiz</mat-icon>
      <div>
        <h2>{{ 'faq.title' | translate }}</h2>
        <p class="subtitle">{{ 'faq.subtitle' | translate }}</p>
      </div>
    </div>

    @if (!loading()) {
      <mat-form-field appearance="outline" class="search-field">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [ngModel]="query()" (ngModelChange)="query.set($event)" [placeholder]="'faq.search' | translate" />
        @if (query()) {
          <button matSuffix mat-icon-button (click)="query.set('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
    }

    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="40" /></div>
    } @else if (filtered().length === 0) {
      <p class="empty">{{ query() ? ('faq.no_results' | translate) : ('faq.no_items' | translate) }}</p>
    } @else {
      <mat-accordion class="faq-accordion">
        @for (item of filtered(); track item.id) {
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
    .page-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
    .header-icon { font-size: 36px; width: 36px; height: 36px; color: #0288d1; margin-top: 2px; }
    .page-header h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .subtitle { margin: 0; color: #666; font-size: 14px; }
    .search-field { width: 100%; margin-bottom: 16px; }
    .faq-accordion { border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .faq-panel { border-radius: 0 !important; }
    .faq-question { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .faq-answer { font-size: 14px; color: #444; line-height: 1.7; margin: 0; white-space: pre-wrap; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #999; padding: 40px 0; font-size: 15px; }
  `]
})
export class AdminFaqComponent implements OnInit {
  allItems = signal<any[]>([]);
  loading  = signal(true);
  query    = signal('');

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter(i =>
      i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)
    );
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/public/faq`).subscribe({
      next: list => { this.allItems.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
