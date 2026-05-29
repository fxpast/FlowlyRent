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
import { UserService, UserProfile, Beds24Status } from '../../core/services/user.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <h2>Paramètres</h2>

    <!-- Connexion Beds24 — mise en avant -->
    @if (beds24Status() && !beds24Status()!.connected) {
      <div class="beds24-banner">
        <mat-icon class="beds24-banner-icon">sync</mat-icon>
        <div class="beds24-banner-text">
          <strong>Connectez votre compte Beds24 pour commencer</strong>
          <span>Synchronisez automatiquement vos propriétés et réservations depuis Beds24.</span>
        </div>
        <mat-icon class="beds24-banner-arrow">arrow_downward</mat-icon>
      </div>
    }

    <!-- Connexion Beds24 -->
    <mat-card class="section-card" [class.beds24-highlight]="beds24Status() && !beds24Status()!.connected">
      <mat-card-header>
        <mat-icon mat-card-avatar>sync</mat-icon>
        <mat-card-title>Connexion Beds24</mat-card-title>
        <mat-card-subtitle>Synchronisez automatiquement vos propriétés et réservations</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (beds24Status()) {
          @if (beds24Status()!.connected) {
            <div class="status-connected">
              <mat-icon color="primary">check_circle</mat-icon>
              <span>Compte Beds24 connecté</span>
            </div>

            <!-- URL Webhook à copier dans Beds24 -->
            @if (profile()) {
              <div class="webhook-box">
                <div class="webhook-label">
                  <mat-icon>webhook</mat-icon>
                  <strong>URL Webhook Beds24</strong>
                  <span class="webhook-hint">À coller dans Beds24 : Settings → Properties → Access → Booking Webhook</span>
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
              <span>Aucun compte Beds24 connecté</span>
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
              <mat-label>Code d'invitation Beds24</mat-label>
              <input matInput [(ngModel)]="b24SetupToken" autocomplete="off"
                     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <mat-icon matSuffix>vpn_key</mat-icon>
              <mat-hint>Généré dans Beds24 → Settings → MarketPlace → API</mat-hint>
            </mat-form-field>

            @if (connectMsg()) {
              <div class="connect-error">
                <mat-icon>error_outline</mat-icon>
                <div>
                  <strong>Connexion échouée</strong>
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
            @if (syncing()) { <mat-spinner diameter="18" /> } @else { <mat-icon>sync</mat-icon> Synchroniser maintenant }
          </button>
          <button mat-stroked-button color="warn" (click)="disconnect()" style="margin-left:8px">
            Déconnecter
          </button>
        } @else {
          <button mat-flat-button color="primary" (click)="connectBeds24()" [disabled]="connecting() || !b24SetupToken">
            @if (connecting()) { <mat-spinner diameter="18" /> } @else { <mat-icon>link</mat-icon> Connecter }
          </button>
        }
      </mat-card-actions>
    </mat-card>

    <!-- Changer le mot de passe -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>lock</mat-icon>
        <mat-card-title>Mot de passe</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field class="full-width">
          <mat-label>Mot de passe actuel</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.current" autocomplete="current-password" />
          <button mat-icon-button matSuffix (click)="showPwd.set(!showPwd())">
            <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>Nouveau mot de passe</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.new" autocomplete="new-password" />
          <mat-hint>8 caractères minimum</mat-hint>
        </mat-form-field>
        <mat-form-field class="full-width">
          <mat-label>Confirmer le nouveau mot de passe</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="pwd.confirm" autocomplete="new-password" />
          @if (pwd.confirm && pwd.new !== pwd.confirm) {
            <mat-error>Les mots de passe ne correspondent pas</mat-error>
          }
        </mat-form-field>
        @if (pwdMsg()) {
          <p class="msg" [class.error]="pwdError()">{{ pwdMsg() }}</p>
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-flat-button color="primary" (click)="changePassword()"
          [disabled]="savingPwd() || !pwd.current || pwd.new.length < 8 || pwd.new !== pwd.confirm">
          @if (savingPwd()) { <mat-spinner diameter="18" /> } @else { Changer le mot de passe }
        </button>
      </mat-card-actions>
    </mat-card>

    <!-- Profil utilisateur -->
    <mat-card class="section-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>person</mat-icon>
        <mat-card-title>Profil</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (profile()) {
          <div class="form-row">
            <mat-form-field>
              <mat-label>Prénom</mat-label>
              <input matInput [(ngModel)]="profileEdit.firstName" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Nom</mat-label>
              <input matInput [(ngModel)]="profileEdit.lastName" />
            </mat-form-field>
          </div>
          <mat-form-field class="full-width">
            <mat-label>Slug du site public</mat-label>
            <input matInput [(ngModel)]="profileEdit.publicSiteSlug" />
            <mat-hint>URL : /public/{{ profileEdit.publicSiteSlug }}/properties</mat-hint>
          </mat-form-field>
          <div class="plan-info">
            <mat-icon>stars</mat-icon>
            Plan actuel : <strong>{{ profile()!.plan }}</strong>
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
          @if (savingProfile()) { <mat-spinner diameter="18" /> } @else { Enregistrer }
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
  profileEdit = { firstName: '', lastName: '', publicSiteSlug: '' };
  savingProfile = signal(false);
  profileMsg = signal('');
  profileError = signal(false);

  beds24Status = signal<Beds24Status | null>(null);
  b24SetupToken = '';
  connecting = signal(false);
  connectMsg = signal('');
  syncing = signal(false);
  syncResult = signal<{ propertiesSynced?: number; bookingsSynced?: number; error?: string } | null>(null);

  webhookUrl = signal('');

  pwd = { current: '', new: '', confirm: '' };
  savingPwd = signal(false);
  pwdMsg = signal('');
  pwdError = signal(false);
  showPwd = signal(false);

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  copyWebhookUrl(): void {
    navigator.clipboard.writeText(this.webhookUrl()).then(() =>
      this.snackBar.open('URL copiée !', '', { duration: 2000 })
    );
  }

  ngOnInit(): void {
    this.userService.getProfile().subscribe(p => {
      this.profile.set(p);
      this.profileEdit = { firstName: p.firstName ?? '', lastName: p.lastName ?? '', publicSiteSlug: p.publicSiteSlug ?? '' };
      this.webhookUrl.set(`${window.location.origin}/api/webhooks/beds24/${p.userId}`);
    });
    this.loadBeds24Status();
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileMsg.set('');
    this.userService.updateProfile(this.profileEdit).subscribe({
      next: p => {
        this.profile.set(p);
        this.savingProfile.set(false);
        this.profileMsg.set('Profil mis à jour');
        this.profileError.set(false);
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileMsg.set('Erreur lors de la mise à jour (le slug est peut-être déjà utilisé)');
        this.profileError.set(true);
      }
    });
  }

  changePassword(): void {
    this.savingPwd.set(true);
    this.pwdMsg.set('');
    this.userService.changePassword(this.pwd.current, this.pwd.new).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwdMsg.set('Mot de passe mis à jour');
        this.pwdError.set(false);
        this.pwd = { current: '', new: '', confirm: '' };
      },
      error: err => {
        this.savingPwd.set(false);
        this.pwdMsg.set(err.error?.error ?? 'Mot de passe actuel incorrect');
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
}
