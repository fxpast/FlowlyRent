import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../../core/components/lang-switcher.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatExpansionModule, MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatProgressSpinnerModule, TranslateModule, LangSwitcherComponent],
  template: `
    <div class="page">
      <div class="header">
        <div class="header-top">
          <a mat-button routerLink="/public/home" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
            <span>{{ 'public.home_title_short' | translate }}</span>
          </a>
          <app-lang-switcher />
        </div>
        <h1>{{ 'faq.title' | translate }}</h1>
        <p>{{ 'faq.subtitle' | translate }}</p>
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
      </div>

      <div class="content">
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
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f7fa; }
    .header {
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
      color: white; padding: 16px 24px 32px; text-align: center; position: relative;
    }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .back-btn { color: white; display: flex; align-items: center; gap: 4px; }
    .header h1 { font-size: 32px; margin: 0 0 8px; font-weight: 700; }
    .header p { font-size: 16px; opacity: 0.85; margin: 0 0 20px; }
    .search-field {
      width: 100%; max-width: 560px;
      background: white; border-radius: 8px;
    }
    .search-field ::ng-deep .mat-mdc-form-field-flex { background: white; border-radius: 8px; }
    .content { max-width: 760px; margin: -24px auto 48px; padding: 0 16px; }
    .faq-accordion { border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .faq-panel { border-radius: 0 !important; }
    .faq-question { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .faq-answer { font-size: 14px; color: #444; line-height: 1.7; margin: 0; white-space: pre-wrap; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #999; padding: 40px 0; }
    @media (max-width: 600px) { .header h1 { font-size: 24px; } }
  `]
})
export class FaqComponent implements OnInit {
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

  constructor(private http: HttpClient, private translate: TranslateService) {}

  ngOnInit(): void {
    this.load();
    this.translate.onLangChange.subscribe(() => this.load());
  }

  private load(): void {
    const lang = this.translate.currentLang || 'fr';
    this.http.get<any[]>(`${environment.apiUrl}/public/faq?lang=${lang}`).subscribe({
      next: list => { this.allItems.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
