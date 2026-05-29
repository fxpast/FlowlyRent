import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, forkJoin } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { BookingService } from '../../core/services/booking.service';
import { MessageTemplateService, MessageTemplate } from '../../core/services/message-template.service';
import { PropertyConfigService, PropertyConfig } from '../../core/services/property-config.service';
import { localDateStr } from '../../core/utils/date.utils';

const TPL_PLACEHOLDER = 'Bonjour {{nom}}, votre check-in est le {{arrivee}}…';

const TYPE_LABELS: Record<string, string> = {
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CUSTOM: 'Personnalisé'
};

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTabsModule, MatListModule, MatInputModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule, MatMenuModule, MatSnackBarModule
  ],
  template: `
    <h1>Messages</h1>

    <div class="messages-layout">

      <!-- ========= PANNEAU GAUCHE ========= -->
      <mat-card class="conversations-panel">

        <mat-tab-group animationDuration="150ms" (selectedIndexChange)="onTabChange($event)" class="main-tabs">

          <!-- ── Onglet Plateformes ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="ti">public</mat-icon> Plateformes
              @if (platformBookings().length) { <span class="badge">{{ platformBookings().length }}</span> }
            </ng-template>
            <ng-container *ngTemplateOutlet="filtersBlock"></ng-container>
            <ng-container *ngTemplateOutlet="convList; context: { $implicit: platformBookings(), empty: 'Aucune réservation plateforme', type: 'platform' }"></ng-container>
          </mat-tab>

          <!-- ── Onglet Direct ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="ti">edit_note</mat-icon> Direct
              @if (directBookings().length) { <span class="badge">{{ directBookings().length }}</span> }
            </ng-template>
            <ng-container *ngTemplateOutlet="filtersBlock"></ng-container>
            <ng-container *ngTemplateOutlet="convList; context: { $implicit: directBookings(), empty: 'Aucune réservation directe', type: 'direct' }"></ng-container>
          </mat-tab>

          <!-- ── Onglet Modèles ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="ti">auto_fix_high</mat-icon> Modèles
            </ng-template>
            <div class="tpl-toolbar">
              <button mat-stroked-button color="primary" (click)="newTemplate()">
                <mat-icon>add</mat-icon> Nouveau modèle
              </button>
            </div>
            @if (loadingTemplates()) {
              <div class="center"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (templates().length === 0) {
              <p class="empty-list">Aucun modèle. Créez-en un !</p>
            } @else {
              <div class="tpl-list">
                @for (t of templates(); track t.id) {
                  <div class="tpl-item">
                    <div class="tpl-header">
                      <span class="tpl-name">{{ t.name }}</span>
                      <div class="tpl-badges">
                        <span class="type-badge type-{{ t.type }}">{{ typeLabel(t.type) }}</span>
                        @if (t.beds24PropertyId) {
                          <span class="prop-badge">{{ propNameById(t.beds24PropertyId) }}</span>
                        } @else {
                          <span class="prop-badge all">Tous logements</span>
                        }
                      </div>
                    </div>
                    <p class="tpl-preview">{{ t.contentFr }}</p>
                    <div class="tpl-actions">
                      <button mat-icon-button color="primary" (click)="editTemplate(t)" matTooltip="Modifier">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="deleteTemplate(t)" matTooltip="Supprimer">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-tab>

        </mat-tab-group>
      </mat-card>

      <!-- ========= PANNEAU DROIT : CHAT ou ÉDITEUR ========= -->
      @if (editingTemplate()) {
        <!-- Éditeur de modèle -->
        <mat-card class="chat-panel editor-panel">
          <div class="editor-header">
            <h2>{{ editingTemplate()!.id ? 'Modifier le modèle' : 'Nouveau modèle' }}</h2>
            <button mat-icon-button (click)="cancelEdit()" matTooltip="Annuler"><mat-icon>close</mat-icon></button>
          </div>
          <mat-divider></mat-divider>
          <div class="editor-body">

            <mat-form-field appearance="outline" class="full">
              <mat-label>Nom du modèle</mat-label>
              <input matInput [(ngModel)]="editForm.name" placeholder="Ex. : Bienvenue Check-in Appt A">
            </mat-form-field>

            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="editForm.type">
                  <mat-option value="CHECKIN">Check-in</mat-option>
                  <mat-option value="CHECKOUT">Check-out</mat-option>
                  <mat-option value="CUSTOM">Personnalisé</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Logement (optionnel)</mat-label>
                <mat-select [(ngModel)]="editForm.beds24PropertyId">
                  <mat-option value="">Tous les logements</mat-option>
                  @for (p of properties(); track p.id) {
                    <mat-option [value]="p.id">{{ p.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="var-hint">
              Variables disponibles :
              <code (click)="insertVar('{{nom}}')">{{'{{'}}nom{{'}}'}}</code>
              <code (click)="insertVar('{{arrivee}}')">{{'{{'}}arrivee{{'}}'}}</code>
              <code (click)="insertVar('{{depart}}')">{{'{{'}}depart{{'}}'}}</code>
              <code (click)="insertVar('{{logement}}')">{{'{{'}}logement{{'}}'}}</code>
              <code (click)="insertVar('{{code_acces}}')">{{'{{'}}code_acces{{'}}'}}</code>
              <button mat-icon-button (click)="insertVar(genCode())" matTooltip="Générer un code 4 chiffres et l'insérer">
                <mat-icon>casino</mat-icon>
              </button>
            </div>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Contenu du message</mat-label>
              <textarea #contentArea matInput [(ngModel)]="editForm.contentFr"
                        rows="10" [placeholder]="tplPlaceholder"></textarea>
            </mat-form-field>

          </div>
          <mat-divider></mat-divider>
          <div class="editor-footer">
            <button mat-button (click)="cancelEdit()">Annuler</button>
            <button mat-raised-button color="primary" (click)="saveTemplate()"
                    [disabled]="!editForm.name || !editForm.contentFr">
              <mat-icon>save</mat-icon> Enregistrer
            </button>
          </div>
        </mat-card>

      } @else if (selectedBooking()) {
        <!-- Chat -->
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
            <!-- Bouton modèles -->
            <button mat-icon-button [matMenuTriggerFor]="tplMenu" matTooltip="Utiliser un modèle"
                    [disabled]="bookingTemplates().length === 0">
              <mat-icon>auto_fix_high</mat-icon>
            </button>
            <mat-menu #tplMenu="matMenu">
              @for (t of bookingTemplates(); track t.id) {
                <button mat-menu-item (click)="applyTemplate(t)">
                  <span class="type-badge type-{{ t.type }} menu-badge">{{ typeLabel(t.type) }}</span>
                  {{ t.name }}
                </button>
              }
            </mat-menu>

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

    <!-- ── Templates réutilisables ── -->
    <ng-template #filtersBlock>
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
          <input matInput [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Nom du voyageur…" autocomplete="off">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>
    </ng-template>

    <ng-template #convList let-list let-empty="empty" let-type="type">
      @if (loadingBookings()) {
        <div class="center"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (list.length === 0) {
        <p class="empty-list">{{ empty }}</p>
      } @else {
        <div class="conv-list">
          @for (b of list; track b['id']) {
            <div class="conv-item" [class.selected]="selectedBooking()?.['id'] === b['id']"
                 (click)="selectBooking(b)">
              <div class="conv-avatar" [class.platform]="type === 'platform'" [class.direct]="type === 'direct'">
                <mat-icon>{{ type === 'platform' ? 'public' : 'person' }}</mat-icon>
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
      <div class="conv-count">{{ list.length }} conversation{{ list.length !== 1 ? 's' : '' }}</div>
    </ng-template>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }

    .messages-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 16px;
      height: calc(100vh - 160px);
      min-height: 500px;
    }

    /* Panneau gauche */
    .conversations-panel { display: flex; flex-direction: column; padding: 0; overflow: hidden; }

    .main-tabs { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    ::ng-deep .main-tabs .mat-mdc-tab-body-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    ::ng-deep .main-tabs .mat-mdc-tab-body-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .ti { font-size: 15px; width: 15px; height: 15px; margin-right: 4px; vertical-align: middle; }
    .badge {
      display: inline-flex; align-items: center; justify-content: center;
      margin-left: 5px; min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: #0288d1; color: white; font-size: 11px; font-weight: 600;
    }

    .panel-filters { padding: 10px 10px 4px; display: flex; flex-direction: column; gap: 4px; }
    .prop-filter, .search-filter { width: 100%; }

    .conv-list { flex: 1; overflow-y: auto; }
    .conv-item {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
      cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.15s;
    }
    .conv-item:hover { background: #f5f5f5; }
    .conv-item.selected { background: #e3f2fd; border-left: 3px solid #0288d1; }

    .conv-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .conv-avatar.platform { background: #e8f5e9; }
    .conv-avatar.platform mat-icon { color: #2e7d32; }
    .conv-avatar.direct { background: #e3f2fd; }
    .conv-avatar.direct mat-icon { color: #0288d1; }
    .conv-avatar mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .conv-info { flex: 1; min-width: 0; }
    .conv-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-sub { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 2px; flex-wrap: wrap; gap: 2px; }
    .conv-prop { font-weight: 500; color: #0288d1; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
    .conv-dates { font-size: 11px; color: #999; }
    .conv-status { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .conv-channel { font-size: 11px; color: #888; }

    .status-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 500; text-transform: capitalize; }
    .status-confirmed { background: #e8f5e9; color: #2e7d32; }
    .status-new       { background: #e3f2fd; color: #1565c0; }
    .status-request   { background: #fff3e0; color: #e65100; }
    .status-inquiry   { background: #f3e5f5; color: #6a1b9a; }
    .status-black     { background: #eeeeee; color: #212121; }
    .status-cancelled { background: #ffebee; color: #c62828; }

    .conv-count { padding: 5px 14px; font-size: 11px; color: #999; border-top: 1px solid #eee; text-align: right; }
    .empty-list { text-align: center; padding: 32px; color: #aaa; font-style: italic; }

    /* Modèles */
    .tpl-toolbar { padding: 12px 14px; border-bottom: 1px solid #eee; }
    .tpl-list { flex: 1; overflow-y: auto; }
    .tpl-item {
      padding: 12px 14px; border-bottom: 1px solid #f0f0f0;
    }
    .tpl-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px; }
    .tpl-name { font-weight: 600; font-size: 13px; }
    .tpl-badges { display: flex; gap: 4px; flex-wrap: wrap; }
    .type-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 500; }
    .type-CHECKIN  { background: #e3f2fd; color: #1565c0; }
    .type-CHECKOUT { background: #fce4ec; color: #880e4f; }
    .type-CUSTOM   { background: #f3e5f5; color: #6a1b9a; }
    .menu-badge { margin-right: 8px; }
    .prop-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #eeeeee; color: #555; }
    .prop-badge.all { background: #fff8e1; color: #e65100; }
    .tpl-preview { font-size: 12px; color: #777; margin: 6px 0 4px; white-space: pre-wrap; max-height: 48px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .tpl-actions { display: flex; justify-content: flex-end; gap: 4px; }

    /* Éditeur */
    .editor-panel { overflow: auto; }
    .editor-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; }
    .editor-header h2 { margin: 0; font-size: 18px; }
    .editor-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; flex: 1; overflow-y: auto; }
    .editor-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; }
    .full { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .var-hint {
      font-size: 12px; color: #666; display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
      background: #f9f9f9; padding: 8px 12px; border-radius: 8px;
    }
    .var-hint code {
      background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px;
      font-size: 12px; cursor: pointer; user-select: none;
    }
    .var-hint code:hover { background: #bbdefb; }
    .var-hint mat-icon-button { width: 28px; height: 28px; line-height: 28px; }

    /* Chat */
    .chat-panel { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
    .chat-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; flex-shrink: 0;
    }
    .chat-guest-name { font-size: 17px; font-weight: 600; }
    .chat-sub { display: flex; align-items: center; font-size: 12px; color: #666; margin-top: 3px; flex-wrap: wrap; gap: 2px; }
    .tiny-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; color: #0288d1; }
    .phone-link {
      display: flex; align-items: center; gap: 4px; font-size: 13px;
      color: #0288d1; text-decoration: none; flex-shrink: 0;
    }
    .phone-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .chat-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .no-messages {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; color: #bbb;
    }
    .no-messages mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    .message { display: flex; }
    .host-msg { justify-content: flex-end; }
    .guest-msg { justify-content: flex-start; }
    .bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; }
    .host-msg .bubble { background: #0288d1; color: white; border-bottom-right-radius: 4px; }
    .guest-msg .bubble { background: #f0f4f8; border-bottom-left-radius: 4px; }
    .bubble p { margin: 0 0 4px; line-height: 1.5; white-space: pre-wrap; }
    .bubble small { opacity: 0.7; font-size: 11px; }

    .reply-box { display: flex; gap: 8px; align-items: flex-end; padding: 10px 14px; flex-shrink: 0; }
    .reply-input { flex: 1; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; }
    .empty-state mat-icon { font-size: 72px; width: 72px; height: 72px; margin-bottom: 16px; }

    .center { display: flex; justify-content: center; padding: 32px; }

    @media (max-width: 768px) {
      h1 { font-size: 20px; }
      .messages-layout { grid-template-columns: 1fr; height: auto; }
      .conversations-panel { height: 50vh; }
      .chat-panel { height: 60vh; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('chatArea')   chatArea?:   ElementRef<HTMLDivElement>;
  @ViewChild('contentArea') contentArea?: ElementRef<HTMLTextAreaElement>;

  allBookings     = signal<any[]>([]);
  messages        = signal<any[]>([]);
  selectedBooking = signal<any | null>(null);
  filterPropId    = signal('');
  searchText      = signal('');
  newMessage      = '';
  sending         = signal(false);
  loadingBookings = signal(false);
  loadingMessages = signal(false);

  templates        = signal<MessageTemplate[]>([]);
  loadingTemplates = signal(false);
  editingTemplate  = signal<Partial<MessageTemplate> | null>(null);
  editForm: Partial<MessageTemplate> = {};

  private propConfigs = signal<PropertyConfig[]>([]);
  readonly tplPlaceholder = TPL_PLACEHOLDER;

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

  private baseFiltered = computed(() => {
    const today  = localDateStr();
    const propId = this.filterPropId();
    const q      = this.searchText().toLowerCase().trim();
    let list = this.allBookings()
      .filter(b => { const s = (b['status'] ?? '').toLowerCase(); return s === 'new' || s === 'confirmed'; });
    if (propId) list = list.filter(b => String(b['propId'] ?? b['propertyId'] ?? '') === propId);
    if (q)      list = list.filter(b => this.guestName(b).toLowerCase().includes(q));
    return list.sort((a, b) => {
      const da = a['departure'] ?? '', db = b['departure'] ?? '';
      const aF = da >= today, bF = db >= today;
      if (aF && bF) return da.localeCompare(db);
      if (!aF && !bF) return db.localeCompare(da);
      return aF ? -1 : 1;
    });
  });

  platformBookings = computed(() =>
    this.baseFiltered().filter(b => { const c = (b['channel'] ?? '').toLowerCase().trim(); return c !== '' && c !== 'direct'; })
  );

  directBookings = computed(() =>
    this.baseFiltered().filter(b => { const c = (b['channel'] ?? '').toLowerCase().trim(); return c === '' || c === 'direct'; })
  );

  /** Modèles applicables à la réservation sélectionnée (propriété ou tous). */
  bookingTemplates = computed(() => {
    const b = this.selectedBooking();
    if (!b) return this.templates();
    const pid = String(b['propId'] ?? b['propertyId'] ?? '');
    return this.templates().filter(t => !t.beds24PropertyId || t.beds24PropertyId === pid);
  });

  constructor(
    private messageService: MessageService,
    private bookingService: BookingService,
    private templateService: MessageTemplateService,
    private propConfigService: PropertyConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBookings();
    this.loadTemplates();
    this.propConfigService.getAll().subscribe(cfgs => this.propConfigs.set(cfgs));
  }

  private loadBookings(): void {
    this.loadingBookings.set(true);
    const from = new Date(); from.setFullYear(from.getFullYear() - 1);
    forkJoin([
      this.bookingService.getAll({ arrivalFrom: localDateStr(from) }),
      this.bookingService.getPropertyNames()
    ]).subscribe({
      next: ([data, names]) => {
        this.allBookings.set((data ?? []).map(b => {
          if (!b['propName'] && !b['propertyName']) {
            const pid = String(b['propId'] ?? b['propertyId'] ?? '');
            if (pid && names[pid]) return { ...b, propName: names[pid] };
          }
          return b;
        }));
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false)
    });
  }

  private loadTemplates(): void {
    this.loadingTemplates.set(true);
    this.templateService.getAll().subscribe({
      next: t => { this.templates.set(t); this.loadingTemplates.set(false); },
      error: () => this.loadingTemplates.set(false)
    });
  }

  onTabChange(_i: number): void {
    this.wsSubscription?.unsubscribe();
    this.selectedBooking.set(null);
    this.messages.set([]);
    this.editingTemplate.set(null);
  }

  selectBooking(b: any): void {
    this.editingTemplate.set(null);
    this.wsSubscription?.unsubscribe();
    this.selectedBooking.set(b);
    this.messages.set([]);
    this.loadingMessages.set(true);
    const id = String(b['id']);
    this.messageService.getMessages(+id).subscribe({
      next: msgs => { this.messages.set(msgs); this.loadingMessages.set(false); setTimeout(() => this.scrollToBottom(), 50); },
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
      next: msg => { this.messages.update(l => [...l, msg]); this.newMessage = ''; this.sending.set(false); setTimeout(() => this.scrollToBottom()); },
      error: () => this.sending.set(false)
    });
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.send(); }
  }

  /* ── Templates ── */
  newTemplate(): void {
    this.editForm = { name: '', type: 'CHECKIN', contentFr: '', beds24PropertyId: '' };
    this.editingTemplate.set(this.editForm);
  }

  editTemplate(t: MessageTemplate): void {
    this.editForm = { ...t };
    this.editingTemplate.set(this.editForm);
  }

  cancelEdit(): void { this.editingTemplate.set(null); }

  saveTemplate(): void {
    this.templateService.save(this.editForm).subscribe({
      next: () => { this.loadTemplates(); this.editingTemplate.set(null); this.snackBar.open('Modèle enregistré', 'OK', { duration: 2500 }); },
      error: () => this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 })
    });
  }

  deleteTemplate(t: MessageTemplate): void {
    if (!t.id || !confirm(`Supprimer le modèle "${t.name}" ?`)) return;
    this.templateService.delete(t.id).subscribe({ next: () => this.loadTemplates() });
  }

  applyTemplate(t: MessageTemplate): void {
    const b = this.selectedBooking();
    if (!b || !t.contentFr) return;
    const pid = String(b['propId'] ?? b['propertyId'] ?? '');
    const cfg = this.propConfigs().find(c => c.beds24PropertyId === pid);
    this.newMessage = this.templateService.apply(t.contentFr, b, cfg?.accessCode);
  }

  insertVar(v: string): void {
    const el = this.contentArea?.nativeElement;
    if (!el) { this.editForm.contentFr = (this.editForm.contentFr ?? '') + v; return; }
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    this.editForm.contentFr = el.value.substring(0, start) + v + el.value.substring(end);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + v.length; el.focus(); });
  }

  genCode(): string { return this.templateService.genCode(); }

  typeLabel(type: string): string { return TYPE_LABELS[type] ?? type; }

  propNameById(id: string): string {
    return this.properties().find(p => p.id === id)?.name ?? '#' + id;
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
    return String(m['sender'] ?? m['source'] ?? '').toLowerCase() === 'host';
  }

  private scrollToBottom(): void {
    if (this.chatArea?.nativeElement)
      this.chatArea.nativeElement.scrollTop = this.chatArea.nativeElement.scrollHeight;
  }

  ngOnDestroy(): void { this.wsSubscription?.unsubscribe(); }
}
