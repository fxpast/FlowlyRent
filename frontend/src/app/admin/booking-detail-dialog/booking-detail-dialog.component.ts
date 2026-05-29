import { Component, Inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { BookingService } from '../../core/services/booking.service';
import { MessageService } from '../../core/services/message.service';
import { Message } from '../../core/models/message.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTabsModule, MatBadgeModule
  ],
  template: `
    <div class="dialog-header">
      <div class="guest-name">{{ guestName() }}</div>
      <span class="booking-id">#{{ draft['id'] }}</span>
    </div>

    <mat-tab-group animationDuration="150ms" (selectedIndexChange)="onTabChange($event)">

      <!-- ── Onglet Détails ───────────────────────────────────────── -->
      <mat-tab label="Détails">
        <mat-dialog-content>
          <div class="edit-grid">
            <div class="prop-row">
              <mat-icon>home</mat-icon>
              <span>{{ draft['propName'] || draft['propertyName'] || ('Propriété ' + (draft['propId'] || draft['propertyId'] || '—')) }}</span>
            </div>
            <mat-divider/>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Prénom</mat-label>
                <input matInput [(ngModel)]="draft['guestFirstName']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput [(ngModel)]="draft['guestLastName']">
              </mat-form-field>
            </div>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [(ngModel)]="draft['guestEmail']" type="email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Téléphone</mat-label>
                <input matInput [(ngModel)]="draft['guestPhone']">
              </mat-form-field>
            </div>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Pays</mat-label>
                <input matInput [(ngModel)]="draft['guestCountry']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Statut</mat-label>
                <mat-select [(ngModel)]="draft['status']">
                  <mat-option value="new">Nouveau</mat-option>
                  <mat-option value="confirmed">Confirmé</mat-option>
                  <mat-option value="request">Demande</mat-option>
                  <mat-option value="inquiry">Renseignement</mat-option>
                  <mat-option value="black">Bloqué</mat-option>
                  <mat-option value="cancelled">Annulé</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <mat-divider/>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Arrivée</mat-label>
                <input matInput type="date" [(ngModel)]="draft['arrival']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Départ</mat-label>
                <input matInput type="date" [(ngModel)]="draft['departure']">
              </mat-form-field>
            </div>
            <div class="row-3">
              <mat-form-field appearance="outline">
                <mat-label>Adultes</mat-label>
                <input matInput type="number" min="0" [(ngModel)]="draft['numAdult']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Enfants</mat-label>
                <input matInput type="number" min="0" [(ngModel)]="draft['numChild']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Montant (€)</mat-label>
                <input matInput type="number" step="0.01" [(ngModel)]="draft['totalPrice']">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="2" [(ngModel)]="draft['notes']"></textarea>
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close [disabled]="saving()">Fermer</button>
          @if (draft['status'] !== 'cancelled') {
            <button mat-stroked-button color="warn" (click)="cancelBooking()" [disabled]="saving()">
              <mat-icon>cancel</mat-icon> Annuler résa
            </button>
          }
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon> {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </mat-dialog-actions>
      </mat-tab>

      <!-- ── Onglet Messages ─────────────────────────────────────── -->
      <mat-tab>
        <ng-template mat-tab-label>
          Messages
          @if (unreadCount() > 0) {
            <span class="msg-badge">{{ unreadCount() }}</span>
          }
        </ng-template>

        <mat-dialog-content class="messages-content">
          <div class="chat-area" #chatArea>
            @if (loadingMessages()) {
              <p class="msg-loading">Chargement…</p>
            }
            @for (m of messages(); track m.id) {
              <div class="bubble-row" [class.host]="m.sender === 'HOST'" [class.guest]="m.sender === 'GUEST'">
                <div class="bubble">
                  <div class="bubble-text">{{ m.content }}</div>
                  <div class="bubble-time">{{ m.createdAt | date:'dd/MM HH:mm' }}</div>
                </div>
              </div>
            }
            @if (!loadingMessages() && messages().length === 0) {
              <p class="msg-empty">Aucun message</p>
            }
          </div>
        </mat-dialog-content>

        <div class="chat-input-bar">
          <mat-form-field appearance="outline" class="chat-field">
            <input matInput [(ngModel)]="newMessage" placeholder="Écrire un message…"
                   (keydown.enter)="sendMessage()">
          </mat-form-field>
          <button mat-icon-button color="primary" (click)="sendMessage()"
                  [disabled]="!newMessage.trim() || sendingMsg()">
            <mat-icon>send</mat-icon>
          </button>
        </div>

        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>Fermer</button>
        </mat-dialog-actions>
      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    .dialog-header { display: flex; align-items: baseline; gap: 12px; padding: 20px 24px 8px; }
    .guest-name { font-size: 20px; font-weight: 600; flex: 1; }
    .booking-id { font-size: 12px; color: #aaa; }
    .msg-badge { background: #e53935; color: #fff; font-size: 11px; font-weight: 700;
      border-radius: 10px; padding: 1px 6px; margin-left: 6px; }

    mat-dialog-content { min-width: 360px; max-width: 560px; padding-top: 8px; }
    .edit-grid { display: flex; flex-direction: column; gap: 0; }
    .prop-row { display: flex; align-items: center; gap: 8px; padding: 4px 0 8px;
      font-size: 15px; font-weight: 500; color: #333; }
    .prop-row mat-icon { color: #0288d1; font-size: 20px; width: 20px; height: 20px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .full { width: 100%; }
    mat-divider { margin: 4px 0 12px; }

    /* Messages */
    .messages-content { padding: 0 !important; }
    .chat-area { height: 300px; overflow-y: auto; padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px; }
    .msg-loading, .msg-empty { text-align: center; color: #999; font-size: 13px; margin: auto; }
    .bubble-row { display: flex; }
    .bubble-row.host { justify-content: flex-end; }
    .bubble-row.guest { justify-content: flex-start; }
    .bubble { max-width: 75%; padding: 8px 12px; border-radius: 12px;
      display: flex; flex-direction: column; gap: 2px; }
    .bubble-row.host .bubble { background: #1976d2; color: #fff;
      border-bottom-right-radius: 2px; }
    .bubble-row.guest .bubble { background: #f5f5f5; color: #222;
      border-bottom-left-radius: 2px; }
    .bubble-text { font-size: 14px; line-height: 1.4; white-space: pre-wrap; }
    .bubble-time { font-size: 10px; opacity: 0.65; align-self: flex-end; }
    .chat-input-bar { display: flex; align-items: center; gap: 4px;
      padding: 0 16px 4px; border-top: 1px solid #e0e0e0; }
    .chat-field { flex: 1; }

    @media (max-width: 600px) {
      mat-dialog-content { min-width: unset; }
      .row-2, .row-3 { grid-template-columns: 1fr; }
    }
  `]
})
export class BookingDetailDialogComponent implements OnInit, OnDestroy {
  @ViewChild('chatArea') chatArea?: ElementRef<HTMLDivElement>;

