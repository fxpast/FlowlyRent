import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../core/services/user.service';
import {
  ConciergeService, ConciergeConfig, ConciergeLead,
  ConciergeServiceItem, ConciergeStatItem, ConciergeStepItem, ConciergeTestimonialItem
} from '../../core/services/concierge.service';

@Component({
  selector: 'app-concierge',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatTabsModule, MatChipsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslateModule
  ],
  template: `
    <div class="page">
      <h1>{{ 'concierge.title' | translate }}</h1>
      <p class="subtitle">{{ 'concierge.subtitle' | translate }}</p>

      <mat-tab-group animationDuration="200ms">

        <!-- ═══════════ ONGLET CONTENU ═══════════ -->
        <mat-tab [label]="'concierge.tab_content' | translate">
          <div class="tab-content">

            <mat-card class="section-card">
              <mat-card-content>
                <div class="toggle-row">
                  <mat-slide-toggle [(ngModel)]="config.enabled">
                    {{ 'concierge.enable_page' | translate }}
                  </mat-slide-toggle>
                </div>
                @if (config.enabled && publicUrl()) {
                  <div class="url-box">
                    <mat-icon>language</mat-icon>
                    <code>{{ publicUrl() }}</code>
                    <button mat-icon-button (click)="copyUrl()" [matTooltip]="'common.copy' | translate">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <a mat-icon-button [href]="publicUrl()" target="_blank" [matTooltip]="'common.open' | translate">
                      <mat-icon>open_in_new</mat-icon>
                    </a>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.hero_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="hero-image-row">
                  @if (config.heroImageUrl) {
                    <img [src]="config.heroImageUrl" class="hero-preview" alt="">
                  } @else {
                    <div class="hero-preview hero-preview-empty">
                      <mat-icon>image</mat-icon>
                    </div>
                  }
                  <div>
                    <input #fileInput type="file" accept="image/*" hidden (change)="onHeroImageSelected($event)">
                    <button mat-stroked-button (click)="fileInput.click()" [disabled]="uploadingHero()">
                      @if (uploadingHero()) { <mat-spinner diameter="18"></mat-spinner> }
                      @else { <mat-icon>upload</mat-icon> {{ 'concierge.upload_image' | translate }} }
                    </button>
                  </div>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.hero_title' | translate }}</mat-label>
                  <input matInput [(ngModel)]="config.heroTitle">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.hero_subtitle' | translate }}</mat-label>
                  <input matInput [(ngModel)]="config.heroSubtitle">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.cta_button_text' | translate }}</mat-label>
                  <input matInput [(ngModel)]="config.ctaButtonText" [placeholder]="'concierge.cta_button_placeholder' | translate">
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.pitch_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.pitch_label' | translate }}</mat-label>
                  <textarea matInput rows="4" [(ngModel)]="config.pitch"
                            [placeholder]="'concierge.pitch_placeholder' | translate"></textarea>
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.services_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of config.services; track $index) {
                  <div class="list-row">
                    <mat-form-field appearance="outline" class="icon-field">
                      <mat-label>{{ 'concierge.icon_label' | translate }}</mat-label>
                      <mat-select [ngModel]="iconSelectValue(item.icon, $index)" (ngModelChange)="onIconSelect(item, $index, $event)">
                        <mat-option value="">{{ 'concierge.icon_none' | translate }}</mat-option>
                        @for (opt of iconPresets; track opt.value) {
                          <mat-option [value]="opt.value">
                            <mat-icon class="option-icon">{{ opt.value }}</mat-icon> {{ opt.labelKey | translate }}
                          </mat-option>
                        }
                        <mat-option value="__custom__">{{ 'concierge.icon_custom' | translate }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-icon class="icon-preview">{{ item.icon || 'help_outline' }}</mat-icon>
                    @if (iconSelectValue(item.icon, $index) === '__custom__') {
                      <mat-form-field appearance="outline" class="icon-custom-field">
                        <mat-label>{{ 'concierge.icon_custom_label' | translate }}</mat-label>
                        <input matInput [(ngModel)]="item.icon" placeholder="cleaning_services">
                      </mat-form-field>
                    }
                    <mat-form-field appearance="outline" class="title-field">
                      <mat-label>{{ 'concierge.item_title' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.title">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="desc-field">
                      <mat-label>{{ 'concierge.item_description' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.description">
                    </mat-form-field>
                    <button mat-icon-button color="warn" (click)="removeService($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                <p class="icon-hint">
                  <mat-icon class="hint-icon">info</mat-icon>
                  {{ 'concierge.icon_hint' | translate }}
                  <a href="https://fonts.google.com/icons" target="_blank">fonts.google.com/icons</a>
                </p>
                <button mat-stroked-button (click)="addService()">
                  <mat-icon>add</mat-icon> {{ 'concierge.add_service' | translate }}
                </button>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.stats_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of config.stats; track $index) {
                  <div class="list-row">
                    <mat-form-field appearance="outline" class="stat-number-field">
                      <mat-label>{{ 'concierge.stat_number' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.number" placeholder="120+">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="title-field">
                      <mat-label>{{ 'concierge.stat_label' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.label" [placeholder]="'concierge.stat_label_placeholder' | translate">
                    </mat-form-field>
                    <button mat-icon-button color="warn" (click)="removeStat($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                <button mat-stroked-button (click)="addStat()">
                  <mat-icon>add</mat-icon> {{ 'concierge.add_stat' | translate }}
                </button>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.steps_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of config.steps; track $index) {
                  <div class="list-row">
                    <span class="step-number">{{ $index + 1 }}</span>
                    <mat-form-field appearance="outline" class="title-field">
                      <mat-label>{{ 'concierge.item_title' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.title">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="desc-field">
                      <mat-label>{{ 'concierge.item_description' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.description">
                    </mat-form-field>
                    <button mat-icon-button color="warn" (click)="removeStep($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                <button mat-stroked-button (click)="addStep()">
                  <mat-icon>add</mat-icon> {{ 'concierge.add_step' | translate }}
                </button>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.pricing_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.pricing_label' | translate }}</mat-label>
                  <textarea matInput rows="3" [(ngModel)]="config.pricingText"
                            [placeholder]="'concierge.pricing_placeholder' | translate"></textarea>
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.testimonials_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of config.testimonials; track $index) {
                  <div class="list-row">
                    <mat-form-field appearance="outline" class="title-field">
                      <mat-label>{{ 'concierge.testimonial_author' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.authorName">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="desc-field">
                      <mat-label>{{ 'concierge.testimonial_text' | translate }}</mat-label>
                      <input matInput [(ngModel)]="item.text">
                    </mat-form-field>
                    <button mat-icon-button color="warn" (click)="removeTestimonial($index)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                <button mat-stroked-button (click)="addTestimonial()">
                  <mat-icon>add</mat-icon> {{ 'concierge.add_testimonial' | translate }}
                </button>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card">
              <mat-card-header><mat-card-title>{{ 'concierge.contact_section' | translate }}</mat-card-title></mat-card-header>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'concierge.whatsapp_label' | translate }}</mat-label>
                  <input matInput [(ngModel)]="config.contactWhatsapp" placeholder="+33612345678">
                  <mat-hint>{{ 'concierge.whatsapp_hint' | translate }}</mat-hint>
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <div class="save-bar">
              <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
                @if (saving()) { <mat-spinner diameter="20"></mat-spinner> }
                @else { {{ 'common.save' | translate }} }
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- ═══════════ ONGLET DEMANDES ═══════════ -->
        <mat-tab [label]="'concierge.tab_leads' | translate">
          <div class="tab-content">
            @if (loadingLeads()) {
              <div class="center"><mat-spinner diameter="36"></mat-spinner></div>
            } @else if (leads().length === 0) {
              <p class="no-leads">{{ 'concierge.no_leads' | translate }}</p>
            } @else {
              @for (lead of leads(); track lead.id) {
                <mat-card class="lead-card">
                  <mat-card-content>
                    <div class="lead-header">
                      <strong>{{ lead.ownerName }}</strong>
                      <span class="lead-status" [class.status-new]="lead.status === 'NEW'"
                            [class.status-contacted]="lead.status === 'CONTACTED'"
                            [class.status-closed]="lead.status === 'CLOSED'">
                        {{ ('concierge.status_' + lead.status.toLowerCase()) | translate }}
                      </span>
                      <span class="lead-date">{{ lead.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <div class="lead-details">
                      @if (lead.ownerPhone) { <span><mat-icon>phone</mat-icon> {{ lead.ownerPhone }}</span> }
                      @if (lead.ownerEmail) { <span><mat-icon>email</mat-icon> {{ lead.ownerEmail }}</span> }
                      @if (lead.propertyCity) { <span><mat-icon>place</mat-icon> {{ lead.propertyCity }}</span> }
                    </div>
                    @if (lead.message) {
                      <p class="lead-message">{{ lead.message }}</p>
                    }
                    <div class="lead-actions">
                      @if (lead.status !== 'CONTACTED') {
                        <button mat-stroked-button (click)="setLeadStatus(lead, 'CONTACTED')">
                          {{ 'concierge.mark_contacted' | translate }}
                        </button>
                      }
                      @if (lead.status !== 'CLOSED') {
                        <button mat-stroked-button (click)="setLeadStatus(lead, 'CLOSED')">
                          {{ 'concierge.mark_closed' | translate }}
                        </button>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page { padding: 16px 24px 40px; max-width: 900px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { color: #666; margin: 0 0 20px; }
    .tab-content { padding: 20px 4px; display: flex; flex-direction: column; gap: 16px; }
    .section-card { }
    .full-width { width: 100%; }
    .toggle-row { display: flex; align-items: center; }
    .url-box {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      background: #f5f7fa; border-radius: 8px; padding: 8px 12px;
    }
    .url-box code { flex: 1; overflow-x: auto; white-space: nowrap; }

    .hero-image-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .hero-preview { width: 160px; height: 90px; object-fit: cover; border-radius: 8px; background: #eee; }
    .hero-preview-empty { display: flex; align-items: center; justify-content: center; color: #999; }

    .list-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .icon-field { width: 200px; }
    .icon-custom-field { width: 160px; }
    .option-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 6px; }
    .icon-preview { color: #666; }
    .icon-hint { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: #888; margin: 4px 0 12px; }
    .hint-icon { font-size: 16px; width: 16px; height: 16px; }
    .title-field { width: 200px; flex: 1; }
    .desc-field { flex: 2; min-width: 200px; }
    .stat-number-field { width: 100px; }
    .step-number {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%; background: #0288d1; color: #fff;
      font-weight: 700; font-size: .85rem; flex-shrink: 0;
    }

    .save-bar { position: sticky; bottom: 0; background: #fff; padding: 12px 0; }

    .center { display: flex; justify-content: center; padding: 24px; }
    .no-leads { color: #888; padding: 24px; text-align: center; }
    .lead-card { margin-bottom: 10px; }
    .lead-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
    .lead-date { margin-left: auto; color: #888; font-size: .85rem; }
    .lead-status { font-size: .75rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .status-new { background: #e3f2fd; color: #0d47a1; }
    .status-contacted { background: #fff8e1; color: #f57c00; }
    .status-closed { background: #e8f5e9; color: #2e7d32; }
    .lead-details { display: flex; gap: 16px; flex-wrap: wrap; color: #555; font-size: .9rem; margin-bottom: 6px; }
    .lead-details mat-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 2px; }
    .lead-message { color: #444; white-space: pre-wrap; margin: 6px 0; }
    .lead-actions { display: flex; gap: 8px; }
  `]
})
export class ConciergeComponent implements OnInit {
  config: ConciergeConfig = {
    enabled: false,
    heroTitle: '', heroSubtitle: '', heroImageUrl: '', pitch: '', pricingText: '',
    contactWhatsapp: '', ctaButtonText: '',
    services: [], stats: [], steps: [], testimonials: []
  };

