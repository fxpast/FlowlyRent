import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserService, UserProfile, Beds24Status } from '../../core/services/user.service';
import { QontoService, QontoStatus } from '../../core/services/qonto.service';
import { MinStayService, MinStayStrategy } from '../../core/services/min-stay.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    MatSlideToggleModule,
    TranslateModule
  ],
  template: `
    <h2>{{ 'settings.title' | translate }}</h2>

    <!-- Connexion Beds24 — mise en avant -->
    @if (beds24Status() && !beds24Status()!.connected) {
      <div class="beds24-banner">
        <mat-icon class="beds24-banner-icon">sync</mat-icon>
        <div class="beds24-banner-text">
          <strong>{{ 'settings.beds24_title' | translate }}</strong>
          <span>{{ 'settings.beds24_subtitle' | translate }}</span>
        </div>
        <mat-icon class="beds24-banner-arrow">arrow_downward</mat-icon>
      </div>
    }

    <!-- Connexion Beds24 -->
    <mat-card class="section-card" [class.beds24-highlight]="beds24Status() && !beds24Status()!.connected">
      <mat-card-header>
        <mat-icon mat-card-avatar>sync</mat-icon>
        <mat-card-title>{{ 'settings.beds24_title' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'settings.beds24_subtitle' | translate }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (beds24Status()) {
          @if (beds24Status()!.connected) {
            <div class="status-connected">
              <mat-icon color="primary">check_circle</mat-icon>
              <span>{{ 'settings.beds24_connected' | translate }}</span>
            </div>

            <!-- URL Webhook à copier dans Beds24 -->
            @if (profile()) {
              <div class="webhook-box">
                <div class="webhook-label">
                  <mat-icon>webhook</mat-icon>
                  <strong>{{ 'settings.webhook_url' | translate }}</strong>
                  <span class="webhook-hint">{{ 'settings.webhook_hint' | translate }}</span>
                </div>
                <div class="webhook-url-row">
                  <code class="webhook-url">{{ webhookUrl() }}</code>
                  <button mat-icon-button (click)="copyWebhookUrl()" matTooltip="Copier">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
            }
          } @else {
            <div class="status-disconnected">
              <mat-icon color="warn">cancel</mat-icon>
              <span>{{ 'settings.beds24_disconnected' | translate }}</span>
            </div>

            <div class="connect-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-body">
                  <strong>Connectez-vous à votre compte Beds24</strong>
                  <p>Rendez-vous sur <strong>beds24.com</strong> et connectez-vous avec votre compte Beds24.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-body">
                  <strong>Créez un code d'invitation</strong>
                  <p>Dans Beds24 : <strong>Settings → MarketPlace → API</strong><br>
                  Cliquez sur <strong>"Generate invite code"</strong>, cochez <strong>ALL</strong>,
                  cliquez à nouveau sur <strong>"Generate invite code"</strong>, puis copiez le code généré.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-body">
                  <strong>Collez le code ci-dessous</strong>
                </div>
              </div>
            </div>

            <mat-form-field class="full-width">
              <mat-label>{{ 'settings.invite_code' | translate }}</mat-label>
              <input matInput [(ngModel)]="b24SetupToken" autocomplete="off"
                     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <mat-icon matSuffix>vpn_key</mat-icon>
              <mat-hint>{{ 'settings.invite_code_hint' | translate }}</mat-hint>
            </mat-form-field>

            @if (connectMsg()) {
              <div class="connect-error">
                <mat-icon>error_outline</mat-icon>
                <div>
                  <strong>{{ 'settings.connect_failed' | translate }}</strong>
                  <p>{{ connectMsg() }}</p>
                </div>
              </div>
            }
          }
        } @else {
          <mat-spinner diameter="32" />
        }
      </mat-card-content>
      <mat-card-actions>
        @if (beds24Status()?.connected) {
          <button mat-flat-button color="accent" (click)="syncNow()" [disabled]="syncing()">
            @if (syncing()) { <mat-spinner diameter="18" /> } @else { <mat-icon>sync</mat-icon> {{ 'settings.sync_now' | translate }} }
          </button>
          <button mat-stroked-button color="warn" (click)="disconnect()" style="margin-left:8px">
            {{ 'common.disconnect' | translate }}
          </button>
        } @else {
          <button mat-flat-button color="primary" (click)="connectBeds24()" [disabled]="connecting() || !b24SetupToken">
            @if (connecting()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> {{ 'common.connect' | translate }} }
          </button>
        }
      </mat-card-actions>
    </mat-card>

    <!-- Stratégie durée minimum de séjour -->
    @if (beds24Status()?.connected) {
      <mat-card class="section-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>event_available</mat-icon>
          <mat-card-title>{{ 'settings.min_stay_title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'settings.min_stay_subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (minStay()) {
            <mat-slide-toggle [(ngModel)]="minStayForm.enabled" color="primary">
              {{ 'settings.min_stay_enable' | translate }}
            </mat-slide-toggle>
            <p class="sync-info">{{ 'settings.min_stay_enable_hint' | translate }}</p>

            <div class="form-row" style="margin-top:16px">
              <mat-form-field>
                <mat-label>{{ 'settings.min_stay_near_days' | translate }}</mat-label>
                <input matInput type="number" min="0" [(ngModel)]="minStayForm.nearDays" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'settings.min_stay_near_value' | translate }}</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="minStayForm.nearMinStay" />
              </mat-form-field>
            </div>
            <div class="form-row">
              <mat-form-field>
                <mat-label>{{ 'settings.min_stay_far_value' | translate }}</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="minStayForm.farMinStay" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'settings.min_stay_horizon' | translate }}</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="minStayForm.horizonDays" />
              </mat-form-field>
            </div>

            @if (minStay()!.lastRunAt) {
              <p class="sync-info">{{ 'settings.min_stay_last_run' | translate }} {{ minStay()!.lastRunAt | date:'dd/MM/yyyy HH:mm' }} — {{ minStay()!.lastRunStatus }}</p>
            }
            @if (minStayMsg()) {
              <p class="msg" [class.error]="minStayError()">{{ minStayMsg() }}</p>
            }
          } @else {
            <mat-spinner diameter="32" />
          }
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="saveMinStay()" [disabled]="savingMinStay()">
            @if (savingMinStay()) { <mat-spinner diameter="18" /> } @else { {{ 'common.save' | translate }} }
          </button>
          <button mat-stroked-button (click)="runMinStayNow()" [disabled]="runningMinStay()" style="margin-left:8px">
            @if (runningMinStay()) { <mat-spinner diameter="18" /> } @else { <mat-icon>play_arrow</mat-icon> {{ 'settings.min_stay_run_now' | translate }} }
          </button>
        </mat-card-actions>
      </mat-card>
    }

    <!-- Connexion Qonto -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>account_balance</mat-icon>
        <mat-card-title>{{ 'settings.qonto_title' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'settings.qonto_subtitle' | translate }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (qontoStatus()) {
          @if (qontoStatus()!.connected) {
            <div class="status-connected">
              <mat-icon color="primary">check_circle</mat-icon>
              <span>{{ 'settings.qonto_connected' | translate }}</span>
            </div>
            @if (qontoStatus()!.lastSync) {
              <p class="sync-info">Dernière sync : {{ qontoStatus()!.lastSync }}</p>
            }
          } @else {
            <div class="status-disconnected">
              <mat-icon color="warn">cancel</mat-icon>
              <span>{{ 'settings.qonto_disconnected' | translate }}</span>
            </div>
            <div class="connect-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-body">
                  <strong>Générez une clé API dans Qonto</strong>
                  <p>Dans Qonto : <strong>Paramètres → Intégrations → API</strong><br>
                  Notez votre <strong>login</strong> (identifiant Qonto) et générez une <strong>clé secrète</strong>.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-body">
                  <strong>Renseignez vos identifiants ci-dessous</strong>
                </div>
              </div>
            </div>
            <mat-form-field class="full-width">
              <mat-label>{{ 'settings.qonto_login' | translate }}</mat-label>
              <input matInput [(ngModel)]="qontoLogin" autocomplete="off"
                     placeholder="votre-entreprise-slug" />
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>{{ 'settings.qonto_secret' | translate }}</mat-label>
              <input matInput [type]="showQontoKey() ? 'text' : 'password'"
                     [(ngModel)]="qontoSecretKey" autocomplete="off" />
              <button mat-icon-button matSuffix (click)="showQontoKey.set(!showQontoKey())">
                <mat-icon>{{ showQontoKey() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (qontoConnectMsg()) {
              <div class="connect-error">
                <mat-icon>error_outline</mat-icon>
                <div>
                  <strong>Connexion échouée</strong>
                  <p>{{ qontoConnectMsg() }}</p>
                </div>
              </div>
            }
          }
        } @else {
          <mat-spinner diameter="32" />
        }
      </mat-card-content>
      <mat-card-actions>
        @if (qontoStatus()?.connected) {
          <button mat-stroked-button color="warn" (click)="disconnectQonto()">
            {{ 'common.disconnect' | translate }}
          </button>
        } @else {
          <button mat-flat-button color="primary" (click)="connectQonto()"
                  [disabled]="qontoConnecting() || !qontoLogin || !qontoSecretKey">
            @if (qontoConnecting()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> {{ 'common.connect' | translate }} }
          </button>
        }
      </mat-card-actions>
    </mat-card>

    <!-- Changer le mot de passe -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>lock</mat-icon>
        <mat-card-title>{{ 'settings.password_title' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field class="full-width">
          <mat-label>{{ 'settings.current_password' | translate }}</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.current" autocomplete="current-password" />
          <button mat-icon-button matSuffix (click)="showPwd.set(!showPwd())">
            <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>{{ 'settings.new_password' | translate }}</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.new" autocomplete="new-password" />
          <mat-hint>{{ 'settings.password_hint' | translate }}</mat-hint>
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>{{ 'settings.confirm_password' | translate }}</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.confirm" autocomplete="new-password" />
          @if (pwd.confirm && pwd.new !== pwd.confirm) {
            <mat-error>{{ 'settings.password_mismatch' | translate }}</mat-error>
          }
        </mat-form-field>
        @if (pwdMsg()) {
          <p class="msg" [class.error]="pwdError()">{{ pwdMsg() }}</p>
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-flat-button color="primary" (click)="changePassword()"
          [disabled]="savingPwd() || !pwd.current || pwd.new.length < 8 || pwd.new !== pwd.confirm">
          @if (savingPwd()) { <mat-spinner diameter="18" /> } @else { {{ 'settings.change_password' | translate }} }
        </button>
      </mat-card-actions>
    </mat-card>

    <!-- Profil utilisateur -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>person</mat-icon>
        <mat-card-title>{{ 'settings.profile_title' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (profile()) {
          <div class="form-row">
            <mat-form-field>
              <mat-label>{{ 'settings.first_name' | translate }}</mat-label>
              <input matInput [(ngModel)]="profileEdit.firstName" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'settings.last_name' | translate }}</mat-label>
              <input matInput [(ngModel)]="profileEdit.lastName" />
            </mat-form-field>
          </div>
          <mat-form-field class="full-width">
            <mat-label>{{ 'settings.slug' | translate }}</mat-label>
            <input matInput [(ngModel)]="profileEdit.publicSiteSlug" />
            <mat-hint>URL : /public/{{ profileEdit.publicSiteSlug }}/properties</mat-hint>
          </mat-form-field>
          <mat-form-field class="full-width">
            <mat-label>{{ 'settings.phone' | translate }}</mat-label>
            <input matInput [(ngModel)]="profileEdit.phone" type="tel" placeholder="+33612345678" />
            <mat-hint>{{ 'settings.phone_hint' | translate }}</mat-hint>
          </mat-form-field>
          <mat-divider style="margin:16px 0"></mat-divider>
          <div class="webhook-label" style="margin-bottom:10px">
            <mat-icon>event_seat</mat-icon>
            <strong>{{ 'settings.beds24_booking_pages' | translate }}</strong>
            <span class="webhook-hint">{{ 'settings.beds24_booking_pages_hint' | translate }}</span>
          </div>
          <div class="form-row">
            <mat-form-field>
              <mat-label>{{ 'settings.beds24_owner_id' | translate }}</mat-label>
              <input matInput [(ngModel)]="profileEdit.beds24OwnerId" placeholder="73803" />
              <mat-hint>{{ 'settings.beds24_owner_id_hint' | translate }}</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'settings.listings_slug' | translate }}</mat-label>
              <input matInput [(ngModel)]="profileEdit.listingsSlug" placeholder="annonces" />
              <mat-hint>{{ 'settings.listings_slug_hint' | translate }}</mat-hint>
            </mat-form-field>
          </div>
          @if (listingsUrl()) {
            <div class="webhook-box">
              <div class="webhook-label">
                <mat-icon>link</mat-icon>
                <strong>{{ 'settings.listings_url' | translate }}</strong>
              </div>
              <div class="webhook-url-row">
                <code class="webhook-url">{{ listingsUrl() }}</code>
                <button mat-icon-button (click)="copyListingsUrl()" matTooltip="Copier">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            </div>
          }
          <div class="plan-info">
            <mat-icon>stars</mat-icon>
            {{ 'settings.current_plan' | translate }} <strong>{{ profile()!.plan }}</strong>
            &nbsp;·&nbsp; {{ profile()!.email }}
          </div>
          @if (profileMsg()) {
            <p class="msg" [class.error]="profileError()">{{ profileMsg() }}</p>
          }
        } @else {
          <mat-spinner diameter="32" />
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-flat-button color="primary" (click)="saveProfile()" [disabled]="savingProfile()">
          @if (savingProfile()) { <mat-spinner diameter="18" /> } @else { {{ 'common.save' | translate }} }
        </button>
      </mat-card-actions>
    </mat-card>

    <!-- Informations de facturation -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>receipt_long</mat-icon>
        <mat-card-title>{{ 'invoices.section_issuer' | translate }}</mat-card-title>
        <mat-card-subtitle>{{ 'invoices.billing_hint_before' | translate }}{{ 'invoices.section_issuer' | translate }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (profile()) {
          <div class="form-row">
            <mat-form-field>
              <mat-label>Raison sociale</mat-label>
              <input matInput [(ngModel)]="profileEdit.companyName" placeholder="Ex : Dupont Location" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>SIRET</mat-label>
              <input matInput [(ngModel)]="profileEdit.siret" placeholder="Ex : 12345678900012" />
            </mat-form-field>
          </div>
          <mat-form-field class="full-width">
            <mat-label>Adresse de facturation</mat-label>
            <textarea matInput rows="3" [(ngModel)]="profileEdit.companyAddress"
                      placeholder="Ex : 12 rue de la Paix&#10;75001 Paris"></textarea>
          </mat-form-field>
          <mat-form-field class="full-width">
            <mat-label>{{ 'properties.invoice_footer_label' | translate }}</mat-label>
            <textarea matInput rows="3" [(ngModel)]="profileEdit.invoiceFooter"
                      [placeholder]="'properties.invoice_footer_placeholder' | translate"></textarea>
            <mat-hint>{{ 'properties.invoice_footer_hint' | translate }}</mat-hint>
          </mat-form-field>
          @if (billingMsg()) {
            <p class="msg" [class.error]="billingError()">{{ billingMsg() }}</p>
          }
        } @else {
          <mat-spinner diameter="32" />
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-flat-button color="primary" (click)="saveBilling()" [disabled]="savingBilling()">
          @if (savingBilling()) { <mat-spinner diameter="18" /> } @else { {{ 'common.save' | translate }} }
        </button>
      </mat-card-actions>
    </mat-card>

  `,
  styles: [`
    h2 { margin: 0 0 24px; font-size: 24px; font-weight: 500; }
    .section-card { margin-bottom: 24px; max-width: 700px; }
    mat-card-content { padding-top: 16px; }
    .form-row { display: flex; gap: 16px; }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    .plan-info { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: #666; font-size: 14px; }
    .connect-steps { margin: 12px 0 20px; display: flex; flex-direction: column; gap: 12px; }
    .step { display: flex; gap: 14px; align-items: flex-start; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: #1976d2; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .step-body { flex: 1; }
    .step-body strong { font-size: 14px; }
    .step-body p { margin: 3px 0 0; font-size: 13px; color: #555; line-height: 1.5; }
    .connect-error { display: flex; gap: 10px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .connect-error mat-icon { color: #c62828; flex-shrink: 0; margin-top: 2px; }
    .connect-error p { margin: 4px 0 0; font-size: 13px; color: #333; }
    .status-connected, .status-disconnected { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 15px; }
    .sync-info { font-size: 13px; color: #666; margin: 0 0 12px; }
    .msg { font-size: 13px; margin: 8px 0 0; }
    .msg.error { color: #d32f2f; }
    .msg.success { color: #2e7d32; }
    .error { color: #d32f2f; }
    mat-card-actions { padding: 16px; display: flex; align-items: center; }
    mat-spinner { display: inline-block; }
    .msg.success { color: #2e7d32; }
    .webhook-box { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
    .webhook-label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; flex-wrap: wrap; }
    .webhook-label mat-icon { font-size: 18px; height: 18px; width: 18px; color: #1976d2; }
    .webhook-hint { font-size: 12px; color: #666; }
    .webhook-url-row { display: flex; align-items: center; gap: 8px; }
    .webhook-url { font-size: 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; flex: 1; word-break: break-all; }
    .beds24-banner { display: flex; align-items: center; gap: 16px; background: #e3f2fd; border: 2px solid #1976d2; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; max-width: 700px; }
    .beds24-banner-icon { color: #1976d2; font-size: 32px; width: 32px; height: 32px; flex-shrink: 0; }
    .beds24-banner-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .beds24-banner-text strong { font-size: 15px; color: #0d47a1; }
    .beds24-banner-text span { font-size: 13px; color: #1565c0; }
    .beds24-banner-arrow { color: #1976d2; font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
    .beds24-highlight { border: 2px solid #1976d2 !important; box-shadow: 0 0 0 4px rgba(25,118,210,0.1); }
  `]
})
export class SettingsComponent implements OnInit {
  profile = signal<UserProfile | null>(null);
  profileEdit = { firstName: '', lastName: '', publicSiteSlug: '', phone: '', listingsSlug: '', beds24OwnerId: '', siret: '', companyName: '', companyAddress: '', companyLogoUrl: '', invoiceFooter: '' };
  savingProfile = signal(false);
  profileMsg = signal('');
  profileError = signal(false);
  savingBilling = signal(false);
  billingMsg = signal('');
  billingError = signal(false);

