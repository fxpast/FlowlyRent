import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

interface AdminNotification {
  id: number;
  subject?: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslateModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'notifications.title' | translate }}</h2>
      @if (unread() > 0) {
        <button mat-stroked-button (click)="markAllRead()">
          <mat-icon>done_all</mat-icon> {{ 'notifications.mark_all_read' | translate }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (notifications().length === 0) {
      <div class="empty">
        <mat-icon>notifications_none</mat-icon>
        <p>{{ 'notifications.empty' | translate }}</p>
      </div>
    } @else {
      <div class="notif-list">
        @for (n of notifications(); track n.id) {
          <mat-card class="notif-card" [class.unread]="!n.isRead" (click)="read(n)">
            @if (!n.isRead) {
              <div class="unread-dot"></div>
            }
            <div class="notif-header">
              @if (n.subject) {
                <div class="notif-subject">{{ n.subject }}</div>
              }
              <div class="notif-date">{{ n.sentAt | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div class="notif-content">{{ n.content }}</div>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; font-size: 24px; font-weight: 600; }
    .center { display: flex; justify-content: center; padding: 60px; }
    .empty { display: flex; flex-direction: column; align-items: center; color: #aaa; padding: 60px 0; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .empty p { margin: 0; font-size: 15px; }
    .notif-list { display: flex; flex-direction: column; gap: 12px; max-width: 760px; }
    .notif-card { padding: 16px 20px; cursor: pointer; position: relative; transition: box-shadow 0.15s; border-left: 4px solid transparent; }
    .notif-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .notif-card.unread { border-left-color: #1976d2; background: #f0f7ff; }
    .unread-dot { position: absolute; top: 18px; right: 16px; width: 8px; height: 8px; border-radius: 50%; background: #1976d2; }
    .notif-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    .notif-subject { font-size: 15px; font-weight: 600; color: #222; flex: 1; }
    .notif-date { font-size: 12px; color: #999; flex-shrink: 0; }
    .notif-content { font-size: 14px; color: #444; white-space: pre-wrap; line-height: 1.65; }
  `]
})
export class NotificationsComponent implements OnInit {
  private base = environment.apiUrl;

  notifications = signal<AdminNotification[]>([]);
  loading = signal(false);
  unread = () => this.notifications().filter(n => !n.isRead).length;

  constructor(private http: HttpClient, private snack: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<AdminNotification[]>(`${this.base}/admin/notifications`).subscribe({
      next: list => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  read(n: AdminNotification): void {
    if (n.isRead) return;
    this.http.post(`${this.base}/admin/notifications/${n.id}/read`, {}).subscribe({
      next: () => this.notifications.update(list =>
        list.map(x => x.id === n.id ? { ...x, isRead: true } : x)
      ),
      error: () => {}
    });
  }

  markAllRead(): void {
    this.http.post(`${this.base}/admin/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(x => ({ ...x, isRead: true })));
        this.snack.open(this.t.instant('notifications.all_read'), '', { duration: 2000 });
      },
      error: () => this.snack.open(this.t.instant('notifications.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }
}
