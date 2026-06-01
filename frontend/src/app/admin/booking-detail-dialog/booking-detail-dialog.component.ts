import { Component, Inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BookingService } from '../../core/services/booking.service';
import { MessageService } from '../../core/services/message.service';
import { MessageTemplateService, MessageTemplate } from '../../core/services/message-template.service';
import { HousekeeperService, HousekeeperProfile } from '../../core/services/housekeeper.service';
import { Message } from '../../core/models/message.model';
import { environment } from '@env/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTabsModule, MatBadgeModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule
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
                <input matInput [matDatepicker]="arrivalPicker" [(ngModel)]="arrivalDate" (ngModelChange)="draft['arrival'] = fromDate($event)">
                <mat-datepicker-toggle matIconSuffix [for]="arrivalPicker"></mat-datepicker-toggle>
                <mat-datepicker #arrivalPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Départ</mat-label>
                <input matInput [matDatepicker]="departurePicker" [(ngModel)]="departureDate" (ngModelChange)="draft['departure'] = fromDate($event)">
                <mat-datepicker-toggle matIconSuffix [for]="departurePicker"></mat-datepicker-toggle>
                <mat-datepicker #departurePicker></mat-datepicker>
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

        <div class="channel-banner" [style.background]="channelColor()">
          <mat-icon class="ch-icon">{{ channelIcon() }}</mat-icon>
          <span class="ch-label">{{ channelLabel() }}</span>
          @if (!isDirect()) {
            <span class="ch-note">— messages transmis via Beds24</span>
          } @else {
            <span class="ch-note">— Email · SMS · WhatsApp</span>
          }
        </div>

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

        @if (templates().length > 0) {
          <div class="template-bar">
            <mat-form-field appearance="outline" class="tpl-select" subscriptSizing="dynamic">
              <mat-label><mat-icon class="tpl-icon">auto_fix_high</mat-icon> Modèle</mat-label>
              <mat-select [(ngModel)]="selectedTemplate" (ngModelChange)="applyTemplate($event)">
                <mat-option [value]="null">— Aucun modèle —</mat-option>
                @for (t of templates(); track t.id) {
                  <mat-option [value]="t">{{ t.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }

        <div class="chat-input-bar">
          <mat-form-field appearance="outline" class="chat-field">
            <textarea matInput [(ngModel)]="newMessage" placeholder="Écrire un message…"
                      rows="2" (keydown.enter)="onEnterSend($event)"></textarea>
          </mat-form-field>
          @if (isDirect()) {
            <div class="direct-btns">
              <button mat-icon-button class="btn-email" title="Envoyer par Email"
                      (click)="sendDirect('email')" [disabled]="!newMessage.trim() || sendingMsg()">
                <mat-icon>email</mat-icon>
              </button>
              <button mat-icon-button class="btn-sms" title="Envoyer par SMS"
                      (click)="sendDirect('sms')" [disabled]="!newMessage.trim() || sendingMsg()">
                <mat-icon>sms</mat-icon>
              </button>
              <button mat-icon-button class="btn-whatsapp" title="Envoyer par WhatsApp"
                      (click)="sendDirect('whatsapp')" [disabled]="!newMessage.trim() || sendingMsg()">
                <mat-icon>chat</mat-icon>
              </button>
            </div>
          } @else {
            <button mat-icon-button color="primary" title="Envoyer via Beds24"
                    (click)="sendMessage()" [disabled]="!newMessage.trim() || sendingMsg()">
              <mat-icon>send</mat-icon>
            </button>
          }
        </div>

        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>Fermer</button>
        </mat-dialog-actions>
      </mat-tab>

      <!-- ── Onglet Ménage ──────────────────────────────────────── -->
      <mat-tab label="Ménage">
        <mat-dialog-content class="menage-content">

          @if (loadingTask()) {
            <div class="center-spin"><mat-spinner diameter="36"/></div>
          } @else if (existingTask()) {
            <!-- Mission existante -->
            <div class="task-card">
              <div class="task-header">
                <mat-icon class="task-icon">cleaning_services</mat-icon>
                <span class="task-title">Mission ménage</span>
                <span class="task-status" [class]="'status-' + existingTask()!.status.toLowerCase()">
                  {{ taskStatusLabel(existingTask()!.status) }}
                </span>
              </div>
              <mat-divider/>
              <div class="task-info-grid">
                <div class="ti-row">
                  <mat-icon>home</mat-icon>
                  <span>{{ existingTask()!.propertyName || draft['propName'] || '—' }}</span>
                </div>
                <div class="ti-row">
                  <mat-icon>calendar_today</mat-icon>
                  <span>{{ existingTask()!.scheduledDate | date:'dd/MM/yyyy' }}</span>
                </div>
                <div class="ti-row">
                  <mat-icon>person</mat-icon>
                  <span>{{ existingTask()!.housekeeper?.name || 'Non assigné' }}</span>
                </div>
                @if (existingTask()!.notes) {
                  <div class="ti-row">
                    <mat-icon>notes</mat-icon>
                    <span>{{ existingTask()!.notes }}</span>
                  </div>
                }
              </div>
              @if (existingTask()!.reportComment || existingTask()!.hasIncident) {
                <mat-divider/>
                <div class="task-report">
                  <div class="report-title">
                    <mat-icon>assignment</mat-icon> Rapport prestataire
                  </div>
                  @if (existingTask()!.hasIncident) {
                    <div class="incident-badge">
                      <mat-icon>warning</mat-icon> Incident signalé
                    </div>
                    @if (existingTask()!.incidentDescription) {
                      <p class="report-text">{{ existingTask()!.incidentDescription }}</p>
                    }
                  }
                  @if (existingTask()!.reportComment) {
                    <p class="report-text">{{ existingTask()!.reportComment }}</p>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Formulaire de création -->
            <div class="task-form">
              <p class="task-hint">
                <mat-icon>info</mat-icon>
                Aucune mission créée pour ce départ. Remplissez les informations ci-dessous.
              </p>
              <div class="row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Date planifiée</mat-label>
                  <input matInput [(ngModel)]="taskForm.scheduledDate" type="date">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Type</mat-label>
                  <mat-select [(ngModel)]="taskForm.type">
                    <mat-option value="CHECKOUT_CLEANING">Nettoyage départ</mat-option>
                    <mat-option value="CHECKIN_PREP">Préparation arrivée</mat-option>
                    <mat-option value="CLEANING">Nettoyage général</mat-option>
                    <mat-option value="MAINTENANCE">Maintenance</mat-option>
                    <mat-option value="INSPECTION">Inspection</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Prestataire</mat-label>
                <mat-select [(ngModel)]="taskForm.housekeeperId">
                  <mat-option [value]="null">— Non assigné —</mat-option>
                  @for (h of housekeepers(); track h.id) {
                    <mat-option [value]="h.id">{{ h.name }}{{ h.phone ? ' · ' + h.phone : '' }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Notes</mat-label>
                <textarea matInput rows="2" [(ngModel)]="taskForm.notes"
                          placeholder="Instructions particulières…"></textarea>
              </mat-form-field>
            </div>
          }

        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>Fermer</button>
          @if (!existingTask() && !loadingTask()) {
            <button mat-raised-button color="primary" (click)="createTask()" [disabled]="savingTask()">
              <mat-icon>add_task</mat-icon> {{ savingTask() ? 'Création…' : 'Créer la mission' }}
            </button>
          }
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
    .channel-banner {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 16px; font-size: 12px; font-weight: 600;
      color: #fff; letter-spacing: 0.3px;
    }
    .ch-icon { font-size: 15px; width: 15px; height: 15px; }
    .ch-note { font-weight: 400; opacity: 0.85; }
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
    .template-bar { padding: 6px 16px 0; border-top: 1px solid #e8e8e8; background: #fafafa; }
    .tpl-select { width: 100%; }
    .tpl-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; }
    .chat-input-bar { display: flex; align-items: flex-end; gap: 4px;
      padding: 6px 16px 4px; border-top: 1px solid #e0e0e0; }
    .chat-field { flex: 1; }
    .direct-btns { display: flex; flex-direction: column; gap: 2px; }
    .btn-email    { color: #1976d2; }
    .btn-sms      { color: #388e3c; }
    .btn-whatsapp { color: #25d366; }

    /* Ménage */
    .menage-content { padding: 16px 24px 8px; min-width: 360px; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .task-card { display: flex; flex-direction: column; gap: 12px; }
    .task-header { display: flex; align-items: center; gap: 8px; }
    .task-icon { color: #546e7a; }
    .task-title { font-size: 16px; font-weight: 600; flex: 1; }
    .task-status { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
    .status-pending     { background: #fff3e0; color: #e65100; }
    .status-in_progress { background: #e3f2fd; color: #0277bd; }
    .status-done        { background: #e8f5e9; color: #2e7d32; }
    .status-skipped     { background: #f5f5f5; color: #757575; }
    .task-info-grid { display: flex; flex-direction: column; gap: 8px; }
    .ti-row { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; color: #333; }
    .ti-row mat-icon { font-size: 18px; width: 18px; height: 18px; color: #888; flex-shrink: 0; margin-top: 1px; }
    .task-report { display: flex; flex-direction: column; gap: 6px; }
    .report-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: #555; }
    .incident-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
      color: #b71c1c; background: #ffebee; padding: 4px 10px; border-radius: 8px; width: fit-content; }
    .report-text { font-size: 13px; color: #444; margin: 0; white-space: pre-wrap; }
    .task-hint { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666;
      background: #f5f5f5; padding: 8px 12px; border-radius: 8px; margin: 0 0 16px; }
    .task-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0288d1; }
    .task-form { display: flex; flex-direction: column; gap: 0; }

    @media (max-width: 600px) {
      mat-dialog-content { min-width: unset; }
      .menage-content { min-width: unset; }
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
  arrivalDate: Date | null = null;
  departureDate: Date | null = null;

  templates = signal<MessageTemplate[]>([]);
  selectedTemplate: MessageTemplate | null = null;

  loadingTask  = signal(false);
  savingTask   = signal(false);
  existingTask = signal<any>(null);
  housekeepers = signal<HousekeeperProfile[]>([]);
  taskForm: { scheduledDate: string; type: string; housekeeperId: number | null; notes: string } = {
    scheduledDate: '',
    type: 'CHECKOUT_CLEANING',
    housekeeperId: null,
    notes: ''
  };

  private wsSub?: Subscription;
  private readonly apiBase = environment.apiUrl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BookingDetailDialogComponent>,
    private bookingService: BookingService,
    private messageService: MessageService,
    private templateService: MessageTemplateService,
    private housekeeperService: HousekeeperService,
    private http: HttpClient,
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
    this.arrivalDate   = this.toDate(d['arrival']);
    this.departureDate = this.toDate(d['departure']);
    this.taskForm.scheduledDate = (d['departure'] || '').toString().substring(0, 10);
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
    if (index === 1) {
      if (this.messages().length === 0) this.loadMessages();
      if (this.templates().length === 0) this.loadTemplates();
    }
    if (index === 2) {
      this.loadHousekeepingTask();
      if (this.housekeepers().length === 0) this.loadHousekeepers();
    }
  }

  private loadTemplates(): void {
    this.templateService.getAll().subscribe({
      next: tpls => {
        const pid     = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
        const context = this.data['templateContext'] as 'checkin' | 'checkout' | undefined;
        this.templates.set(tpls.filter(t => {
          if (t.beds24PropertyId && t.beds24PropertyId !== pid) return false;
          if (context === 'checkin'  && t.type === 'CHECKOUT') return false;
          if (context === 'checkout' && t.type === 'CHECKIN')  return false;
          return true;
        }));
      },
      error: () => {}
    });
  }

  applyTemplate(t: MessageTemplate | null): void {
    if (!t?.contentFr) return;
    this.newMessage = this.templateService.apply(t.contentFr, this.draft);
    this.selectedTemplate = null;
  }

  onEnterSend(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.sendMessage(); }
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

  sendDirect(via: 'email' | 'sms' | 'whatsapp'): void {
    const content = this.newMessage.trim();
    if (!content) return;
    const email = this.draft['guestEmail'] || '';
    const phone = (this.draft['guestPhone'] || '').replace(/[\s\-().]/g, '');
    const prop  = encodeURIComponent(this.draft['propName'] || this.draft['propertyName'] || 'FlowlyRent');
    const body  = encodeURIComponent(content);

    if (via === 'email') {
      window.open(`mailto:${email}?subject=Votre%20r%C3%A9servation%20-%20${prop}&body=${body}`);
    } else if (via === 'sms') {
      window.open(`sms:${phone}?body=${body}`);
    } else {
      const wa = phone.startsWith('+') ? phone.slice(1) : phone;
      window.open(`https://wa.me/${wa}?text=${body}`, '_blank');
    }

    const bookingId = Number(this.data['id']);
    if (bookingId) {
      this.messageService.sendMessage(bookingId, content).subscribe({
        next: msg => {
          this.messages.update(list => [...list, msg]);
          this.newMessage = '';
          this.selectedTemplate = null;
          setTimeout(() => this.scrollToBottom());
        },
        error: () => { this.newMessage = ''; }
      });
    } else {
      this.newMessage = '';
    }
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

  private loadHousekeepingTask(): void {
    const bookingId  = String(this.data['id'] ?? '');
    const propertyId = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    const departure  = (this.draft['departure'] || '').toString().substring(0, 10);
    if (!bookingId) return;
    this.loadingTask.set(true);
    const params: Record<string, string> = {};
    if (propertyId) params['propertyId']   = propertyId;
    if (departure)  params['scheduledDate'] = departure;
    this.http.get<any>(`${this.apiBase}/admin/housekeeping/by-booking/${bookingId}`, { params }).subscribe({
      next: task => { this.existingTask.set(task); this.loadingTask.set(false); },
      error: ()  => { this.existingTask.set(null); this.loadingTask.set(false); }
    });
  }

  private loadHousekeepers(): void {
    this.housekeeperService.getAll().subscribe({
      next: list => this.housekeepers.set(list),
      error: () => {}
    });
  }

  createTask(): void {
    if (this.savingTask()) return;
    const pid = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    if (!pid || !this.taskForm.scheduledDate) {
      this.snackBar.open('Propriété ou date manquante', 'Fermer', { duration: 3000 });
      return;
    }
    this.savingTask.set(true);
    const body: Record<string, any> = {
      beds24PropertyId: pid,
      propertyName:     this.draft['propName'] || this.draft['propertyName'] || '',
      beds24BookingId:  String(this.data['id'] ?? ''),
      scheduledDate:    this.taskForm.scheduledDate,
      type:             this.taskForm.type,
      notes:            this.taskForm.notes || '',
    };
    if (this.taskForm.housekeeperId) body['housekeeperId'] = this.taskForm.housekeeperId;
    this.http.post<any>(`${this.apiBase}/admin/housekeeping`, body).subscribe({
      next: task => {
        this.existingTask.set(task);
        this.savingTask.set(false);
        this.snackBar.open('Mission créée', 'OK', { duration: 2500 });
      },
      error: () => {
        this.savingTask.set(false);
        this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 3000 });
      }
    });
  }

  taskStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING:     'En attente',
      IN_PROGRESS: 'En cours',
      DONE:        'Terminée',
      SKIPPED:     'Ignorée',
    };
    return labels[status] ?? status;
  }

  private get channel(): string {
    return (this.draft['channel'] || this.draft['source'] || 'direct').toString().toLowerCase();
  }

  isDirect(): boolean { return this.channel === 'direct' || this.channel === ''; }

  channelLabel(): string {
    const labels: Record<string, string> = {
      direct:  'Réservation directe',
      airbnb:  'Airbnb',
      booking: 'Booking.com',
      abritel: 'Abritel / Vrbo',
      beds24:  'Beds24',
    };
    return labels[this.channel] ?? this.channel;
  }

  channelColor(): string {
    const colors: Record<string, string> = {
      direct:  '#1976d2',
      airbnb:  '#e8474c',
      booking: '#003580',
      abritel: '#E8572A',
      beds24:  '#546e7a',
    };
    return colors[this.channel] ?? '#757575';
  }

  channelIcon(): string {
    if (this.isDirect()) return 'edit_note';
    if (this.channel === 'airbnb')  return 'house';
    if (this.channel === 'booking') return 'hotel';
    return 'public';
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