  beds24Status = signal<Beds24Status | null>(null);
  b24SetupToken = '';
  connecting = signal(false);
  connectMsg = signal('');
  syncing = signal(false);
  syncResult = signal<{ propertiesSynced?: number; bookingsSynced?: number; error?: string } | null>(null);

  webhookUrl = signal('');

  minStay = signal<MinStayStrategy | null>(null);
  minStayForm = { enabled: false, nearDays: 10, nearMinStay: 2, farMinStay: 3, horizonDays: 365 };
  savingMinStay = signal(false);
  runningMinStay = signal(false);
  minStayMsg = signal('');
  minStayError = signal(false);

  qontoStatus = signal<QontoStatus | null>(null);
  qontoLogin = '';
  qontoSecretKey = '';
  qontoConnecting = signal(false);
  qontoConnectMsg = signal('');
  showQontoKey = signal(false);

  pwd = { current: '', new: '', confirm: '' };
  savingPwd = signal(false);
  pwdMsg = signal('');
  pwdError = signal(false);
  showPwd = signal(false);

  constructor(
    private userService: UserService,
    private qontoService: QontoService,
    private minStayService: MinStayService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private t: TranslateService
  ) {}

  listingsUrl(): string {
    const slug = this.profileEdit.publicSiteSlug;
    const ls = this.profileEdit.listingsSlug;
    if (!slug || !ls) return '';
    return `${window.location.origin}/${slug}/${ls}`;
  }

