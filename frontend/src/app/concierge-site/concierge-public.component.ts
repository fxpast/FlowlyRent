import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConciergeSiteService } from './concierge-site.service';

@Component({
  selector: 'app-concierge-public',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    @if (loading()) {
      <div class="loading-screen"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (notFound()) {
      <div class="not-found-screen">
        <mat-icon>storefront</mat-icon>
        <p>{{ 'concierge_pub.not_found' | translate }}</p>
      </div>
    } @else {
      <div class="page">
        <!-- Lang switcher -->
        <div class="lang-bar">
          @for (l of langs; track l) {
            <button class="lang-btn" [class.active]="currentLang === l" (click)="switchLang(l)">{{ l.toUpperCase() }}</button>
          }
        </div>

        <!-- Hero -->
        <section class="hero" [style.background-image]="heroBackground()">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            @if (info.companyLogoUrl) { <img [src]="info.companyLogoUrl" class="hero-logo" alt=""> }
            <h1>{{ info.heroTitle || info.companyName }}</h1>
            @if (info.heroSubtitle) { <p class="hero-subtitle">{{ info.heroSubtitle }}</p> }
            <button mat-flat-button class="cta-btn" (click)="scrollToContact()">
              {{ info.ctaButtonText || ('concierge_pub.default_cta' | translate) }}
            </button>
          </div>
        </section>

        <!-- Pitch -->
        @if (info.pitch) {
          <section class="pitch-section">
            <p>{{ info.pitch }}</p>
          </section>
        }

        <!-- Services -->
        @if (info.services?.length) {
          <section class="services-section">
            <h2>{{ 'concierge_pub.services_title' | translate }}</h2>
            <div class="services-grid">
              @for (s of info.services; track $index) {
                <div class="service-card">
                  @if (s.icon) { <mat-icon class="service-icon">{{ s.icon }}</mat-icon> }
                  <h3>{{ s.title }}</h3>
                  <p>{{ s.description }}</p>
                </div>
              }
            </div>
          </section>
        }

        <!-- Stats -->
        @if (info.stats?.length) {
          <section class="stats-section">
            @for (s of info.stats; track $index) {
              <div class="stat-item">
                <div class="stat-number">{{ s.number }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            }
          </section>
        }

        <!-- Comment ça marche -->
        @if (info.steps?.length) {
          <section class="steps-section">
            <h2>{{ 'concierge_pub.steps_title' | translate }}</h2>
            <div class="steps-list">
              @for (s of info.steps; track $index) {
                <div class="step-item">
                  <div class="step-num">{{ $index + 1 }}</div>
                  <h3>{{ s.title }}</h3>
                  <p>{{ s.description }}</p>
                </div>
              }
            </div>
          </section>
        }

        <!-- Tarification -->
        @if (info.pricingText) {
          <section class="pricing-section">
            <h2>{{ 'concierge_pub.pricing_title' | translate }}</h2>
            <p>{{ info.pricingText }}</p>
          </section>
        }

        <!-- Témoignages -->
        @if (info.testimonials?.length) {
          <section class="testimonials-section">
            <h2>{{ 'concierge_pub.testimonials_title' | translate }}</h2>
            <div class="testimonials-grid">
              @for (t of info.testimonials; track $index) {
                <div class="testimonial-card">
                  <mat-icon class="quote-icon">format_quote</mat-icon>
                  <p>{{ t.text }}</p>
                  <strong>{{ t.authorName }}</strong>
                </div>
              }
            </div>
          </section>
        }

        <!-- Formulaire de contact -->
        <section class="contact-section" id="contact">
          <h2>{{ 'concierge_pub.contact_title' | translate }}</h2>
          @if (leadSent()) {
            <div class="lead-success">
              <mat-icon>check_circle</mat-icon>
              <p>{{ 'concierge_pub.lead_success' | translate }}</p>
            </div>
          } @else {
            <div class="contact-form">
              <div class="field-wrap">
                <label>{{ 'concierge_pub.owner_name' | translate }} *</label>
                <input class="text-input" [(ngModel)]="lead.ownerName">
              </div>
              <div class="field-row">
                <div class="field-wrap">
                  <label>{{ 'concierge_pub.owner_phone' | translate }}</label>
                  <input class="text-input" type="tel" [(ngModel)]="lead.ownerPhone">
                </div>
                <div class="field-wrap">
                  <label>{{ 'concierge_pub.owner_email' | translate }}</label>
                  <input class="text-input" type="email" [(ngModel)]="lead.ownerEmail">
                </div>
              </div>
              <div class="field-wrap">
                <label>{{ 'concierge_pub.property_city' | translate }}</label>
                <input class="text-input" [(ngModel)]="lead.propertyCity">
              </div>
              <div class="field-wrap">
                <label>{{ 'concierge_pub.message' | translate }}</label>
                <textarea class="text-input" rows="4" [(ngModel)]="lead.message"></textarea>
              </div>
              @if (leadError()) {
                <div class="error-box">{{ leadError() }}</div>
              }
              <button mat-flat-button class="cta-btn submit-btn" [disabled]="!lead.ownerName.trim() || sending()" (click)="submitLead()">
                @if (sending()) { <mat-spinner diameter="20"></mat-spinner> }
                @else { {{ 'concierge_pub.submit' | translate }} }
              </button>
            </div>
          }
        </section>

        <!-- Footer -->
        <footer class="footer">
          <div class="footer-name">{{ info.companyName || (info.firstName + ' ' + info.lastName) }}</div>
          <div class="footer-contacts">
            @if (info.phone) { <a [href]="'tel:' + info.phone"><mat-icon>call</mat-icon> {{ info.phone }}</a> }
            @if (info.email) { <a [href]="'mailto:' + info.email"><mat-icon>email</mat-icon> {{ info.email }}</a> }
            @if (info.contactWhatsapp) {
              <a [href]="'https://wa.me/' + info.contactWhatsapp.replace('+','')" target="_blank">
                <mat-icon>chat</mat-icon> WhatsApp
              </a>
            }
          </div>
          <div class="footer-brand">{{ 'concierge_pub.powered_by' | translate }}</div>
        </footer>
      </div>
    }
  `,
  styles: [`
    :host { display: block; font-family: 'Roboto', sans-serif; color: #eaeef2; }
    .loading-screen, .not-found-screen {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #0f1b2d; color: #eaeef2; gap: 12px;
    }
    .not-found-screen mat-icon { font-size: 48px; width: 48px; height: 48px; color: #c9a24b; }

    .page { background: #0f1b2d; min-height: 100vh; }

    .lang-bar { position: absolute; top: 16px; right: 16px; z-index: 10; display: flex; gap: 4px; }
    .lang-btn {
      background: rgba(255,255,255,.1); color: #eaeef2; border: 1px solid rgba(255,255,255,.3);
      border-radius: 4px; padding: 4px 8px; font-size: .72rem; font-weight: 600; cursor: pointer;
    }
    .lang-btn.active { background: #c9a24b; color: #0f1b2d; border-color: #c9a24b; }

    .hero {
      position: relative; min-height: 80vh; display: flex; align-items: center; justify-content: center;
      background-size: cover; background-position: center; text-align: center; padding: 60px 20px;
    }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,27,45,.75), rgba(15,27,45,.92)); }
    .hero-content { position: relative; z-index: 1; max-width: 700px; }
    .hero-logo { max-height: 60px; margin-bottom: 20px; border-radius: 8px; }
    .hero h1 { font-size: 2.4rem; font-weight: 800; margin: 0 0 16px; line-height: 1.2; }
    .hero-subtitle { font-size: 1.15rem; color: #c7d0da; margin: 0 0 28px; }
    .cta-btn { background: #c9a24b !important; color: #0f1b2d !important; font-weight: 700; height: 48px; padding: 0 32px; font-size: 1rem; }

    .pitch-section { max-width: 700px; margin: 0 auto; padding: 60px 24px; text-align: center; font-size: 1.15rem; line-height: 1.7; color: #c7d0da; white-space: pre-wrap; }

    .services-section, .steps-section, .pricing-section, .testimonials-section, .contact-section {
      max-width: 1000px; margin: 0 auto; padding: 60px 24px;
    }
    .services-section h2, .steps-section h2, .pricing-section h2, .testimonials-section h2, .contact-section h2 {
      text-align: center; font-size: 1.8rem; font-weight: 700; margin: 0 0 40px; color: #fff;
    }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 24px; }
    .service-card {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px; padding: 28px 20px; text-align: center;
    }
    .service-icon { font-size: 36px; width: 36px; height: 36px; color: #c9a24b; margin-bottom: 12px; }
    .service-card h3 { font-size: 1.1rem; margin: 0 0 8px; color: #fff; }
    .service-card p { color: #b8c2cc; font-size: .92rem; line-height: 1.5; margin: 0; }

    .stats-section {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 48px;
      background: rgba(201,162,75,.08); padding: 48px 24px; text-align: center;
    }
    .stat-number { font-size: 2.2rem; font-weight: 800; color: #c9a24b; }
    .stat-label { color: #c7d0da; font-size: .9rem; margin-top: 4px; }

    .steps-list { display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; }
    .step-item { flex: 1; min-width: 200px; max-width: 260px; text-align: center; }
    .step-num {
      width: 40px; height: 40px; border-radius: 50%; background: #c9a24b; color: #0f1b2d;
      display: flex; align-items: center; justify-content: center; font-weight: 800; margin: 0 auto 12px;
    }
    .step-item h3 { color: #fff; font-size: 1.05rem; margin: 0 0 6px; }
    .step-item p { color: #b8c2cc; font-size: .9rem; margin: 0; }

    .pricing-section { text-align: center; }
    .pricing-section p { color: #c7d0da; font-size: 1.05rem; line-height: 1.7; white-space: pre-wrap; }

    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .testimonial-card {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px; padding: 24px; position: relative;
    }
    .quote-icon { color: #c9a24b; opacity: .5; }
    .testimonial-card p { color: #d5dde4; font-style: italic; margin: 8px 0 12px; white-space: pre-wrap; }
    .testimonial-card strong { color: #fff; font-size: .9rem; }

    .contact-form { max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
    .field-row { display: flex; gap: 12px; }
    .field-row .field-wrap { flex: 1; }
    .field-wrap { display: flex; flex-direction: column; gap: 4px; }
    .field-wrap label { font-size: .82rem; color: #c7d0da; }
    .text-input {
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); border-radius: 8px;
      padding: 10px 12px; color: #fff; font-size: .95rem; font-family: inherit;
    }
    .text-input:focus { outline: none; border-color: #c9a24b; }
    .submit-btn { width: 100%; margin-top: 8px; }
    .error-box { background: rgba(198,40,40,.15); color: #ef9a9a; border-radius: 8px; padding: 10px 14px; font-size: .85rem; }
    .lead-success { text-align: center; color: #a5d6a7; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .lead-success mat-icon { font-size: 40px; width: 40px; height: 40px; }

    .footer {
      border-top: 1px solid rgba(255,255,255,.1); padding: 32px 24px; text-align: center;
      display: flex; flex-direction: column; gap: 10px; color: #8a97a5; font-size: .85rem;
    }
    .footer-name { color: #fff; font-weight: 600; font-size: 1rem; }
    .footer-contacts { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
    .footer-contacts a { color: #c7d0da; text-decoration: none; display: flex; align-items: center; gap: 4px; }
    .footer-contacts mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .footer-brand { opacity: .6; }

    @media (max-width: 600px) {
      .hero h1 { font-size: 1.8rem; }
      .field-row { flex-direction: column; }
    }
  `]
})
export class ConciergePublicComponent implements OnInit {
  slug = '';
  info: any = {};
  loading = signal(true);
  notFound = signal(false);

  lead = { ownerName: '', ownerEmail: '', ownerPhone: '', propertyCity: '', message: '' };
  sending = signal(false);
  leadSent = signal(false);
  leadError = signal('');

  langs = ['fr', 'en', 'es', 'de', 'it'];
  currentLang = 'fr';

  constructor(
    private route: ActivatedRoute,
    private svc: ConciergeSiteService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initLang();
    this.slug = this.route.snapshot.params['slug'];
    this.svc.getInfo(this.slug).subscribe({
      next: info => { this.info = info; this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
  }

  heroBackground(): string {
    return this.info.heroImageUrl ? `url(${this.info.heroImageUrl})` : 'none';
  }

  scrollToContact(): void {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  submitLead(): void {
    if (!this.lead.ownerName.trim() || this.sending()) return;
    this.sending.set(true);
    this.leadError.set('');
    this.svc.submitLead(this.slug, this.lead).subscribe({
      next: () => { this.sending.set(false); this.leadSent.set(true); },
      error: err => {
        this.sending.set(false);
        this.leadError.set(err?.error?.error ?? this.translate.instant('concierge_pub.lead_error'));
      }
    });
  }

  initLang(): void {
    const saved = localStorage.getItem('concierge_lang');
    const browser = navigator.language.slice(0, 2);
    const lang = this.langs.includes(saved ?? '') ? saved! : this.langs.includes(browser) ? browser : 'fr';
    this.currentLang = lang;
    this.translate.use(lang);
  }

  switchLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('concierge_lang', lang);
  }
}
