import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SyncService } from '../../core/services/sync.service';
import { Channel } from '../../core/models/booking.model';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule, MatChipsModule, MatSnackBarModule, MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="header">
      <h1>{{ 'sync.title' | translate }}</h1>
      <button mat-raised-button color="primary" (click)="syncAll()" [disabled]="syncing()">
        @if (syncing()) { <mat-spinner diameter="20"></mat-spinner> }
        @else { <mat-icon>sync</mat-icon> }
        {{ 'sync.sync_all' | translate }}
      </button>
    </div>

    <div class="info-box">
      <mat-icon>info</mat-icon>
      <p>{{ 'sync.info' | translate }}</p>
    </div>

    <mat-card class="add-channel">
      <mat-card-header><mat-card-title>{{ 'sync.add_channel_title' | translate }}</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'sync.platform' | translate }}</mat-label>
            <mat-select [(ngModel)]="newChannel.platform">
              <mat-option value="BOOKING_COM">Booking.com</mat-option>
              <mat-option value="AIRBNB">Airbnb</mat-option>
              <mat-option value="ABRITEL">Abritel</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'sync.property_id' | translate }}</mat-label>
            <input matInput [(ngModel)]="newChannel.propertyId" type="number">
          </mat-form-field>
          <mat-form-field appearance="outline" class="ical-url">
            <mat-label>{{ 'sync.ical_url' | translate }}</mat-label>
            <input matInput [(ngModel)]="newChannel.icalUrl" placeholder="https://...">
          </mat-form-field>
          <button mat-raised-button color="accent" (click)="addChannel()">
            <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-header><mat-card-title>{{ 'sync.configured_channels' | translate }}</mat-card-title></mat-card-header>
      <mat-card-content>
        <table mat-table [dataSource]="channels()" class="full-width">
          <ng-container matColumnDef="platform">
            <th mat-header-cell *matHeaderCellDef>{{ 'sync.platform' | translate }}</th>
            <td mat-cell *matCellDef="let c">
              <mat-chip>{{ platformLabel(c.platform) }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="property">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.property' | translate }}</th>
            <td mat-cell *matCellDef="let c">{{ c.property?.name || 'ID: ' + c.property?.id }}</td>
          </ng-container>
          <ng-container matColumnDef="icalUrl">
            <th mat-header-cell *matHeaderCellDef>{{ 'sync.ical_url' | translate }}</th>
            <td mat-cell *matCellDef="let c">
              <small>{{ c.icalUrl ? (c.icalUrl.substring(0, 50) + '...') : ('sync.not_configured' | translate) }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="lastSync">
            <th mat-header-cell *matHeaderCellDef>{{ 'sync.last_sync' | translate }}</th>
            <td mat-cell *matCellDef="let c">
              {{ c.lastSync ? (c.lastSync | date:'dd/MM HH:mm') : ('sync.never' | translate) }}<br>
              @if (c.lastSyncStatus) {
                <mat-chip [class]="c.lastSyncStatus === 'OK' ? 'status-ok' : 'status-error'">
                  {{ c.lastSyncStatus === 'OK' ? c.lastSyncBookingsCount + ' ' + ('sync.imported' | translate) : ('common.error' | translate) }}
                </mat-chip>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>{{ 'sync.active' | translate }}</th>
            <td mat-cell *matCellDef="let c">
              <mat-icon [style.color]="c.active ? '#2e7d32' : '#c62828'">
                {{ c.active ? 'check_circle' : 'cancel' }}
              </mat-icon>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button color="primary" (click)="triggerSync(c)" [title]="'sync.trigger_now' | translate">
                <mat-icon>sync</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        @if (channels().length === 0) {
          <p class="empty">{{ 'sync.empty' | translate }}</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .info-box { display: flex; align-items: flex-start; gap: 12px; background: #e3f2fd; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
    .info-box mat-icon { color: #1565c0; flex-shrink: 0; }
    .info-box p { margin: 0; color: #1565c0; font-size: 14px; }
    .add-channel { margin-bottom: 16px; }
    .form-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .ical-url { min-width: 300px; }
    .full-width { width: 100%; }
    .empty { text-align: center; padding: 24px; color: #999; }
    .status-ok { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-error { background: #ffebee !important; color: #c62828 !important; }
    small { font-size: 11px; color: #666; }
  `]
})
export class SyncComponent implements OnInit {
  channels = signal<Channel[]>([]);
  syncing = signal(false);
  newChannel: Partial<Channel> = { platform: 'BOOKING_COM' };
  columns = ['platform', 'property', 'icalUrl', 'lastSync', 'active', 'actions'];

  constructor(private syncService: SyncService, private snackBar: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void {
    this.loadChannels();
  }

  loadChannels(): void {
    this.syncService.getChannels().subscribe(data => this.channels.set(data));
  }

  addChannel(): void {
    if (!this.newChannel.platform || !this.newChannel.propertyId) return;
    this.syncService.createChannel(this.newChannel as Channel).subscribe(() => {
      this.snackBar.open(this.t.instant('sync.channel_added'), this.t.instant('common.ok'), { duration: 3000 });
      this.newChannel = { platform: 'BOOKING_COM' };
      this.loadChannels();
    });
  }

  triggerSync(channel: Channel): void {
    if (!channel.id) return;
    this.syncService.syncChannel(channel.id).subscribe(res => {
      const msg = res.status === 'OK'
        ? `${this.t.instant('sync.ok_prefix')} ${res.bookingsImported} ${this.t.instant('sync.ok_suffix')}`
        : `${this.t.instant('common.error')} : ${res.error}`;
      this.snackBar.open(msg, this.t.instant('common.ok'), { duration: 5000 });
      this.loadChannels();
    });
  }

  syncAll(): void {
    this.syncing.set(true);
    this.syncService.syncAll().subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('sync.sync_all_launched'), this.t.instant('common.ok'), { duration: 3000 });
        setTimeout(() => { this.syncing.set(false); this.loadChannels(); }, 3000);
      },
      error: () => this.syncing.set(false)
    });
  }

  platformLabel(p: string): string {
    return { BOOKING_COM: 'Booking.com', AIRBNB: 'Airbnb', ABRITEL: 'Abritel' }[p] || p;
  }
}