  copyListingsUrl(): void {
    const url = this.listingsUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() =>
      this.snackBar.open(this.t.instant('settings.url_copied'), '', { duration: 2000 })
    );
  }

  copyWebhookUrl(): void {
    navigator.clipboard.writeText(this.webhookUrl()).then(() =>
      this.snackBar.open(this.t.instant('settings.url_copied'), '', { duration: 2000 })
    );
  }

  ngOnInit(): void {
    this.userService.getProfile().subscribe(p => {
      this.profile.set(p);
      this.profileEdit = {
        firstName: p.firstName ?? '', lastName: p.lastName ?? '',
        publicSiteSlug: p.publicSiteSlug ?? '', phone: p.phone ?? '',
        listingsSlug: p.listingsSlug ?? '', beds24OwnerId: p.beds24OwnerId ?? '',
        siret: p.siret ?? '', companyName: p.companyName ?? '',
        companyAddress: p.companyAddress ?? '', companyLogoUrl: p.companyLogoUrl ?? '',
        invoiceFooter: p.invoiceFooter ?? ''
      };
      this.webhookUrl.set(`${window.location.origin}/api/webhooks/beds24/${p.userId}`);
    });
    this.loadBeds24Status();
    this.loadQontoStatus();
    this.loadMinStay();
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileMsg.set('');
    this.userService.updateProfile({
      firstName: this.profileEdit.firstName,
      lastName: this.profileEdit.lastName,
      publicSiteSlug: this.profileEdit.publicSiteSlug,
      phone: this.profileEdit.phone,
      listingsSlug: this.profileEdit.listingsSlug,
      beds24OwnerId: this.profileEdit.beds24OwnerId
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.savingProfile.set(false);
        this.profileMsg.set(this.t.instant('settings.profile_updated'));
        this.profileError.set(false);
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileMsg.set(this.t.instant('settings.profile_error'));
        this.profileError.set(true);
      }
    });
  }

  saveBilling(): void {
    this.savingBilling.set(true);
    this.billingMsg.set('');
    this.userService.updateProfile({
      siret: this.profileEdit.siret,
      companyName: this.profileEdit.companyName,
      companyAddress: this.profileEdit.companyAddress,
      invoiceFooter: this.profileEdit.invoiceFooter
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.savingBilling.set(false);
        this.billingMsg.set(this.t.instant('settings.billing_saved'));
        this.billingError.set(false);
      },
      error: () => {
        this.savingBilling.set(false);
        this.billingMsg.set(this.t.instant('settings.billing_error'));
        this.billingError.set(true);
      }
    });
  }

  changePassword(): void {
    this.savingPwd.set(true);
    this.pwdMsg.set('');
    this.userService.changePassword(this.pwd.current, this.pwd.new).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwdMsg.set(this.t.instant('settings.password_updated'));
        this.pwdError.set(false);
        this.pwd = { current: '', new: '', confirm: '' };
      },
      error: err => {
        this.savingPwd.set(false);
        this.pwdMsg.set(err.error?.error ?? this.t.instant('settings.password_error'));
        this.pwdError.set(true);
      }
    });
  }

  connectBeds24(): void {
    this.connecting.set(true);
    this.connectMsg.set('');
    this.userService.connectBeds24WithToken(this.b24SetupToken).subscribe({
      next: r => {
        this.connecting.set(false);
        if (r.error) {
          this.connectMsg.set(r.error);
        } else {
          this.b24SetupToken = '';
          this.loadBeds24Status();
        }
      },
      error: err => {
        this.connecting.set(false);
        this.connectMsg.set(err.error?.error ?? 'Code invalide ou expiré');
      }
    });
  }

  syncNow(): void {
    this.syncing.set(true);
    this.syncResult.set(null);
    this.userService.syncBeds24().subscribe({
      next: r => {
        this.syncing.set(false);
        this.syncResult.set(r);
        this.loadBeds24Status();
      },
      error: err => {
        this.syncing.set(false);
        this.syncResult.set({ error: err.error?.error ?? 'Erreur lors de la synchronisation' });
      }
    });
  }

  disconnect(): void {
    this.userService.disconnectBeds24().subscribe(() => {
      this.syncResult.set(null);
      this.loadBeds24Status();
    });
  }

  private loadBeds24Status(): void {
    this.userService.getBeds24Status().subscribe(s => this.beds24Status.set(s));
  }

  connectQonto(): void {
    this.qontoConnecting.set(true);
    this.qontoConnectMsg.set('');
    this.qontoService.connect(this.qontoLogin, this.qontoSecretKey).subscribe({
      next: r => {
        this.qontoConnecting.set(false);
        if (r.error) {
          this.qontoConnectMsg.set(r.error);
        } else {
          this.qontoLogin = '';
          this.qontoSecretKey = '';
          this.loadQontoStatus();
          this.snackBar.open(this.t.instant('settings.qonto_connected'), '', { duration: 3000 });
        }
      },
      error: err => {
        this.qontoConnecting.set(false);
        this.qontoConnectMsg.set(err.error?.error ?? 'Identifiants invalides');
      }
    });
  }

  disconnectQonto(): void {
    this.qontoService.disconnect().subscribe(() => {
      this.loadQontoStatus();
    });
  }

  private loadQontoStatus(): void {
    this.qontoService.getStatus().subscribe(s => this.qontoStatus.set(s));
  }

  private loadMinStay(): void {
    this.minStayService.get().subscribe(s => {
      this.minStay.set(s);
      this.minStayForm = {
        enabled: s.enabled, nearDays: s.nearDays, nearMinStay: s.nearMinStay,
        farMinStay: s.farMinStay, horizonDays: s.horizonDays
      };
    });
  }

  saveMinStay(): void {
    this.savingMinStay.set(true);
    this.minStayMsg.set('');
    this.minStayService.save(this.minStayForm).subscribe({
      next: s => {
        this.savingMinStay.set(false);
        this.minStay.set(s);
        this.minStayMsg.set(this.t.instant('settings.min_stay_saved'));
        this.minStayError.set(false);
      },
      error: () => {
        this.savingMinStay.set(false);
        this.minStayMsg.set(this.t.instant('settings.min_stay_error'));
        this.minStayError.set(true);
      }
    });
  }

  runMinStayNow(): void {
    this.runningMinStay.set(true);
    this.minStayMsg.set('');
    this.minStayService.runNow().subscribe({
      next: r => {
        this.runningMinStay.set(false);
        if (r.success) {
          this.minStayMsg.set(this.t.instant('settings.min_stay_run_success', { count: r.propertiesUpdated }));
          this.minStayError.set(false);
        } else {
          this.minStayMsg.set(r.error ?? this.t.instant('settings.min_stay_error'));
          this.minStayError.set(true);
        }
        this.loadMinStay();
      },
      error: err => {
        this.runningMinStay.set(false);
        this.minStayMsg.set(err.error?.error ?? this.t.instant('settings.min_stay_error'));
        this.minStayError.set(true);
      }
    });
  }
}
