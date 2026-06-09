import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../../core/components/lang-switcher.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslateModule, LangSwitcherComponent],
  template: `
    <div class="hero">
      <div class="hero-lang">
        <app-lang-switcher />
      </div>
      <div class="hero-content">
        <img src="assets/logo.svg" alt="FlowlyRent" class="hero-logo" />
        <h1>{{ 'public.home_title' | translate }}</h1>
        <p>{{ 'public.home_subtitle' | translate }}</p>
        <div class="hero-actions">
          <a mat-raised-button routerLink="/admin/login" class="btn-login">
            <mat-icon>login</mat-icon> {{ 'public.login_button' | translate }}
          </a>
          <p class="login-hint">{{ 'public.login_hint' | translate }}</p>
        </div>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <mat-icon>sync</mat-icon>
        <h3>{{ 'public.feature_sync_title' | translate }}</h3>
        <p>{{ 'public.feature_sync_desc' | translate }}</p>
      </div>
      <div class="feature">
        <mat-icon>cleaning_services</mat-icon>
        <h3>{{ 'public.feature_cleaning_title' | translate }}</h3>
        <p>{{ 'public.feature_cleaning_desc' | translate }}</p>
      </div>
      <div class="feature">
        <mat-icon>assessment</mat-icon>
        <h3>{{ 'public.feature_reports_title' | translate }}</h3>
        <p>{{ 'public.feature_reports_desc' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      position: relative;
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
      color: white;
      padding: 80px 24px 100px;
      text-align: center;
    }
    .hero-lang {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .hero-logo { width: 240px; height: auto; filter: brightness(0) invert(1); margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto; }
    .hero h1 { font-size: 44px; margin: 0 0 16px; font-weight: 700; }
    .hero p { font-size: 20px; opacity: 0.85; margin: 0 0 40px; }
    .hero-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .login-hint { margin: 0; font-size: 13px; opacity: 0.7; letter-spacing: 0.5px; }
    .btn-login {
      background: white !important;
      color: #0288d1 !important;
      font-weight: 600;
      font-size: 15px;
      padding: 8px 28px;
    }
    .btn-login mat-icon { margin-right: 6px; }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      max-width: 960px;
      margin: 64px auto;
      padding: 0 24px;
    }
    .feature {
      text-align: center;
      padding: 32px 16px;
      border-radius: 12px;
      background: #f8f9ff;
    }
    .feature mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #0288d1;
      margin-bottom: 16px;
    }
    .feature h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .feature p { margin: 0; color: #555; line-height: 1.6; }

    @media (max-width: 700px) {
      .features { grid-template-columns: 1fr; }
      .hero h1 { font-size: 28px; }
      .hero { padding: 60px 24px 80px; }
    }
  `]
})
export class HomeComponent {}
