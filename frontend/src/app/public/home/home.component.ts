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
        <p class="hero-sub">{{ 'public.home_subtitle' | translate }}</p>

        <div class="role-cards">
          <div class="role-card">
            <mat-icon>home_work</mat-icon>
            <h2>{{ 'public.owner_title' | translate }}</h2>
            <p>{{ 'public.owner_desc' | translate }}</p>
            <a mat-raised-button [routerLink]="['/admin/login']" [queryParams]="{type: 'owner'}" class="btn-primary">
              <mat-icon>login</mat-icon> {{ 'public.login_button' | translate }}
            </a>
            <a mat-button routerLink="/admin/register" class="btn-register">
              {{ 'login.sign_up' | translate }}
            </a>
          </div>

          <div class="role-card">
            <mat-icon>cleaning_services</mat-icon>
            <h2>{{ 'public.housekeeper_title' | translate }}</h2>
            <p>{{ 'public.housekeeper_desc' | translate }}</p>
            <p class="hint">{{ 'public.housekeeper_hint' | translate }}</p>
            <a mat-raised-button [routerLink]="['/admin/login']" [queryParams]="{type: 'housekeeper'}" class="btn-primary">
              <mat-icon>login</mat-icon> {{ 'public.login_button' | translate }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="faq-link-bar">
      <a mat-button routerLink="/public/faq" class="faq-link">
        <mat-icon>quiz</mat-icon> {{ 'faq.title' | translate }}
      </a>
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
      padding: 60px 24px 80px;
      text-align: center;
    }
    .hero-lang {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .hero-logo { width: 200px; height: auto; filter: brightness(0) invert(1); margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }
    .hero h1 { font-size: 38px; margin: 0 0 12px; font-weight: 700; }
    .hero-sub { font-size: 18px; opacity: 0.85; margin: 0 0 40px; }

    .role-cards {
      display: flex;
      gap: 24px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .role-card {
      background: white;
      border-radius: 16px;
      padding: 28px 24px;
      width: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      color: #333;
    }
    .role-card mat-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #0288d1;
    }
    .role-card h2 { margin: 0; font-size: 17px; font-weight: 700; color: #111; }
    .role-card p { margin: 0; font-size: 13px; color: #555; line-height: 1.5; }
    .hint { font-size: 12px !important; color: #999 !important; font-style: italic; }
    .btn-primary {
      background: #0288d1 !important;
      color: white !important;
      font-weight: 600;
      width: 100%;
      margin-top: 6px;
    }
    .btn-primary mat-icon { margin-right: 4px; font-size: 18px; height: 18px; width: 18px; vertical-align: middle; }
    .btn-register { color: #0288d1 !important; font-size: 13px; }

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

    .faq-link-bar { text-align: center; padding: 24px 0 0; }
    .faq-link { color: #0288d1; font-size: 15px; font-weight: 500; }
    .faq-link mat-icon { vertical-align: middle; margin-right: 4px; font-size: 18px; height: 18px; width: 18px; }
    @media (max-width: 700px) {
      .features { grid-template-columns: 1fr; }
      .hero h1 { font-size: 26px; }
      .hero { padding: 48px 16px 60px; }
      .role-card { width: 100%; max-width: 320px; }
    }
  `]
})
export class HomeComponent {}