  iconPresets: { value: string; labelKey: string }[] = [
    { value: 'cleaning_services',      labelKey: 'concierge.icon_cleaning' },
    { value: 'key',                    labelKey: 'concierge.icon_keys' },
    { value: 'support_agent',          labelKey: 'concierge.icon_support' },
    { value: 'payments',               labelKey: 'concierge.icon_payments' },
    { value: 'photo_camera',           labelKey: 'concierge.icon_photo' },
    { value: 'trending_up',            labelKey: 'concierge.icon_pricing' },
    { value: 'build',                  labelKey: 'concierge.icon_maintenance' },
    { value: 'local_laundry_service',  labelKey: 'concierge.icon_laundry' },
    { value: 'calendar_month',         labelKey: 'concierge.icon_calendar' },
    { value: 'chat',                   labelKey: 'concierge.icon_chat' },
    { value: 'security',               labelKey: 'concierge.icon_security' },
    { value: 'star',                   labelKey: 'concierge.icon_reviews' },
    { value: 'home_work',              labelKey: 'concierge.icon_multiprop' },
    { value: 'language',               labelKey: 'concierge.icon_multilang' },
    { value: 'schedule',               labelKey: 'concierge.icon_available' }
  ];

  /** Lignes où l'hôte a explicitement choisi "Personnalisé…" — état indépendant de item.icon
   *  car une valeur vide (en cours de saisie) ne doit pas faire disparaître le champ texte. */
  private customIconRows = new Set<number>();