  saving = signal(false);
  draft: Record<string, any>;

  messages = signal<Message[]>([]);
  loadingMessages = signal(false);
  unreadCount = signal(0);
  newMessage = '';
  sendingMsg = signal(false);
  private wsSub?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BookingDetailDialogComponent>,
    private bookingService: BookingService,
    private messageService: MessageService,
    private snackBar: MatSnackBar
  ) {
    const d: Record<string, any> = { ...data };
    d['guestFirstName'] = d['guestFirstName'] || d['firstName'] || '';
    d['guestLastName']  = d['guestLastName']  || d['lastName']  || '';
    d['guestEmail']     = d['guestEmail']     || d['email']     || '';
    d['guestPhone']     = d['guestPhone']     || d['phone']     || d['guestMobile'] || '';
    d['guestCountry']   = d['guestCountry']   || '';
    d['propId']         = d['propId']         || d['propertyId'] || '';
    d['propName']       = d['propName']       || d['propertyName'] || '';
    d['totalPrice']     = d['totalPrice']     ?? d['price']     ?? null;
    d['notes']          = d['notes']          || d['internalNotes'] || '';
    d['arrival']        = (d['arrival']    || '').toString().substring(0, 10);
    d['departure']      = (d['departure']  || '').toString().substring(0, 10);
    if (!d['guestFirstName'] && !d['guestLastName'] && d['guestName']) {
      const parts = (d['guestName'] as string).split(' ');
      d['guestFirstName'] = parts[0] || '';
      d['guestLastName']  = parts.slice(1).join(' ') || '';
    }
    this.draft = d;
  }

  ngOnInit(): void {
    const bookingId = Number(this.data['id']);
    if (!bookingId) return;
    this.wsSub = this.messageService.watchMessages(bookingId).subscribe(msg => {
      this.messages.update(list => [...list, msg]);
      if (msg.sender === 'GUEST') this.unreadCount.update(n => n + 1);
      setTimeout(() => this.scrollToBottom());
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  onTabChange(index: number): void {
    if (index === 1 && this.messages().length === 0) {
      this.loadMessages();
    }
  }

  private loadMessages(): void {
    const bookingId = Number(this.data['id']);
    if (!bookingId) return;
    this.loadingMessages.set(true);
    this.messageService.getMessages(bookingId).subscribe({
      next: msgs => {
        this.messages.set(msgs ?? []);
        this.unreadCount.set(0);
        this.loadingMessages.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => this.loadingMessages.set(false)
    });
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.sendingMsg()) return;
    const bookingId = Number(this.data['id']);
    this.sendingMsg.set(true);
    this.messageService.sendMessage(bookingId, content).subscribe({
      next: msg => {
        this.messages.update(list => [...list, msg]);
        this.newMessage = '';
        this.sendingMsg.set(false);
        setTimeout(() => this.scrollToBottom());
      },
      error: () => { this.sendingMsg.set(false); }
    });
  }

  private scrollToBottom(): void {
    if (this.chatArea) {
      this.chatArea.nativeElement.scrollTop = this.chatArea.nativeElement.scrollHeight;
    }
  }

  guestName(): string {
    const first = this.draft['guestFirstName'] || '';
    const last  = this.draft['guestLastName']  || '';
    return (first + ' ' + last).trim() || this.data['guestName'] || 'Voyageur';
  }

  save(): void {
    this.saving.set(true);
    this.bookingService.save([this.draft]).subscribe({
      next: () => {
        this.snackBar.open('Réservation mise à jour', 'OK', { duration: 3000 });
        this.dialogRef.close({ updated: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }

  cancelBooking(): void {
    if (!confirm(`Annuler la réservation de ${this.guestName()} ?`)) return;
    this.saving.set(true);
    this.bookingService.cancel(String(this.draft['id'])).subscribe({
      next: () => {
        this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 });
        this.dialogRef.close({ cancelled: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }
}
