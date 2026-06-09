import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

interface AppUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Notification {
  id: number;
  subject?: string;
  content: string;
  sentAt: string;
  sentByEmail: string;
  readCount: number;
  targetAll: boolean;
  targetEmails: string[];
}

@Component({
  selector: 'app-superadmin-notifications',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatChipsModule, MatSnackBarModule, MatDividerModule,
    MatProgressSpinnerModule, MatTooltipModule, TranslateModule
  ],
  template: `
    <div class="page">
      <h1 class="page-title">
        <mat-icon>campaign</mat-icon>
        {{ 'superadmin.notifications_title' | translate }}
      </h1>
      <p class="page-sub">{{ 'superadmin.notif_subtitle' | translate }}</p>

      <!-- Formulaire de composition -->
      <mat-card class="compose-card">
        <mat-card-header><mat-card-title>{{ 'superadmin.send_notification_title' | translate }}</mat-card-title></mat-card-header>
        <mat-card-content>

          <!-- Destinataires -->
          <div class="target-section">
            <div class="target-label">{{ 'superadmin.notif_recipients' | translate }}</div>
            <div class="target-options">
              <mat-checkbox [(ngModel)]="form.targetAll" (ngModelChange)="onTargetAllChange($event)">
                {{ 'superadmin.notif_target_all' | translate }}
              </mat-checkbox>
            </div>
            @if (!form.targetAll) {
              <mat-form-field appearance="outline" class="full" style="margin-top:12px">
                <mat-label>{{ 'superadmin.notif_target_specific' | translate }}</mat-label>
                <mat-select multiple [(ngModel)]="form.selectedUserIds">
                  @for (u of users(); track u.id) {
                    @if (u.role !== 'ADMIN') {
                      <mat-option [value]="u.id">
                        {{ u.email }}
                        @if (u.firstName || u.lastName) {
                          <span class="user-name"> — {{ u.firstName }} {{ u.lastName }}</span>
                        }
                      </mat-option>
                    }
                  }
                </mat-select>
                @if (!form.selectedUserIds.length) {
                  <mat-hint>{{ 'superadmin.notif_no_selection_hint' | translate }}</mat-hint>
                }
              </mat-form-field>

              @if (form.selectedUserIds.length > 0) {
                <div class="selected-chips">
                  @for (id of form.selectedUserIds; track id) {
                    <span class="chip">{{ emailById(id) }}</span>
                  }
                </div>
              }
            }
          </div>

          <!-- Objet -->
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'superadmin.notif_subject_label' | translate }}</mat-label>
            <input matInput [(ngModel)]="form.subject">
          </mat-form-field>

          <!-- Message -->
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'superadmin.notif_content_label' | translate }}</mat-label>
            <textarea matInput rows="5" [(ngModel)]="form.content"></textarea>
          </mat-form-field>

        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="send()"
                  [disabled]="!form.content.trim() || sending() || (!form.targetAll && !form.selectedUserIds.length)">
            @if (sending()) {
              <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
            } @else {
              <mat-icon>send</mat-icon>
            }
            @if (form.targetAll) {
              {{ 'superadmin.notif_send_all' | translate }}
            } @else {
              {{ 'superadmin.notif_send_n_before' | translate }} {{ form.selectedUserIds.length }} {{ 'superadmin.notif_send_n_after' | translate }}
            }
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Liste des notifications envoyées -->
      <mat-divider style="margin: 32px 0 24px"></mat-divider>
      <h2 class="section-title">
        <mat-icon>history</mat-icon>
        {{ 'superadmin.notif_history' | translate }}
      </h2>

      @if (loading()) {
        <div class="center"><mat-spinner diameter="36" /></div>
      } @else if (notifications().length === 0) {
        <p class="empty">{{ 'superadmin.notif_no_history' | translate }}</p>
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
                  <span class="target-badge" [class.target-all]="n.targetAll">
                    <mat-icon>{{ n.targetAll ? 'groups' : 'person' }}</mat-icon>
                    {{ n.targetAll ? ('superadmin.notif_target_all_badge' | translate) : (n.targetEmails.length + ' ' + ('superadmin.notif_recipients_badge' | translate)) }}
                  </span>
                  <span class="read-badge">
                    <mat-icon>visibility</mat-icon> {{ n.readCount }} {{ 'superadmin.notif_read_badge' | translate }}
                  </span>
                  <button mat-icon-button color="warn" (click)="delete(n)" [matTooltip]="'common.delete' | translate">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="notif-content">{{ n.content }}</div>
              @if (!n.targetAll && n.targetEmails.length > 0) {
                <div class="target-emails">
                  @for (email of n.targetEmails; track email) {
                    <span class="email-chip">{{ email }}</span>
                  }
                </div>
              }
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
    mat-card-content { padding-top: 16px; display: flex; flex-direction: column; gap: 12px; }
    mat-card-actions { padding: 8px 16px 16px; }
    .full { width: 100%; }
    .target-section { margin-bottom: 4px; }
    .target-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 8px; }
    .target-options { display: flex; align-items: center; gap: 16px; }
    .selected-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { background: #e3f2fd; color: #1565c0; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
    .user-name { color: #888; font-size: 12px; }
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
    .notif-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .target-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; background: #f5f5f5; padding: 3px 10px; border-radius: 12px; }
    .target-badge.target-all { color: #1565c0; background: #e3f2fd; }
    .target-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .read-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2e7d32; background: #e8f5e9; padding: 3px 10px; border-radius: 12px; }
    .read-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .notif-content { font-size: 14px; color: #444; white-space: pre-wrap; line-height: 1.6; }
    .target-emails { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0; }
    .email-chip { background: #f5f5f5; color: #555; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
  `]
})
export class SuperadminNotificationsComponent implements OnInit {
  private base = environment.apiUrl;