  isCustomIcon(icon: string): boolean {
    return !!icon && !this.iconPresets.some(p => p.value === icon);
  }

  iconSelectValue(icon: string, index: number): string {
    if (this.customIconRows.has(index)) return '__custom__';
    if (!icon) return '';
    return this.isCustomIcon(icon) ? '__custom__' : icon;
  }

  onIconSelect(item: ConciergeServiceItem, index: number, value: string): void {
    if (value === '__custom__') {
      this.customIconRows.add(index);
    } else {
      this.customIconRows.delete(index);
      item.icon = value;
    }
  }

  slug = '';
  saving = signal(false);
  uploadingHero = signal(false);

  leads = signal<ConciergeLead[]>([]);
  loadingLeads = signal(false);

  constructor(
    private conciergeService: ConciergeService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe({ next: p => this.slug = p.publicSiteSlug ?? '', error: () => {} });
    this.conciergeService.getConfig().subscribe({
      next: c => this.config = { ...this.config, ...c },
      error: () => {}
    });
    this.loadLeads();
  }

  publicUrl(): string {
    if (!this.slug) return '';
    return `${window.location.origin}/${this.slug}/conciergerie`;
  }

  copyUrl(): void {
    const url = this.publicUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() =>
      this.snackBar.open(this.t.instant('settings.url_copied'), '', { duration: 2000 })
    );
  }

  onHeroImageSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    this.uploadingHero.set(true);
    this.compressImage(files[0]).then(base64 => {
      this.conciergeService.uploadHeroImage(base64).subscribe({
        next: c => { this.config.heroImageUrl = c.heroImageUrl; this.uploadingHero.set(false); },
        error: () => {
          this.uploadingHero.set(false);
          this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 });
        }
      });
    });
  }

  private compressImage(file: File): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  addService(): void { this.config.services = [...this.config.services, { icon: '', title: '', description: '' }]; }
  removeService(i: number): void {
    this.config.services = this.config.services.filter((_, idx) => idx !== i);
    const shifted = new Set<number>();
    for (const idx of this.customIconRows) {
      if (idx < i) shifted.add(idx);
      else if (idx > i) shifted.add(idx - 1);
    }
    this.customIconRows = shifted;
  }

  addStat(): void { this.config.stats = [...this.config.stats, { number: '', label: '' }]; }
  removeStat(i: number): void { this.config.stats = this.config.stats.filter((_, idx) => idx !== i); }

  addStep(): void { this.config.steps = [...this.config.steps, { title: '', description: '' }]; }
  removeStep(i: number): void { this.config.steps = this.config.steps.filter((_, idx) => idx !== i); }

  addTestimonial(): void { this.config.testimonials = [...this.config.testimonials, { authorName: '', text: '' }]; }
  removeTestimonial(i: number): void { this.config.testimonials = this.config.testimonials.filter((_, idx) => idx !== i); }

  save(): void {
    this.saving.set(true);
    this.conciergeService.saveConfig(this.config).subscribe({
      next: c => {
        this.config = { ...this.config, ...c };
        this.saving.set(false);
        this.snackBar.open(this.t.instant('common.saved'), '', { duration: 2000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  loadLeads(): void {
    this.loadingLeads.set(true);
    this.conciergeService.getLeads().subscribe({
      next: leads => { this.leads.set(leads); this.loadingLeads.set(false); },
      error: () => this.loadingLeads.set(false)
    });
  }

  setLeadStatus(lead: ConciergeLead, status: 'NEW' | 'CONTACTED' | 'CLOSED'): void {
    this.conciergeService.updateLeadStatus(lead.id, status).subscribe({
      next: updated => this.leads.update(list => list.map(l => l.id === updated.id ? updated : l)),
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }
}
