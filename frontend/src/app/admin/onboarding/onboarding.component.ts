import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="onboarding-page">
      <h2>{{ 'onboarding.title' | translate }}</h2>
      <p class="subtitle">{{ 'onboarding.subtitle' | translate }}</p>

      <div class="choices">
        <mat-card class="choice-card" (click)="selectChannel('BEDS24')" [class.selected]="selected() === 'BEDS24'">
          <mat-icon class="choice-icon">sync</mat-icon>
          <h3>{{ 'onboarding.beds24_title' | translate }}</h3>
          <p>{{ 'onboarding.beds24_desc' | translate }}</p>
        </mat-card>

        <mat-card class="choice-card" (click)="selectChannel('ICAL')" [class.selected]="selected() === 'ICAL'">
          <mat-icon class="choice-icon">calendar_today</mat-icon>
          <h3>{{ 'onboarding.ical_title' | translate }}</h3>
          <p>{{ 'onboarding.ical_desc' | translate }}</p>
        </mat-card>
      </div>

      @if (selected()) {
        <button mat-raised-button color="primary" class="confirm-btn"
                (click)="confirm()" [disabled]="loading()">
          @if (loading()) { <mat-spinner diameter="20" /> }
          @else { {{ 'onboarding.confirm' | translate }} }
        </button>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
  styles: [`
    .onboarding-page {
      max-width: 680px;
      margin: 0 auto;
      padding: 32px 16px;
      text-align: center;
    }
    h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 15px; margin-bottom: 32px; }
    .choices {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 28px;
    }
    .choice-card {
      width: 260px;
      padding: 28px 20px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.2s, box-shadow 0.2s;
      text-align: center;
    }
    .choice-card:hover { box-shadow: 0 4px 16px rgba(2,136,209,0.15); }
    .choice-card.selected { border-color: #0288d1; box-shadow: 0 4px 16px rgba(2,136,209,0.2); }
    .choice-icon { font-size: 48px; width: 48px; height: 48px; color: #0288d1; margin-bottom: 12px; }
    h3 { font-size: 17px; font-weight: 600; margin: 0 0 8px; }
    p { font-size: 13px; color: #666; margin: 0; line-height: 1.5; }
    .confirm-btn { margin-top: 8px; padding: 0 32px; height: 44px; font-size: 15px; }
    .error { color: #d32f2f; margin-top: 12px; font-size: 13px; }
  `]
})
export class OnboardingComponent {
  selected = signal<'BEDS24' | 'ICAL' | null>(null);
  loading = signal(false);
  error = signal('');

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  selectChannel(type: 'BEDS24' | 'ICAL'): void {
    this.selected.set(type);
  }

  confirm(): void {
    const type = this.selected();
    if (!type) return;
    this.loading.set(true);
    this.error.set('');
    this.http.post<any>(`${environment.apiUrl}/user/channel`, { channelType: type }).subscribe({
      next: resp => {
        // Mise à jour du localStorage avec le channelType
        const user = this.auth.getCurrentUser();
        if (user) {
          user.channelType = type;
          localStorage.setItem('flr_user', JSON.stringify(user));
        }
        if (type === 'BEDS24') {
          this.router.navigate(['/admin/settings']);
        } else {
          this.router.navigate(['/admin/properties']);
        }
      },
      error: () => {
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }
}
