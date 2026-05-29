import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, forkJoin } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { BookingService } from '../../core/services/booking.service';
import { localDateStr } from '../../core/utils/date.utils';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatListModule, MatInputModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatSelectModule, MatFormFieldModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <h1>Messages</h1>

    <div class="messages-layout">

      <!-- Panneau gauche : liste des conversations -->
      <mat-card class="conversations-panel">

        <!-- Filtre propriété -->
        <div class="panel-filters">
          <mat-form-field appearance="outline" class="prop-filter">
            <mat-label>Logement</mat-label>
            <mat-select [ngModel]="filterPropId()" (ngModelChange)="filterPropId.set($event)">
              <mat-option value="">Tous les logements</mat-option>
              @for (p of properties(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="search-filter">
            <mat-label>Rechercher</mat-label>
            <input matInput [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Nom du voyageur…">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        @if (loadingBookings()) {
          <div class="center"><mat-spinner diameter="32"></mat-spinner></div>
        } @else if (filteredBookings().length === 0) {
          <p class="empty-list">Aucune réservation</p>
        } @else {
          <div class="conv-list">
            @for (b of filteredBookings(); track b['id']) {
              <div class="conv-item" [class.selected]="selectedBooking()?.['id'] === b['id']"
                   (click)="selectBooking(b)">
                <div class="conv-avatar">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="conv-info">
                  <div class="conv-name">{{ guestName(b) }}</div>
                  <div class="conv-sub">
                    <span class="conv-prop">{{ propLabel(b) }}</span>
                    <span class="conv-dates">{{ b['arrival'] | date:'dd/MM' }} → {{ b['departure'] | date:'dd/MM' }}</span>
                  </div>
                  <div class="conv-status">
                    <span class="status-badge status-{{ b['status'] }}">{{ b['status'] }}</span>
                    <span class="conv-channel">{{ b['channel'] || 'Direct' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <div class="conv-count">{{ filteredBookings().length }} conversation{{ filteredBookings().length !== 1 ? 's' : '' }}</div>
      </mat-card>

      <!-- Panneau droit : chat -->
      @if (selectedBooking()) {
        <mat-card class="chat-panel">

          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-guest-name">{{ guestName(selectedBooking()) }}</div>
              <div class="chat-sub">
                <mat-icon class="tiny-icon">home</mat-icon>{{ propLabel(selectedBooking()) }}
                &nbsp;·&nbsp;
                <mat-icon class="tiny-icon">login</mat-icon>{{ selectedBooking()?.['arrival'] | date:'dd/MM/yyyy' }}
                &nbsp;→&nbsp;
                <mat-icon class="tiny-icon">logout</mat-icon>{{ selectedBooking()?.['departure'] | date:'dd/MM/yyyy' }}
              </div>
            </div>
            @if (selectedBooking()?.['guestPhone'] || selectedBooking()?.['phone']) {
              <a class="phone-link" [href]="'tel:' + (selectedBooking()?.['guestPhone'] || selectedBooking()?.['phone'])"
                 matTooltip="Appeler">
                <mat-icon>phone</mat-icon>
                {{ selectedBooking()?.['guestPhone'] || selectedBooking()?.['phone'] }}
              </a>
            }
          </div>

          <mat-divider></mat-divider>

          <div class="chat-area" #chatArea>
            @if (loadingMessages()) {
              <div class="center"><mat-spinner diameter="32"></mat-spinner></div>
            } @else if (messages().length === 0) {
              <div class="no-messages">
                <mat-icon>chat_bubble_outline</mat-icon>
                <p>Aucun message pour cette réservation</p>
              </div>
            } @else {
              @for (m of messages(); track $index) {
                <div class="message" [class.host-msg]="isHost(m)" [class.guest-msg]="!isHost(m)">
                  <div class="bubble">
                    <p>{{ m['content'] || m['message'] }}</p>
                    <small>
                      {{ isHost(m) ? 'Vous' : guestName(selectedBooking()) }}
                      · {{ (m['createdAt'] || m['time']) | date:'dd/MM HH:mm' }}
                    </small>
                  </div>
                </div>
              }
            }
          </div>

          <mat-divider></mat-divider>

          <div class="reply-box">
            <mat-form-field appearance="outline" class="reply-input">
              <textarea matInput [(ngModel)]="newMessage"
                        placeholder="Écrire un message…"
                        rows="2"
                        (keydown.enter)="onEnter($event)"></textarea>
            </mat-form-field>
            <button mat-fab color="primary" (click)="send()"
                    [disabled]="!newMessage.trim() || sending()"
                    matTooltip="Envoyer">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </mat-card>

      } @else {
        <mat-card class="chat-panel empty-state">
          <mat-icon>forum</mat-icon>
          <p>Sélectionnez une réservation pour voir les messages</p>
        </mat-card>
      }

    </div>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }

    .messages-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      height: calc(100vh - 160px);
      min-height: 500px;
    }

    /* --- Panneau conversations --- */
    .conversations-panel {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .panel-filters {
      padding: 12px 12px 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prop-filter, .search-filter { width: 100%; }
    ::ng-deep .prop-filter .mat-mdc-form-field-infix,
    ::ng-deep .search-filter .mat-mdc-form-field-infix { padding-top: 8px !important; padding-bottom: 8px !important; }

    .conv-list {
      flex: 1;
      overflow-y: auto;
    }

    .conv-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.15s;
    }
    .conv-item:hover { background: #f5f5f5; }
    .conv-item.selected { background: #e3f2fd; border-left: 3px solid #0288d1; }

    .conv-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .conv-avatar mat-icon { color: #757575; font-size: 20px; width: 20px; height: 20px; }

    .conv-info { flex: 1; min-width: 0; }
    .conv-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-sub { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 2px; flex-wrap: wrap; gap: 2px; }
    .conv-prop { font-weight: 500; color: #0288d1; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
    .conv-dates { font-size: 11px; color: #999; }
    .conv-status { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .conv-channel { font-size: 11px; color: #888; }

    .status-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 8px;
      font-weight: 500;
      text-transform: capitalize;
    }
    .status-confirmed { background: #e8f5e9; color: #2e7d32; }
    .status-new       { background: #e3f2fd; color: #1565c0; }
    .status-request   { background: #fff3e0; color: #e65100; }
    .status-inquiry   { background: #f3e5f5; color: #6a1b9a; }
    .status-black     { background: #eeeeee; color: #212121; }
    .status-cancelled { background: #ffebee; color: #c62828; }

    .conv-count {
      padding: 6px 14px;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #eee;
      text-align: right;
    }

    .empty-list {
      text-align: center;
      padding: 32px;
      color: #aaa;
      font-style: italic;
    }

    /* --- Panneau chat --- */
    .chat-panel {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      flex-shrink: 0;
    }
    .chat-guest-name { font-size: 17px; font-weight: 600; }
    .chat-sub {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #666;
      margin-top: 3px;
      flex-wrap: wrap;
      gap: 2px;
    }
    .tiny-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; color: #0288d1; }

    .phone-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #0288d1;
      text-decoration: none;
      flex-shrink: 0;
    }
    .phone-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .no-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #bbb;
    }
    .no-messages mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }

    .message { display: flex; }
    .host-msg { justify-content: flex-end; }
    .guest-msg { justify-content: flex-start; }
    .bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; }
    .host-msg .bubble { background: #0288d1; color: white; border-bottom-right-radius: 4px; }
    .guest-msg .bubble { background: #f0f4f8; border-bottom-left-radius: 4px; }
    .bubble p { margin: 0 0 4px; line-height: 1.5; }
    .bubble small { opacity: 0.7; font-size: 11px; }

    .reply-box {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      padding: 12px 16px;
      flex-shrink: 0;
    }
    .reply-input { flex: 1; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #bbb;
    }
    .empty-state mat-icon { font-size: 72px; width: 72px; height: 72px; margin-bottom: 16px; }

    .center { display: flex; justify-content: center; padding: 32px; }

    /* Mobile */
    @media (max-width: 768px) {
      h1 { font-size: 20px; }
      .messages-layout { grid-template-columns: 1fr; height: auto; }
      .conversations-panel { height: 50vh; }
      .chat-panel { height: 60vh; }
    }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('chatArea') chatArea?: ElementRef<HTMLDivElement>;

  allBookings    = signal<any[]>([]);
  messages       = signal<any[]>([]);
  selectedBooking = signal<any | null>(null);
  filterPropId   = signal('');
  searchText     = signal('');
  newMessage     = '';
  sending        = signal(false);
  loadingBookings = signal(false);
  loadingMessages = signal(false);

  private wsSubscription?: Subscription;

  properties = computed(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const b of this.allBookings()) {
      const id   = String(b['propId'] ?? b['propertyId'] ?? '');
      const name = b['propName'] ?? b['propertyName'] ?? (id ? '#' + id : '');
      if (id && !seen.has(id)) { seen.add(id); result.push({ id, name }); }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredBookings = computed(() => {
    const today  = localDateStr();
    const propId = this.filterPropId();
    const q      = this.searchText().toLowerCase().trim();
    let list = this.allBookings()
      .filter(b => { const s = (b['status'] ?? '').toLowerCase(); return s === 'new' || s === 'confirmed'; });
    if (propId) list = list.filter(b => String(b['propId'] ?? b['propertyId'] ?? '') === propId);
    if (q)      list = list.filter(b => this.guestName(b).toLowerCase().includes(q));
    return list.sort((a, b) => {
      const da = a['departure'] ?? '';
      const db = b['departure'] ?? '';
      const aFuture = da >= today;
      const bFuture = db >= today;
      if (aFuture && bFuture) return da.localeCompare(db);   // à venir : départ le plus proche d'abord
      if (!aFuture && !bFuture) return db.localeCompare(da); // passés : plus récent d'abord
      return aFuture ? -1 : 1;                               // à venir avant passés
    });
  });

  constructor(private messageService: MessageService, private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadingBookings.set(true);
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    forkJoin([
      this.bookingService.getAll({ arrivalFrom: localDateStr(from) }),
      this.bookingService.getPropertyNames()
    ]).subscribe({
      next: ([data, names]) => {
        const enriched = (data ?? []).map(b => {
          if (!b['propName'] && !b['propertyName']) {
            const pid = String(b['propId'] ?? b['propertyId'] ?? '');
            if (pid && names[pid]) return { ...b, propName: names[pid] };
          }
          return b;
        });
        this.allBookings.set(enriched);
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false)
    });
  }

  selectBooking(b: any): void {
    this.wsSubscription?.unsubscribe();
    this.selectedBooking.set(b);
    this.messages.set([]);
    this.loadingMessages.set(true);
    const id = String(b['id']);
    this.messageService.getMessages(+id).subscribe({
      next: msgs => {
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => this.loadingMessages.set(false)
    });
    this.wsSubscription = this.messageService.watchMessages(+id).subscribe(msg => {
      this.messages.update(list => [...list, msg]);
      setTimeout(() => this.scrollToBottom());
    });
  }

  send(): void {
    const b = this.selectedBooking();
    if (!b || !this.newMessage.trim() || this.sending()) return;
    this.sending.set(true);
    this.messageService.sendMessage(+b['id'], this.newMessage.trim()).subscribe({
      next: msg => {
        this.messages.update(list => [...list, msg]);
        this.newMessage = '';
        this.sending.set(false);
        setTimeout(() => this.scrollToBottom());
      },
      error: () => this.sending.set(false)
    });
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.send(); }
  }

  guestName(b: any): string {
    if (!b) return '—';
    const first = b['guestFirstName'] || b['firstName'] || '';
    const last  = b['guestLastName']  || b['lastName']  || '';
    return (first + ' ' + last).trim() || '—';
  }

  propLabel(b: any): string {
    if (!b) return '—';
    return b['propName'] || b['propertyName'] || (b['propId'] ? '#' + b['propId'] : '—');
  }

  isHost(m: any): boolean {
    const s = String(m['sender'] ?? m['source'] ?? '').toLowerCase();
    return s === 'host';
  }

  private scrollToBottom(): void {
    if (this.chatArea?.nativeElement) {
      this.chatArea.nativeElement.scrollTop = this.chatArea.nativeElement.scrollHeight;
    }
  }

  ngOnDestroy(): void { this.wsSubscription?.unsubscribe(); }
}
