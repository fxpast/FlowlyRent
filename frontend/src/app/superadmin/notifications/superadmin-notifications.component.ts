import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface Notification {
  id: number;
  subject?: string;
  content: string;
  sentAt: string;
  sentByEmail: string;
  readCount: number;
}

@Component({
  selector: 'app-superadmin-notifications',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <h1 class="page-title">
        <mat-icon>campaign</mat-icon>
        Notifications utilisateurs
      </h1>
      <p class="page-sub">Envoyez un message à tous les utilisateurs de la plateforme.</p>

      <!-- Formulaire de composition -->
      <mat-card class="compose-card">
        <mat-card-header><mat-card-title>Nouvelle notification</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Objet (facultatif)</mat-label>
            <input matInput [(ngModel)]="form.subject" placeholder="Ex : Maintenance prévue le 15 juin">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Message *</mat-label>
            <textarea matInput rows="5" [(ngModel)]="form.content"
                      placeholder="Rédigez votre message ici…"></textarea>
          </mat-form-field>
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="send()"
                  [disabled]="!form.content.trim() || sending()">
            @if (sending()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner> }
            @else { <mat-icon>send</mat-icon> }
            Envoyer à tous les utilisateurs
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Liste des notifications envoyées -->
      <mat-divider style="margin: 32px 0 24px"></mat-divider>
      <h2 class="section-title">
        <mat-icon>history</mat-icon>
        Notifications envoyées
      </h2>

      @if (loading()) {
        <div class="center"><mat-spinner diameter="36" /></div>
      } @else if (notifications().length === 0) {
        <p class="empty">Aucune notification envoyée pour le moment.</p>
      } @else {
        <div class="notif-list">
          @for (n of notifications(); track n.id) {
            <mat-card class="notif-card">
              <div class="notif-header">
                <div class="notif-meta">
                  <span class="notif-date">{{ n.sentAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  @if (n.subject) {
                    <span class="notif-subject">{{ n.subject }}</span>
                  }
                </div>
                <div class="notif-actions">
                  <span class="read-badge">
                    <mat-icon>visibility</mat-icon> {{ n.readCount }} lu{{ n.readCount > 1 ? 's' : '' }}
                  </span>
                  <button mat-icon-button color="warn" (click)="delete(n)" matTooltip="Supprimer">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="notif-content">{{ n.content }}</div>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 760px; }
    .page-title { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 600; margin: 0 0 6px; }
    .page-title mat-icon { color: #1976d2; font-size: 28px; width: 28px; height: 28px; }
    .page-sub { color: #888; font-size: 14px; margin: 0 0 24px; }
    .compose-card { margin-bottom: 8px; }
    mat-card-content { padding-top: 16px; }
    mat-card-actions { padding: 8px 16px 16px; }
    .full { width: 100%; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; margin: 0 0 16px; }
    .section-title mat-icon { color: #1976d2; }
    .center { display: flex; justify-content: center; padding: 32px; }
    .empty { color: #999; text-align: center; padding: 24px; }
    .notif-list { display: flex; flex-direction: column; gap: 12px; }
    .notif-card { padding: 16px; }
    .notif-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
    .notif-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .notif-date { font-size: 13px; color: #888; }
    .notif-subject { font-size: 14px; font-weight: 600; color: #333; }
    .notif-actions { display: flex; align-items: center; gap: 6px; }
    .read-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2e7d32; background: #e8f5e9; padding: 3px 10px; border-radius: 12px; }
    .read-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .notif-content { font-size: 14px; color: #444; white-space: pre-wrap; line-height: 1.6; }
  `]
})
export class SuperadminNotificationsComponent implements OnInit {
  private base = environment.apiUrl;

  notifications = signal<Notification[]>([]);
  loading = signal(false);
  sending = signal(false);

  form = { subject: '', content: '' };

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<Notification[]>(`${this.base}/superadmin/notifications`).subscribe({
      next: list => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  send(): void {
    if (!this.form.content.trim()) return;
    this.sending.set(true);
    this.http.post<Notification>(`${this.base}/superadmin/notifications`, {
      subject: this.form.subject.trim() || null,
      content: this.form.content.trim()
    }).subscribe({
      next: n => {
        this.notifications.update(list => [n, ...list]);
        this.form = { subject: '', content: '' };
        this.sending.set(false);
        this.snack.open('Notification envoyée à tous les utilisateurs', 'OK', { duration: 3000 });
      },
      error: () => {
        this.sending.set(false);
        this.snack.open('Erreur lors de l\'envoi', 'Fermer', { duration: 3000 });
      }
    });
  }

  delete(n: Notification): void {
    if (!confirm(`Supprimer cette notification ?`)) return;
    this.http.delete(`${this.base}/superadmin/notifications/${n.id}`).subscribe({
      next: () => this.notifications.update(list => list.filter(x => x.id !== n.id)),
      error: () => this.snack.open('Erreur suppression', 'Fermer', { duration: 3000 })
    });
  }
}