  notifications = signal<Notification[]>([]);
  users = signal<AppUser[]>([]);
  loading = signal(false);
  sending = signal(false);

  form: { subject: string; content: string; targetAll: boolean; selectedUserIds: number[] } = {
    subject: '',
    content: '',
    targetAll: true,
    selectedUserIds: []
  };

  constructor(private http: HttpClient, private snack: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void {
    this.load();
    this.loadUsers();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Notification[]>(`${this.base}/superadmin/notifications`).subscribe({
      next: list => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadUsers(): void {
    this.http.get<AppUser[]>(`${this.base}/superadmin/users`).subscribe({
      next: list => this.users.set(list),
      error: () => {}
    });
  }

  onTargetAllChange(checked: boolean): void {
    if (checked) this.form.selectedUserIds = [];
  }

  emailById(id: number): string {
    return this.users().find(u => u.id === id)?.email ?? String(id);
  }

  send(): void {
    if (!this.form.content.trim()) return;
    if (!this.form.targetAll && !this.form.selectedUserIds.length) return;
    this.sending.set(true);

    const payload: Record<string, unknown> = {
      subject: this.form.subject.trim() || null,
      content: this.form.content.trim()
    };
    if (!this.form.targetAll) payload['targetUserIds'] = this.form.selectedUserIds;

    this.http.post<Notification>(`${this.base}/superadmin/notifications`, payload).subscribe({
      next: n => {
        this.notifications.update(list => [n, ...list]);
        this.form = { subject: '', content: '', targetAll: true, selectedUserIds: [] };
        this.sending.set(false);
        this.snack.open(this.t.instant('superadmin.notif_sent_ok'), this.t.instant('common.ok'), { duration: 3000 });
      },
      error: () => {
        this.sending.set(false);
        this.snack.open(this.t.instant('superadmin.notif_send_error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  delete(n: Notification): void {
    if (!confirm(this.t.instant('superadmin.notif_delete_confirm'))) return;
    this.http.delete(`${this.base}/superadmin/notifications/${n.id}`).subscribe({
      next: () => this.notifications.update(list => list.filter(x => x.id !== n.id)),
      error: () => this.snack.open(this.t.instant('superadmin.notif_delete_error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }
}
