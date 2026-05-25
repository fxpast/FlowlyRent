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
import { MatChipsModule } from '@angular/material/chips';
import { UserService, UserProfile, Beds24Status } from '../../core/services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <h2>Paramètres</h2>

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

    <!-- Connexion Beds24 -->
    <mat-card class="section-card">
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
            @if (beds24Status()!.lastSync) {
              <p class="sync-info">
                Dernière synchronisation : {{ beds24Status()!.lastSync | date:'dd/MM/yyyy HH:mm' }}
                @if (beds24Status()!.lastSyncStatus) {
                  &nbsp;— <span [class.error]="beds24Status()!.lastSyncStatus!.startsWith('ERROR')">
                    {{ beds24Status()!.lastSyncStatus }}
                  </span>
                }
              </p>
            }
            @if (syncResult()) {
              <div class="sync-result">
                @if (syncResult()!.error) {
                  <p class="msg error">{{ syncResult()!.error }}</p>
                } @else {
                  <p class="msg success">
                    Synchronisation réussie — {{ syncResult()!.propertiesSynced }} propriétés,
                    {{ syncResult()!.bookingsSynced }} réservations
                  </p>
                }
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

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe(p => {
      this.profile.set(p);
      this.profileEdit = { firstName: p.firstName ?? '', lastName: p.lastName ?? '', publicSiteSlug: p.publicSiteSlug ?? '' };
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
