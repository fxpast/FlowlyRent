import { Component, Inject, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TextFieldModule } from '@angular/cdk/text-field';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { MessageService } from '../../core/services/message.service';
import { MessageTemplateService, MessageTemplate } from '../../core/services/message-template.service';
import { HousekeeperService, HousekeeperProfile } from '../../core/services/housekeeper.service';
import { HousekeepingService } from '../../core/services/housekeeping.service';
import { BookingTimeOverrideService } from '../../core/services/booking-time-override.service';
import { PropertyConfigService } from '../../core/services/property-config.service';
import { MessageReminderService } from '../../core/services/message-reminder.service';
import { Message } from '../../core/models/message.model';
import { environment } from '@env/environment';
import { Subscription, from, of, Observable } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { TranslationService } from '../../core/services/translation.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTabsModule, MatBadgeModule, MatProgressSpinnerModule, MatTooltipModule, MatMenuModule,
    MatDatepickerModule, MatNativeDateModule, TextFieldModule, TranslateModule
  ],
  template: `
    <div class="dialog-header">
      <div class="guest-name">{{ guestName() }}</div>
      <span class="booking-id">#{{ draft['id'] }}</span>
      <div class="header-actions">
        @if (!isIcalMode() && activeTab() === 0 && draft['status'] !== 'cancelled') {
          <button mat-icon-button color="warn" (click)="cancelBooking()" [disabled]="saving()" [matTooltip]="'booking_dialog.cancel_booking_tooltip' | translate">
            <mat-icon>cancel</mat-icon>
          </button>
        }
        @if (!isIcalMode() && activeTab() === 0) {
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon> {{ saving() ? '…' : ('common.save' | translate) }}
          </button>
        }
        @if (isHousekeepingTab() && !loadingTask()) {
          <button mat-flat-button color="primary" (click)="createTask()" [disabled]="savingTask()">
            <mat-icon>add_task</mat-icon> {{ savingTask() ? '…' : ('common.create' | translate) }}
          </button>
        }
        @if (!isIcalMode()) {
          <button mat-icon-button (click)="goCreateInvoice()" [matTooltip]="'booking_dialog.create_invoice' | translate">
            <mat-icon>receipt_long</mat-icon>
          </button>
        }
        <button mat-icon-button mat-dialog-close [disabled]="saving()" [matTooltip]="'booking_dialog.close_tooltip' | translate">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-tab-group animationDuration="150ms" (selectedIndexChange)="onTabChange($event)">

      <!-- ── Onglet Détails ───────────────────────────────────────── -->
      @if (!isIcalMode()) {
      <mat-tab [label]="'booking_dialog.tab_details' | translate">
        <mat-dialog-content>
          <div class="edit-grid">
            <div class="prop-row">
              <mat-icon>home</mat-icon>
              <span>{{ draft['propName'] || draft['propertyName'] || (('common.property' | translate) + ' ' + (draft['propId'] || draft['propertyId'] || '—')) }}</span>
            </div>
            <mat-divider/>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.first_name' | translate }}</mat-label>
                <input matInput [(ngModel)]="draft['guestFirstName']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.last_name' | translate }}</mat-label>
                <input matInput [(ngModel)]="draft['guestLastName']">
              </mat-form-field>
            </div>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'common.email' | translate }}</mat-label>
                <input matInput [(ngModel)]="draft['guestEmail']" type="email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'common.phone' | translate }}</mat-label>
                <input matInput [(ngModel)]="draft['guestPhone']">
              </mat-form-field>
            </div>
            <div class="row-3">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.country' | translate }}</mat-label>
                <input matInput [(ngModel)]="draft['guestCountry']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.language' | translate }}</mat-label>
                <mat-select [(ngModel)]="draft['lang']" (ngModelChange)="onLangChange($event)">
                  <mat-option value="">—</mat-option>
                  <mat-option value="fr">Français</mat-option>
                  <mat-option value="en">English</mat-option>
                  <mat-option value="de">Deutsch</mat-option>
                  <mat-option value="nl">Nederlands</mat-option>
                  <mat-option value="es">Español</mat-option>
                  <mat-option value="it">Italiano</mat-option>
                  <mat-option value="pt">Português</mat-option>
                  <mat-option value="ru">Русский</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'common.status' | translate }}</mat-label>
                <mat-select [(ngModel)]="draft['status']">
                  <mat-option value="new">{{ 'booking_dialog.status_new' | translate }}</mat-option>
                  <mat-option value="confirmed">{{ 'booking_dialog.status_confirmed' | translate }}</mat-option>
                  <mat-option value="request">{{ 'booking_dialog.status_request' | translate }}</mat-option>
                  <mat-option value="inquiry">{{ 'booking_dialog.status_inquiry' | translate }}</mat-option>
                  <mat-option value="black">{{ 'booking_dialog.status_black' | translate }}</mat-option>
                  <mat-option value="cancelled">{{ 'booking_dialog.status_cancelled' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <mat-divider/>
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.arrival' | translate }}</mat-label>
                <input matInput [matDatepicker]="arrivalPicker" [(ngModel)]="arrivalDate"
                       (ngModelChange)="draft['arrival'] = fromDate($event)">
                <mat-datepicker-toggle matIconSuffix [for]="arrivalPicker"></mat-datepicker-toggle>
                <mat-datepicker #arrivalPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.departure' | translate }}</mat-label>
                <input matInput [matDatepicker]="departurePicker" [(ngModel)]="departureDate"
                       (ngModelChange)="draft['departure'] = fromDate($event)">
                <mat-datepicker-toggle matIconSuffix [for]="departurePicker"></mat-datepicker-toggle>
                <mat-datepicker #departurePicker></mat-datepicker>
              </mat-form-field>
            </div>
            <!-- ── Section horaires personnalisés ── -->
            <div class="horaires-section">
              <div class="horaires-header">
                <mat-icon class="h-icon">schedule</mat-icon>
                <span class="h-title">{{ 'booking_dialog.times_title' | translate }}</span>
                @if (hasCustomTimes) {
                  <span class="arrangement-badge">{{ 'booking_dialog.arrangement_badge' | translate }}</span>
                }
              </div>
              <div class="horaires-chips">
                <div class="horaire-chip" [class.custom]="hasCustomCheckin">
                  <mat-icon>login</mat-icon>
                  <span class="h-label">Check-in</span>
                  <input type="time" [(ngModel)]="arrivalTime" class="time-chip-input">
                  @if (hasCustomCheckin) {
                    <span class="h-default">{{ 'booking_dialog.standard' | translate }} {{ DEFAULT_CHECKIN }}</span>
                  }
                </div>
                <div class="horaire-chip" [class.custom]="hasCustomCheckout">
                  <mat-icon>logout</mat-icon>
                  <span class="h-label">Check-out</span>
                  <input type="time" [(ngModel)]="departureTime" class="time-chip-input">
                  @if (hasCustomCheckout) {
                    <span class="h-default">{{ 'booking_dialog.standard' | translate }} {{ DEFAULT_CHECKOUT }}</span>
                  }
                </div>
              </div>
              @if (hasCustomTimes) {
                <mat-form-field appearance="outline" class="full motif-field">
                  <mat-label>{{ 'booking_dialog.arrangement_reason' | translate }}</mat-label>
                  <input matInput [(ngModel)]="customTimeComment"
                         [placeholder]="'booking_dialog.arrangement_reason_placeholder' | translate">
                  <mat-icon matPrefix>chat_bubble_outline</mat-icon>
                </mat-form-field>
              }
              <div class="horaires-actions">
                @if (hasCustomTimes) {
                  <button mat-flat-button color="accent" (click)="confirmTimes()" [disabled]="savingTimes()">
                    <mat-icon>check</mat-icon> {{ savingTimes() ? ('booking_dialog.saving' | translate) : ('booking_dialog.confirm_times' | translate) }}
                  </button>
                  <button mat-stroked-button (click)="resetTimes()" [disabled]="savingTimes()">
                    <mat-icon>restart_alt</mat-icon> {{ 'booking_dialog.reset_times' | translate }}
                  </button>
                } @else {
                  <span class="h-standard">{{ 'booking_dialog.standard_times' | translate }}</span>
                }
              </div>
            </div>

            <div class="row-3">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.adults' | translate }}</mat-label>
                <input matInput type="number" min="0" [(ngModel)]="draft['numAdult']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.children' | translate }}</mat-label>
                <input matInput type="number" min="0" [(ngModel)]="draft['numChild']">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'booking_dialog.amount_label' | translate }}</mat-label>
                <input matInput type="number" step="0.01" [(ngModel)]="draft['totalPrice']">
              </mat-form-field>
            </div>
            @if (draft['totalPrice'] > 0) {
              <div class="taxe-row">
                <mat-icon class="taxe-icon">receipt_long</mat-icon>
                <span class="taxe-label">{{ 'booking_dialog.taxe_sejour' | translate }}</span>
                <span class="taxe-value">{{ taxeSejour | number:'1.2-2' }} €</span>
                @if (cleaningFee() > 0) {
                  <span class="taxe-hint">({{ 'booking_dialog.taxe_base' | translate : { fee: cleaningFee() } }})</span>
                }
              </div>
            }
            <mat-form-field appearance="outline" class="full">
              <mat-label>{{ 'common.notes' | translate }}</mat-label>
              <textarea matInput rows="2" [(ngModel)]="draft['notes']"></textarea>
            </mat-form-field>

            <!-- ── Paiement / Caution ── -->
            <div class="payment-section">
              <div class="payment-header">
                <mat-icon class="pay-icon">payment</mat-icon>
                <span>{{ 'booking_dialog.payment_request' | translate }}</span>
              </div>
              <div class="payment-row">
                <mat-form-field appearance="outline" class="pay-amount" subscriptSizing="dynamic">
                  <mat-label>{{ 'booking_dialog.amount_eur' | translate }}</mat-label>
                  <input matInput type="number" min="1" step="0.01"
                         [(ngModel)]="payAmount" (ngModelChange)="payLink.set('')">
                </mat-form-field>
                <button mat-stroked-button color="primary"
                        [disabled]="!payAmount || !beds24Id"
                        (click)="generatePayLink('payment')"
                        [matTooltip]="'booking_dialog.pay_immediate_tooltip' | translate">
                  <mat-icon>euro</mat-icon> {{ 'booking_dialog.pay_btn' | translate }}
                </button>
                <button mat-stroked-button
                        [disabled]="!payAmount || !beds24Id"
                        (click)="generatePayLink('deposit')"
                        [matTooltip]="'booking_dialog.deposit_tooltip' | translate">
                  <mat-icon>shield</mat-icon> {{ 'booking_dialog.deposit_btn' | translate }}
                </button>
              </div>
              @if (payLink()) {
                <div class="pay-link-box">
                  <a [href]="payLink()" target="_blank" class="pay-link-text">{{ payLink() }}</a>
                  <button mat-icon-button (click)="copyPayLink()" [matTooltip]="'booking_dialog.copy_link_tooltip' | translate">
                    <mat-icon>{{ payLinkCopied() ? 'check' : 'content_copy' }}</mat-icon>
                  </button>
                  <a mat-icon-button [href]="payLink()" target="_blank" [matTooltip]="'booking_dialog.open_link' | translate">
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                </div>
              }
            </div>
          </div>
        </mat-dialog-content>

      </mat-tab>
      } <!-- end @if !isIcalMode détails -->

      <!-- ── Onglet Messages ─────────────────────────────────────── -->
      @if (!isIcalMode()) {
      <mat-tab>
        <ng-template mat-tab-label>
          {{ 'nav.messages' | translate }}
          @if (unreadCount() > 0) {
            <span class="msg-badge">{{ unreadCount() }}</span>
          }
        </ng-template>

        <div class="messages-layout">
          <div class="channel-banner" [style.background]="channelColor()">
            <mat-icon class="ch-icon">{{ channelIcon() }}</mat-icon>
            <span class="ch-label">{{ channelLabel() }}</span>
            @if (!isDirect()) {
              <span class="ch-note">— {{ 'booking_dialog.via_beds24' | translate }}</span>
            } @else {
              <span class="ch-note">— {{ 'booking_dialog.direct_note' | translate }}</span>
            }
          </div>

          <div class="chat-area" #chatArea>
            @if (loadingMessages()) {
              <p class="msg-loading">{{ 'common.loading' | translate }}</p>
            }
            @for (m of messages(); track m.id) {
              <div class="bubble-row" [class.host]="m.sender === 'HOST'" [class.guest]="m.sender === 'GUEST'">
                <div class="bubble">
                  @if (m.sender === 'GUEST' && dlgTranslating().has(m.id!)) {
                    <div class="bubble-text tl-pending">{{ 'booking_dialog.translating' | translate }}</div>
                  } @else if (m.sender === 'GUEST' && dlgTranslations().has(m.id!) && !dlgShowOriginal().has(m.id!)) {
                    <div class="bubble-text">{{ dlgTranslations().get(m.id!) }}</div>
                    <div class="tl-bar"><button class="tl-btn" (click)="toggleDlgOriginal(m.id!)">{{ 'booking_dialog.see_original' | translate }}</button></div>
                  } @else {
                    <div class="bubble-text">{{ m.content }}</div>
                    @if (m.sender === 'GUEST' && dlgTranslations().has(m.id!)) {
                      <div class="tl-bar"><button class="tl-btn" (click)="toggleDlgOriginal(m.id!)">{{ 'booking_dialog.see_translation' | translate }}</button></div>
                    } @else if (m.sender === 'GUEST' && !dlgTranslating().has(m.id!)) {
                      <div class="tl-bar"><button class="tl-btn" (click)="dlgTranslateOnDemand(m)"><mat-icon class="tl-icon">translate</mat-icon></button></div>
                    }
                  }
                  <div class="bubble-time">{{ m.createdAt | date:'dd/MM HH:mm' }}</div>
                </div>
              </div>
            }
            @if (!loadingMessages() && messages().length === 0) {
              <p class="msg-empty">{{ 'booking_dialog.no_messages' | translate }}</p>
            }
          </div>

          @if (templates().length > 0) {
            <div class="template-bar">
              <mat-form-field appearance="outline" class="tpl-select" subscriptSizing="dynamic">
                <mat-label><mat-icon class="tpl-icon">auto_fix_high</mat-icon> {{ 'booking_dialog.template_label' | translate }}</mat-label>
                <mat-select [(ngModel)]="selectedTemplate" (ngModelChange)="applyTemplate($event)">
                  <mat-option [value]="null">{{ 'booking_dialog.no_template' | translate }}</mat-option>
                  @for (t of templates(); track t.id) {
                    <mat-option [value]="t">{{ t.name }}@if (t.contentEn) { &nbsp;·&nbsp;EN }</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button class="tpl-lang-btn"
                      (click)="toggleTemplateLang()"
                      [matTooltip]="templateLang() === 'fr' ? ('booking_dialog.switch_to_en' | translate) : ('booking_dialog.switch_to_fr' | translate)">
                {{ templateLang() === 'fr' ? 'FR' : 'EN' }}
              </button>
            </div>
          }

          <div class="chat-input-bar">
            <mat-form-field appearance="outline" class="chat-field">
              <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="2" cdkAutosizeMaxRows="5"
                        [(ngModel)]="newMessage" [placeholder]="'booking_dialog.write_message' | translate"></textarea>
            </mat-form-field>
            <button mat-icon-button [title]="'booking_dialog.copy_clipboard_tooltip' | translate"
                    (click)="copyToClipboard()" [disabled]="!newMessage.trim()">
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            </button>
            @if (isDirect()) {
              <div class="direct-btns">
                <button mat-icon-button class="btn-email" [title]="'booking_dialog.send_email' | translate"
                        (click)="sendDirect('email')" [disabled]="!newMessage.trim() || sendingMsg()">
                  <mat-icon>email</mat-icon>
                </button>
                <button mat-icon-button class="btn-sms" [title]="'booking_dialog.send_sms' | translate"
                        (click)="sendDirect('sms')" [disabled]="!newMessage.trim() || sendingMsg()">
                  <mat-icon>sms</mat-icon>
                </button>
                <button mat-icon-button class="btn-whatsapp" [title]="'booking_dialog.send_whatsapp' | translate"
                        (click)="sendDirect('whatsapp')" [disabled]="!newMessage.trim() || sendingMsg()">
                  <mat-icon>chat</mat-icon>
                </button>
              </div>
            } @else {
              <button mat-icon-button color="primary" [title]="'booking_dialog.send_via_beds24' | translate"
                      (click)="sendMessage()" [disabled]="!newMessage.trim() || sendingMsg()">
                <mat-icon>send</mat-icon>
              </button>
            }
          </div>
        </div>

      </mat-tab>
      } <!-- end @if !isIcalMode messages -->

      <!-- ── Onglet Entretien ────────────────────────────────────── -->
      <mat-tab [label]="'booking_dialog.tab_housekeeping' | translate">
        <mat-dialog-content class="menage-content">

          @if (loadingTask()) {
            <div class="center-spin"><mat-spinner diameter="36"/></div>
          } @else {
            <!-- Liste des tâches existantes -->
            @for (task of existingTasks(); track task.id) {
              <div class="task-card">
                <div class="task-header">
                  <mat-icon class="task-icon">home_repair_service</mat-icon>
                  <span class="task-title">{{ taskTypeLabel(task.type) }}</span>
                  <span class="task-status" [class]="'status-' + task.status.toLowerCase()">
                    {{ taskStatusLabel(task.status) }}
                  </span>
                </div>
                <mat-divider/>
                <div class="task-info-grid">
                  <div class="ti-row">
                    <mat-icon>calendar_today</mat-icon>
                    <span>{{ task.scheduledDate | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div class="ti-row">
                    <mat-icon>person</mat-icon>
                    <span>{{ task.housekeeper?.name || ('booking_dialog.not_assigned' | translate) }}</span>
                    @if (task.housekeeper?.hourlyRate != null) {
                      <span class="ti-badge green">{{ task.housekeeper.hourlyRate | number:'1.2-2' }} €/h</span>
                    }
                  </div>
                  @if (task.extraHours != null) {
                    <div class="ti-row">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ task.extraHours }} {{ 'booking_dialog.planned_h' | translate }}</span>
                      @if (task.hourlyRate != null) {
                        <span class="ti-badge green">= {{ task.extraHours * task.hourlyRate | number:'1.2-2' }} €</span>
                      }
                    </div>
                  }
                  @if (task.notes) {
                    <div class="ti-row">
                      <mat-icon>notes</mat-icon>
                      <span style="white-space:pre-wrap">{{ task.notes }}</span>
                    </div>
                  }
                  @if (task.reportComment || task.hasIncident) {
                    <div class="ti-row report-row">
                      <mat-icon>assignment</mat-icon>
                      <div class="report-inline">
                        @if (task.hasIncident) {
                          <span class="incident-inline"><mat-icon>warning</mat-icon> {{ 'booking_dialog.incident' | translate }}</span>
                        }
                        @if (task.reportComment) {
                          <span>{{ task.reportComment }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
              <mat-divider class="task-sep"/>
            }

            <!-- Formulaire nouvelle tâche -->
            <div class="task-form">
              @if (existingTasks().length === 0) {
                <p class="task-hint">
                  <mat-icon>info</mat-icon>
                  {{ 'booking_dialog.no_task_hint' | translate }}
                </p>
              } @else {
                <div class="new-task-header">
                  <mat-icon>add_task</mat-icon>
                  <span>{{ 'booking_dialog.new_task_title' | translate }}</span>
                </div>
              }
              <div class="row-2">
                <div class="datetime-pair">
                  <mat-form-field appearance="outline" class="date-part">
                    <mat-label>{{ 'common.date' | translate }}</mat-label>
                    <input matInput [matDatepicker]="taskPicker" [(ngModel)]="taskDate">
                    <mat-datepicker-toggle matIconSuffix [for]="taskPicker"></mat-datepicker-toggle>
                    <mat-datepicker #taskPicker></mat-datepicker>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="time-part">
                    <mat-label>{{ 'common.time' | translate }}</mat-label>
                    <input matInput type="time" [(ngModel)]="taskTime">
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'common.type' | translate }}</mat-label>
                  <mat-select [(ngModel)]="taskForm.type">
                    <mat-option value="CHECKOUT_CLEANING">{{ 'booking_dialog.task_type_checkout' | translate }}</mat-option>
                    <mat-option value="CHECKIN_PREP">{{ 'booking_dialog.task_type_checkin' | translate }}</mat-option>
                    <mat-option value="CLEANING">{{ 'booking_dialog.task_type_cleaning' | translate }}</mat-option>
                    <mat-option value="MAINTENANCE">{{ 'booking_dialog.task_type_maintenance' | translate }}</mat-option>
                    <mat-option value="INSPECTION">{{ 'booking_dialog.task_type_inspection' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="code-section">
                <div class="code-row">
                  <mat-icon class="code-icon">vpn_key</mat-icon>
                  <span class="code-label">{{ 'properties.access_code' | translate }}</span>
                  <span class="code-value">{{ propAccessCode() || '—' }}</span>
                  <button mat-icon-button type="button" (click)="regenerateAccessCode()"
                          [matTooltip]="'properties.regenerate_code' | translate"
                          [disabled]="regeneratingCode()">
                    <mat-icon>casino</mat-icon>
                  </button>
                </div>
                @if (propPreviousAccessCode()) {
                  <div class="code-prev">
                    <mat-icon class="code-icon-sm">history</mat-icon>
                    <span class="code-prev-label">{{ 'properties.prev_code' | translate }}</span>
                    <span class="code-prev-value">{{ propPreviousAccessCode() }}</span>
                  </div>
                }
              </div>
              <div class="provider-row">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ 'booking_dialog.task_provider' | translate }}</mat-label>
                  <mat-select [ngModel]="taskForm.housekeeperId" (ngModelChange)="onHousekeeperChange($event)">
                    <mat-option [value]="null">{{ 'booking_dialog.task_unassigned' | translate }}</mat-option>
                    @for (h of housekeepers(); track h.id) {
                      <mat-option [value]="h.id">{{ h.name }}{{ h.phone ? ' · ' + h.phone : '' }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (selectedHousekeeper()?.phone || selectedHousekeeper()?.email) {
                  <button mat-icon-button class="hk-send" type="button" [matMenuTriggerFor]="missionMenu"
                          [matTooltip]="'housekeeping.send_mission' | translate">
                    <mat-icon>send</mat-icon>
                  </button>
                  <mat-menu #missionMenu="matMenu">
                    @if (selectedHousekeeper()?.email) {
                      <button mat-menu-item (click)="sendMission('email')">
                        <mat-icon>email</mat-icon> {{ 'housekeeping.send_email' | translate }}
                      </button>
                    }
                    @if (selectedHousekeeper()?.phone) {
                      <button mat-menu-item (click)="sendMission('whatsapp')">
                        <mat-icon>chat</mat-icon> {{ 'housekeeping.send_whatsapp' | translate }}
                      </button>
                      <button mat-menu-item (click)="sendMission('sms')">
                        <mat-icon>sms</mat-icon> {{ 'housekeeping.send_sms' | translate }}
                      </button>
                    }
                  </mat-menu>
                }
              </div>
              <div class="row-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'booking_dialog.task_hours' | translate }}</mat-label>
                  <input matInput type="number" min="0" step="0.5" [(ngModel)]="taskForm.extraHours"
                         [placeholder]="'booking_dialog.task_hours_placeholder' | translate">
                  <span matTextSuffix>h</span>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'booking_dialog.task_rate' | translate }}</mat-label>
                  <input matInput type="number" min="0" step="0.5" [(ngModel)]="taskForm.hourlyRate"
                         [placeholder]="'booking_dialog.task_rate_placeholder' | translate">
                  <span matTextSuffix>€/h</span>
                </mat-form-field>
              </div>
              @if (taskForm.extraHours && taskForm.hourlyRate) {
                <div class="task-total">
                  <mat-icon>calculate</mat-icon>
                  {{ 'booking_dialog.total_estimated' | translate }} <strong>{{ +taskForm.extraHours * +taskForm.hourlyRate | number:'1.2-2' }} €</strong>
                </div>
              }
              @if (taskLinenItems.length > 0) {
                <div class="task-linen-preset">
                  <div class="task-linen-title" [class.expanded]="linenExpanded()" (click)="linenExpanded.set(!linenExpanded())">
                    <mat-icon>local_laundry_service</mat-icon> {{ 'booking_dialog.linen_used' | translate }}
                    <span class="task-linen-count">({{ taskLinenItems.length }})</span>
                    <mat-icon class="task-linen-toggle">{{ linenExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </div>
                  @if (linenExpanded()) {
                    @for (item of taskLinenItems; track item.linenItemId) {
                      <div class="task-linen-row">
                        <span class="task-linen-label">{{ item.label }}</span>
                        <mat-form-field appearance="outline" class="task-linen-qty">
                          <input matInput type="number" min="0" [ngModel]="item.quantity" (ngModelChange)="updateDialogLinenQty(item.linenItemId, $event)">
                          <span matTextSuffix>pcs</span>
                        </mat-form-field>
                      </div>
                    }
                  }
                </div>
              }
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'common.notes' | translate }}</mat-label>
                <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="5" [(ngModel)]="taskForm.notes"
                          [placeholder]="'booking_dialog.task_notes_placeholder' | translate"></textarea>
              </mat-form-field>
            </div>
          }

        </mat-dialog-content>

      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    .dialog-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px 8px; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
    .guest-name { font-size: 18px; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .booking-id { font-size: 12px; color: #aaa; flex-shrink: 0; }
    .header-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto; }
    .msg-badge { background: #e53935; color: #fff; font-size: 11px; font-weight: 700;
      border-radius: 10px; padding: 1px 6px; margin-left: 6px; }

    mat-dialog-content { min-width: 360px; max-width: 560px; padding-top: 8px; }
    .edit-grid { display: flex; flex-direction: column; gap: 0; }
    .prop-row { display: flex; align-items: center; gap: 8px; padding: 4px 0 8px;
      font-size: 15px; font-weight: 500; color: #333; }
    .prop-row mat-icon { color: #0288d1; font-size: 20px; width: 20px; height: 20px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .datetime-pair { display: flex; gap: 8px; align-items: flex-start; }
    .date-part { flex: 1; }
    .time-part { width: 110px; flex-shrink: 0; }
    .full { width: 100%; }
    .provider-row { display: flex; align-items: center; gap: 4px; }
    .provider-row .full { flex: 1; }
    .hk-send { color: #6a1b9a; flex-shrink: 0; margin-top: -8px; }
    .taxe-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #e3f2fd; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
    .taxe-icon { font-size: 18px; color: #1976d2; }
    .taxe-label { font-weight: 500; color: #1565c0; }
    .taxe-value { font-weight: 700; color: #1565c0; }
    .taxe-hint { color: #78909c; font-size: 12px; }
    mat-divider { margin: 4px 0 12px; }
    .horaires-section { margin: 4px 0 12px; padding: 10px 12px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e8e8e8; }
    .horaires-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
    .h-icon { font-size: 16px; width: 16px; height: 16px; color: #546e7a; }
    .h-title { font-size: 13px; font-weight: 600; color: #333; flex: 1; }
    .arrangement-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
      background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
    .horaires-chips { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .horaire-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      border-radius: 8px; background: #e8f5e9; border: 1px solid #c8e6c9; font-size: 13px; min-width: 160px; }
    .horaire-chip.custom { background: #fff8e1; border-color: #ffe082; }
    .horaire-chip mat-icon { font-size: 16px; width: 16px; height: 16px; color: #388e3c; }
    .horaire-chip.custom mat-icon { color: #f57c00; }
    .h-label { font-weight: 600; color: #333; min-width: 60px; }
    .time-chip-input { border: none; background: transparent; font-size: 14px; font-weight: 600;
      color: #1b5e20; width: 72px; outline: none; cursor: pointer; }
    .horaire-chip.custom .time-chip-input { color: #e65100; }
    .h-default { font-size: 11px; color: #888; margin-left: 4px; }
    .motif-field { margin-top: 4px; }
    .horaires-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .h-standard { font-size: 12px; color: #888; font-style: italic; }

    /* Messages */
    .channel-banner {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 16px; font-size: 12px; font-weight: 600;
      color: #fff; letter-spacing: 0.3px;
    }
    .ch-icon { font-size: 15px; width: 15px; height: 15px; }
    .ch-note { font-weight: 400; opacity: 0.85; }
    .messages-layout { display: flex; flex-direction: column; height: 420px; overflow: hidden; }
    .chat-area { flex: 1; overflow-y: auto; padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px; min-height: 0; }
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
    .tl-bar { display: flex; justify-content: flex-start; }
    .tl-btn { background: none; border: none; font-size: 10px; color: rgba(0,0,0,0.4); cursor: pointer; padding: 0; display: flex; align-items: center; gap: 2px; }
    .tl-btn:hover { color: rgba(0,0,0,0.7); }
    .tl-icon { font-size: 12px !important; width: 12px !important; height: 12px !important; }
    .tl-pending { font-style: italic; opacity: 0.5; font-size: 12px; }
    .template-bar { padding: 6px 16px 0; border-top: 1px solid #e8e8e8; background: #fafafa; display: flex; align-items: flex-start; gap: 8px; }
    .tpl-select { flex: 1; }
    .tpl-lang-btn { font-size: 11px !important; font-weight: 700 !important; min-width: 40px !important; height: 36px !important; padding: 0 8px !important; margin-top: 4px; flex-shrink: 0; }
    .tpl-select { width: 100%; }
    .tpl-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; }
    .chat-input-bar { display: flex; align-items: flex-end; gap: 4px;
      padding: 6px 16px 4px; border-top: 1px solid #e0e0e0; flex-shrink: 0; }
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
    .ti-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #333; flex-wrap: wrap; }
    .ti-row mat-icon { font-size: 18px; width: 18px; height: 18px; color: #888; flex-shrink: 0; }
    .ti-badge { font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 10px; }
    .ti-badge.green { background: #e8f5e9; color: #2e7d32; }
    .task-total { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1565c0;
      background: #e3f2fd; padding: 6px 12px; border-radius: 8px; margin-bottom: 4px; }
    .task-total mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .task-report { display: flex; flex-direction: column; gap: 6px; }
    .report-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: #555; }
    .incident-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
      color: #b71c1c; background: #ffebee; padding: 4px 10px; border-radius: 8px; width: fit-content; }
    .report-text { font-size: 13px; color: #444; margin: 0; white-space: pre-wrap; }
    .task-hint { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666;
      background: #f5f5f5; padding: 8px 12px; border-radius: 8px; margin: 0 0 16px; }
    .task-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0288d1; }
    .task-form { display: flex; flex-direction: column; gap: 0; }
    .task-sep { margin: 8px 0 16px; }
    .new-task-header { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600;
      color: #1976d2; margin: 4px 0 12px; }
    .new-task-header mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .report-row { align-items: flex-start; }
    .report-inline { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #444; }
    .incident-inline { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
      color: #b71c1c; }
    .incident-inline mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .payment-section {
      margin-top: 12px; padding: 12px 14px;
      border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;
    }
    .payment-header { display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 13px; color: #444; margin-bottom: 10px; }
    .pay-icon { font-size: 18px; width: 18px; height: 18px; color: #0288d1; }
    .payment-row { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
    .pay-amount { max-width: 110px; }
    .pay-link-box {
      display: flex; align-items: center; gap: 2px; margin-top: 8px;
      background: #e3f2fd; border-radius: 6px; padding: 2px 4px 2px 10px;
    }
    .pay-link-text {
      font-size: 11px; color: #0277bd; flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: none;
    }
    .pay-link-text:hover { text-decoration: underline; }

    .code-section { margin: 0 0 10px; padding: 8px 12px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e0e0e0; }
    .code-row { display: flex; align-items: center; gap: 8px; }
    .code-icon { font-size: 18px; width: 18px; height: 18px; color: #0288d1; flex-shrink: 0; }
    .code-label { font-size: 12px; color: #666; flex-shrink: 0; }
    .code-value { font-size: 14px; font-weight: 700; color: #111; flex: 1; letter-spacing: 1px; }
    .code-prev { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .code-icon-sm { font-size: 14px; width: 14px; height: 14px; color: #999; flex-shrink: 0; }
    .code-prev-label { font-size: 11px; color: #999; flex-shrink: 0; }
    .code-prev-value { font-size: 12px; color: #888; text-decoration: line-through; }
    .task-linen-preset { margin: 0 0 8px; padding: 10px 12px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e0e0e0; }
    .task-linen-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #1976d2; cursor: pointer; user-select: none; }
    .task-linen-title.expanded { margin-bottom: 8px; }
    .task-linen-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .task-linen-count { color: #888; font-weight: 400; }
    .task-linen-toggle { margin-left: auto; }
    .task-linen-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .task-linen-label { flex: 1; font-size: 13px; color: #333; }
    .task-linen-qty { width: 110px; flex-shrink: 0; }

    @media (max-width: 600px) {
      mat-dialog-content { min-width: unset; }
      .menage-content { min-width: unset; }
      .row-2, .row-3 { grid-template-columns: 1fr; }
      .messages-layout { height: auto; overflow: visible; }
      .chat-area { flex: none; overflow-y: visible; min-height: 200px; }
      .chat-field textarea { min-height: 60px !important; }
    }
  `]
})
export class BookingDetailDialogComponent implements OnInit, OnDestroy {
  @ViewChild('chatArea') chatArea?: ElementRef<HTMLDivElement>;

  saving         = signal(false);
  activeTab      = signal(0);
  cleaningFee    = signal<number>(0);
  propAccessCode         = signal('');
  propPreviousAccessCode = signal('');
  regeneratingCode       = signal(false);
  draft: Record<string, any>;

  messages = signal<Message[]>([]);
  loadingMessages = signal(false);
  unreadCount = signal(0);
  newMessage   = '';
  templateLang = signal<'fr' | 'en'>('fr');
  sendingMsg   = signal(false);
  copied       = signal(false);
  arrivalDate: Date | null = null;
  departureDate: Date | null = null;
  arrivalTime   = '16:00';
  departureTime = '11:00';
  customTimeComment = '';
  savingTimes = signal(false);

  readonly DEFAULT_CHECKIN  = '16:00';
  readonly DEFAULT_CHECKOUT = '11:00';

  get hasCustomCheckin():  boolean { return this.arrivalTime   !== this.DEFAULT_CHECKIN;  }
  get hasCustomCheckout(): boolean { return this.departureTime !== this.DEFAULT_CHECKOUT; }
  get hasCustomTimes():    boolean { return this.hasCustomCheckin || this.hasCustomCheckout; }

  private allTemplates = signal<MessageTemplate[]>([]);
  templates = computed(() => {
    const pid     = String(this.draft?.['propId'] ?? this.draft?.['propertyId'] ?? '');
    const context = this.data?.['templateContext'] as 'checkin' | 'checkout' | undefined;
    const lang    = this.templateLang();
    return this.allTemplates().filter(t => {
      if (t.beds24PropertyId && t.beds24PropertyId !== pid) return false;
      if (context === 'checkin'  && t.type === 'CHECKOUT') return false;
      if (context === 'checkout' && t.type === 'CHECKIN')  return false;
      if (lang === 'en' && !t.contentEn) return false;
      return true;
    });
  });
  selectedTemplate: MessageTemplate | null = null;

  loadingTask   = signal(false);
  savingTask    = signal(false);
  existingTasks = signal<any[]>([]);
  housekeepers = signal<HousekeeperProfile[]>([]);
  taskForm: { type: string; housekeeperId: number | null; notes: string; extraHours: string; hourlyRate: string } = {
    type: 'CHECKOUT_CLEANING',
    housekeeperId: null,
    notes: '',
    extraHours: '',
    hourlyRate: ''
  };
  taskLinenItems: {linenItemId: number; label: string; category: string; quantity: number}[] = [];
  linenExpanded = signal(false);
  taskDate: Date | null = null;
  taskTime = '09:00';

  dlgTranslations = signal<Map<number, string>>(new Map());
  dlgTranslating  = signal<Set<number>>(new Set());
  dlgShowOriginal = signal<Set<number>>(new Set());

  payAmount     = '';
  payLink       = signal('');
  payLinkCopied = signal(false);

  private wsSub?: Subscription;
  private readonly apiBase = environment.apiUrl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BookingDetailDialogComponent>,
    private auth: AuthService,
    private bookingService: BookingService,
    private messageService: MessageService,
    private templateService: MessageTemplateService,
    private housekeeperService: HousekeeperService,
    private housekeepingService: HousekeepingService,
    private timeOverrideService: BookingTimeOverrideService,
    private propConfigService: PropertyConfigService,
    private reminderService: MessageReminderService,
    private translationService: TranslationService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private t: TranslateService
  ) {
    const d: Record<string, any> = { ...data };
    d['guestFirstName'] = d['guestFirstName'] || d['firstName'] || '';
    d['guestLastName']  = d['guestLastName']  || d['lastName']  || '';
    d['guestEmail']     = d['guestEmail']     || d['email']     || '';
    d['guestPhone']     = d['guestPhone']     || d['phone']     || d['guestMobile'] || '';
    d['guestCountry']   = d['guestCountry']   || d['country'] || '';
    d['lang']           = d['lang']           || '';
    const bl = (d['lang'] || '').toLowerCase();
    this.templateLang.set(!bl || bl === 'fr' ? 'fr' : 'en');
    d['propId']         = d['propId']         || d['propertyId'] || '';
    d['propName']       = d['propName']       || d['propertyName'] || '';
    d['totalPrice']     = d['totalPrice']     ?? d['price']     ?? null;
    d['notes']          = d['notes']          || d['internalNotes'] || '';
    const rawArr = (d['arrival']   || '').toString();
    const rawDep = (d['departure'] || '').toString();
    d['arrival']   = rawArr.substring(0, 10);
    d['departure'] = rawDep.substring(0, 10);
    if (rawArr.includes('T')) this.arrivalTime   = rawArr.substring(11, 16) || '16:00';
    if (rawDep.includes('T')) this.departureTime = rawDep.substring(11, 16) || '11:00';
    if (!d['guestFirstName'] && !d['guestLastName'] && d['guestName']) {
      const parts = (d['guestName'] as string).split(' ');
      d['guestFirstName'] = parts[0] || '';
      d['guestLastName']  = parts.slice(1).join(' ') || '';
    }
    // Nettoyage legacy : supprimer les anciens encodages 🕐 dans les notes
    const notes: string = d['notes'] || '';
    const motifMatch = notes.match(/^🕐 (.+?)(?:\n|$)/m);
    if (motifMatch) d['notes'] = notes.replace(/^🕐 .+?\n?/m, '').trim();
    this.draft = d;
    this.arrivalDate   = this.toDate(d['arrival']);
    this.departureDate = this.toDate(d['departure']);
    const dep = (d['departure'] || '').toString().substring(0, 10);
    this.taskDate = dep ? new Date(dep + 'T12:00:00') : null;
    this.taskTime = this.departureTime;
  }

  isIcalMode(): boolean { return this.auth.isIcal(); }

  isHousekeepingTab(): boolean {
    return this.isIcalMode() ? this.activeTab() === 0 : this.activeTab() === 2;
  }

  ngOnInit(): void {
    const bookingId = Number(this.data['id']);
    if (!bookingId) return;
    // Charger le cleaningFee depuis PropertyConfig pour le calcul de la taxe de séjour
    const propId = String(this.draft['propId'] || this.draft['propertyId'] || '');
    if (propId) {
      this.propConfigService.getAll().subscribe({
        next: cfgs => {
          const cfg = cfgs.find(c => String(c.beds24PropertyId) === propId);
          if (cfg?.cleaningFee) this.cleaningFee.set(Number(cfg.cleaningFee));
          this.propAccessCode.set(cfg?.accessCode ?? '');
          this.propPreviousAccessCode.set(cfg?.previousAccessCode ?? '');
        }
      });
    }
    // Charger l'override d'horaires depuis la base locale
    this.timeOverrideService.get(String(this.data['id'])).subscribe({
      next: ov => {
        if (!ov) return;
        if (ov.checkinTime)  this.arrivalTime   = ov.checkinTime;
        if (ov.checkoutTime) this.departureTime = ov.checkoutTime;
        if (ov.note)         this.customTimeComment = ov.note;
        this.taskTime = this.departureTime;
      }
    });
    if (this.isIcalMode()) {
      this.loadHousekeepingTask();
      this.loadHousekeepers();
      this.loadPropertyCleaningHours();
      if (this.taskLinenItems.length === 0) this.loadTaskLinenDefaults();
    }
    const bookingLang = (this.data['lang'] || '').toLowerCase();
    this.wsSub = this.messageService.watchMessages(bookingId).subscribe(msg => {
      this.messages.update(list => [...list, msg]);
      if (msg.sender === 'GUEST') {
        this.unreadCount.update(n => n + 1);
        if (bookingLang && bookingLang !== 'fr') {
          this.dlgDoTranslate(msg as any, bookingLang).subscribe();
        }
      }
      setTimeout(() => this.scrollToBottom(), 80);
    });
  }

  get beds24Id(): string | null {
    const id = String(this.data['id'] || '');
    return id && id !== '0' ? id : null;
  }

  get taxeSejour(): number {
    const price = Number(this.draft['totalPrice'] ?? 0);
    const fee   = this.cleaningFee();
    const base  = Math.max(0, price - fee);
    return Math.round(base * 0.0275 * 100) / 100;
  }

  generatePayLink(type: 'payment' | 'deposit'): void {
    const id = this.beds24Id;
    if (!id || !this.payAmount) return;
    const token = btoa(`${id}:${this.payAmount}`);
    const path  = type === 'payment' ? 'paiement' : 'caution';
    this.payLink.set(`${window.location.origin}/${path}/${token}`);
    this.payLinkCopied.set(false);
  }

  copyPayLink(): void {
    navigator.clipboard.writeText(this.payLink()).then(() => {
      this.payLinkCopied.set(true);
      setTimeout(() => this.payLinkCopied.set(false), 2000);
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
    if (!this.isIcalMode()) {
      if (index === 1) {
        if (this.messages().length === 0) this.loadMessages();
        if (this.allTemplates().length === 0) this.loadTemplates();
      }
      if (index === 2) {
        this.loadHousekeepingTask();
        if (this.housekeepers().length === 0) this.loadHousekeepers();
        this.loadPropertyCleaningHours();
        if (this.taskLinenItems.length === 0) this.loadTaskLinenDefaults();
      }
    }
  }

  regenerateAccessCode(): void {
    const pid = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    if (!pid) return;
    this.regeneratingCode.set(true);
    this.propConfigService.regenerate(pid).subscribe({
      next: cfg => {
        this.propAccessCode.set(cfg.accessCode ?? '');
        this.propPreviousAccessCode.set(cfg.previousAccessCode ?? '');
        this.regeneratingCode.set(false);
        this.snackBar.open(this.t.instant('properties.config_saved'), '', { duration: 2000 });
      },
      error: () => this.regeneratingCode.set(false)
    });
  }

  private loadTemplates(): void {
    this.templateService.getAll().subscribe({
      next: tpls => this.allTemplates.set(tpls),
      error: () => {}
    });
  }

  applyTemplate(t: MessageTemplate | null): void {
    if (!t) return;
    const content = this.templateLang() === 'en' && t.contentEn ? t.contentEn : t.contentFr;
    if (!content) return;
    this.newMessage = this.templateService.apply(content, this.draft, this.propAccessCode() || undefined, this.arrivalTime, this.departureTime, this.propPreviousAccessCode() || undefined);
    this.selectedTemplate = null;
  }


  private loadMessages(): void {
    const bookingId = Number(this.data['id']);
    if (!bookingId) return;
    this.loadingMessages.set(true);
    const bookingLang = (this.data['lang'] || '').toLowerCase();
    this.messageService.getMessages(bookingId).subscribe({
      next: msgs => {
        const sorted = (msgs ?? []).slice().sort((a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        this.messages.set(sorted);
        this.unreadCount.set(0);
        this.loadingMessages.set(false);
        if (bookingLang && bookingLang !== 'fr') {
          const guests = sorted.filter(m => m.sender === 'GUEST');
          if (guests.length) {
            from(guests as any[]).pipe(concatMap(m => this.dlgDoTranslate(m, bookingLang))).subscribe();
          }
        }
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => this.loadingMessages.set(false)
    });
  }

  dlgDoTranslate(m: any, lang: string): Observable<string | null> {
    const id   = m['id'] as number;
    const text = (m['content'] || '').trim();
    if (!text) return of<string | null>(null);
    this.dlgTranslating.update(s => new Set([...s, id]));
    return this.translationService.translate(text, lang).pipe(
      tap(translated => {
        if (translated && translated !== text) {
          this.dlgTranslations.update(map => { const n = new Map(map); n.set(id, translated); return n; });
        }
        this.dlgTranslating.update(s => { const n = new Set(s); n.delete(id); return n; });
      })
    );
  }

  dlgTranslateOnDemand(m: any): void {
    const lang = (this.data['lang'] || '').toLowerCase() || 'autodetect';
    this.dlgDoTranslate(m, lang).subscribe();
  }

  toggleDlgOriginal(id: number): void {
    this.dlgShowOriginal.update(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
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
    this.reminderService.markSent(this.data['id']);

    const bookingId = Number(this.data['id']);
    if (bookingId) {
      const localMsg = { id: Date.now(), bookingId, sender: 'HOST' as const, content, createdAt: new Date().toISOString() };
      this.messageService.sendMessage(bookingId, content).subscribe({
        next: () => {
          this.messages.update(list => [...list, localMsg]);
          this.newMessage = '';
          this.selectedTemplate = null;
          this.reminderService.markSent(bookingId);
          setTimeout(() => this.scrollToBottom(), 80);
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
    const localMsg = { id: Date.now(), bookingId, sender: 'HOST' as const, content, createdAt: new Date().toISOString() };
    this.messageService.sendMessage(bookingId, content).subscribe({
      next: () => {
        this.messages.update(list => [...list, localMsg]);
        this.newMessage = '';
        this.sendingMsg.set(false);
        this.reminderService.markSent(bookingId);
        setTimeout(() => this.scrollToBottom(), 80);
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
    return (first + ' ' + last).trim() || this.data['guestName'] || this.t.instant('booking_dialog.guest_default');
  }

  save(): void {
    this.saving.set(true);
    const payload = { ...this.draft };
    if (payload['arrival'])   payload['arrival']   = payload['arrival'].substring(0, 10)   + 'T' + this.DEFAULT_CHECKIN;
    if (payload['departure']) payload['departure'] = payload['departure'].substring(0, 10) + 'T' + this.DEFAULT_CHECKOUT;
    this.bookingService.save([payload]).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('booking_dialog.booking_updated'), 'OK', { duration: 3000 });
        this.dialogRef.close({ updated: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? this.t.instant('booking_dialog.booking_update_error'), this.t.instant('common.close'), { duration: 4000 });
        this.saving.set(false);
      }
    });
  }

  cancelBooking(): void {
    if (!confirm(this.t.instant('booking_dialog.cancel_booking_confirm', { name: this.guestName() }))) return;
    this.saving.set(true);
    this.bookingService.cancel(String(this.draft['id'])).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('booking_dialog.booking_cancelled'), 'OK', { duration: 3000 });
        this.dialogRef.close({ cancelled: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 4000 });
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
    this.housekeepingService.getByBooking(bookingId, propertyId || undefined, departure || undefined).subscribe({
      next: tasks => { this.existingTasks.set(tasks ?? []); this.loadingTask.set(false); },
      error: ()   => { this.existingTasks.set([]);          this.loadingTask.set(false); }
    });
  }

  private loadHousekeepers(): void {
    this.housekeeperService.getAll().subscribe({
      next: list => this.housekeepers.set(list),
      error: () => {}
    });
  }

  private loadPropertyCleaningHours(): void {
    if (this.taskForm.extraHours) return;
    const pid = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    if (!pid) return;
    this.housekeepingService.getPropertyConfigs().subscribe({
      next: cfgs => {
        const cfg = cfgs.find((c: any) => c.beds24PropertyId === pid);
        if (cfg?.cleaningHours != null) this.taskForm.extraHours = String(cfg.cleaningHours);
      },
      error: () => {}
    });
  }

  onHousekeeperChange(id: number | null): void {
    this.taskForm.housekeeperId = id;
    const hk = this.housekeepers().find(h => h.id === id);
    this.taskForm.hourlyRate = hk?.hourlyRate != null ? String(hk.hourlyRate) : '';
    if (id && hk && this.taskForm.type === 'CHECKOUT_CLEANING') {
      this.generateCleaningNotes(hk);
    }
  }

  selectedHousekeeper(): HousekeeperProfile | undefined {
    return this.housekeepers().find(h => h.id === this.taskForm.housekeeperId);
  }

  sendMission(channel: 'email' | 'whatsapp' | 'sms'): void {
    const hk = this.selectedHousekeeper();
    if (!hk) return;
    const property = this.draft['propName'] || this.draft['propertyName'] || '';
    const text = this.taskForm.notes ?? '';

    let url = '';
    switch (channel) {
      case 'email': {
        if (!hk.email) return;
        const subject = encodeURIComponent(this.t.instant('housekeeping.mission_email_subject', { property }));
        url = `mailto:${hk.email}?subject=${subject}&body=${encodeURIComponent(text)}`;
        break;
      }
      case 'whatsapp': {
        if (!hk.phone) return;
        url = `https://wa.me/${hk.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
        break;
      }
      case 'sms': {
        if (!hk.phone) return;
        const phone = hk.phone.replace(/[^0-9+]/g, '');
        url = `sms:${phone}${/iPhone|iPad|Macintosh/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(text)}`;
        break;
      }
    }

    if (url) window.open(url, '_blank');
  }

  private generateCleaningNotes(hk: HousekeeperProfile): void {
    const departure = (this.draft['departure'] || '').toString().substring(0, 10);
    const pid       = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    const propName  = this.draft['propName'] || this.draft['propertyName'] || '';

    const buildNotes = (nextCheckinTime?: string) => {
      const code     = this.propAccessCode() ?? '';
      const prevCode = this.propPreviousAccessCode() ?? '';
      const hours    = this.taskForm.extraHours ? ` — ${this.taskForm.extraHours}h` : '';
      let msg = `Bonjour ${hk.name},\n\nMénage ${propName} à partir du ${this.toFrDate(departure)} à ${this.departureTime}${hours}\n\nCode : ${prevCode}\nNouveau : ${code}`;
      if (nextCheckinTime) {
        msg += `\n\nUn client arrive cet après-midi à ${nextCheckinTime}`;
      }
      this.taskForm.notes = msg;
    };

    const checkNextArrival = () => {
      if (!departure || !pid) { buildNotes(); return; }
      this.bookingService.getArrivals(departure).subscribe({
        next: arrivals => {
          const next = (arrivals ?? []).find(b => {
            const bpid    = String(b['propId'] ?? b['propertyId'] ?? '');
            const arrDate = (b['arrival'] || '').toString().substring(0, 10);
            return bpid === pid && arrDate === departure;
          });
          if (!next) { buildNotes(); return; }
          const arrStr = (next['arrival'] || '').toString();
          const t = arrStr.includes('T') ? arrStr.substring(11, 16) : '';
          const rawTime = (t && t !== '00:00') ? t : '16:00';
          const nextId = String(next['id'] ?? '');
          if (!nextId) { buildNotes(rawTime); return; }
          this.timeOverrideService.get(nextId).subscribe({
            next: ov => buildNotes(ov?.checkinTime || rawTime),
            error: () => buildNotes(rawTime)
          });
        },
        error: () => buildNotes()
      });
    };

    checkNextArrival();
  }

  private toFrDate(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  createTask(): void {
    if (this.savingTask()) return;
    const pid = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    if (!pid || !this.taskDate) {
      this.snackBar.open(this.t.instant('booking_dialog.missing_prop_date'), this.t.instant('common.close'), { duration: 3000 });
      return;
    }
    this.savingTask.set(true);
    const dateStr = this.fromDate(this.taskDate);
    const body: Record<string, any> = {
      beds24PropertyId: pid,
      propertyName:     this.draft['propName'] || this.draft['propertyName'] || '',
      beds24BookingId:  String(this.data['id'] ?? ''),
      scheduledDate:    `${dateStr}T${this.taskTime}:00`,
      type:             this.taskForm.type,
      notes:            this.taskForm.notes || '',
    };
    if (this.taskForm.housekeeperId) body['housekeeperId'] = this.taskForm.housekeeperId;
    if (this.taskForm.extraHours)   body['extraHours']   = this.taskForm.extraHours;
    if (this.taskForm.hourlyRate)   body['hourlyRate']   = this.taskForm.hourlyRate;
    const usages = this.taskLinenItems.filter(i => i.quantity > 0);
    if (usages.length > 0) body['linenUsages'] = usages.map(i => ({ linenItemId: i.linenItemId, quantity: i.quantity }));
    this.housekeepingService.createTask(body).subscribe({
      next: task => {
        this.existingTasks.update(list => [...list, task]);
        this.resetTaskForm();
        this.savingTask.set(false);
        this.snackBar.open(this.t.instant('booking_dialog.task_created'), 'OK', { duration: 2500 });
      },
      error: () => {
        this.savingTask.set(false);
        this.snackBar.open(this.t.instant('booking_dialog.task_create_error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  taskStatusLabel(status: string): string {
    const keys: Record<string, string> = {
      PENDING:     'booking_dialog.status_pending',
      IN_PROGRESS: 'booking_dialog.status_in_progress',
      DONE:        'booking_dialog.status_done',
      SKIPPED:     'booking_dialog.status_skipped',
    };
    return keys[status] ? this.t.instant(keys[status]) : status;
  }

  taskTypeLabel(type: string): string {
    const keys: Record<string, string> = {
      CHECKOUT_CLEANING: 'booking_dialog.task_type_checkout',
      CHECKIN_PREP:      'booking_dialog.task_type_checkin',
      CLEANING:          'booking_dialog.task_type_cleaning',
      MAINTENANCE:       'booking_dialog.task_type_maintenance',
      INSPECTION:        'booking_dialog.task_type_inspection',
    };
    return keys[type] ? this.t.instant(keys[type]) : type;
  }

  private resetTaskForm(): void {
    this.taskForm = { type: 'CHECKOUT_CLEANING', housekeeperId: null, notes: '', extraHours: '', hourlyRate: '' };
    this.taskDate = this.departureDate;
    this.taskTime = this.departureTime;
    this.loadTaskLinenDefaults();
  }

  private loadTaskLinenDefaults(): void {
    const pid = String(this.draft['propId'] ?? this.draft['propertyId'] ?? '');
    if (!pid) return;
    this.http.get<any[]>(`${this.apiBase}/admin/linen/items`, { params: { beds24PropertyId: pid } }).subscribe({
      next: items => {
        this.taskLinenItems = items
          .filter(i => i.defaultPerCleaning > 0)
          .map(i => ({ linenItemId: i.id, label: i.label, category: i.category, quantity: i.defaultPerCleaning }));
      },
      error: () => { this.taskLinenItems = []; }
    });
  }

  updateDialogLinenQty(linenItemId: number, qty: number): void {
    this.taskLinenItems = this.taskLinenItems.map(i =>
      i.linenItemId === linenItemId ? { ...i, quantity: Math.max(0, qty || 0) } : i
    );
  }

  toggleTemplateLang(): void { this.templateLang.set(this.templateLang() === 'fr' ? 'en' : 'fr'); }

  onLangChange(lang: string): void {
    const bl = (lang || '').toLowerCase();
    this.templateLang.set(!bl || bl === 'fr' ? 'fr' : 'en');
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.newMessage.trim()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  confirmTimes(): void {
    const bookingId = String(this.data['id'] ?? '');
    if (!bookingId) return;
    this.savingTimes.set(true);
    this.timeOverrideService.upsert(bookingId, {
      checkinTime:  this.arrivalTime,
      checkoutTime: this.departureTime,
      note:         this.customTimeComment.trim() || null
    }).subscribe({
      next: () => {
        this.savingTimes.set(false);
        this.snackBar.open(this.t.instant('booking_dialog.times_saved'), 'OK', { duration: 2000 });
      },
      error: () => {
        this.savingTimes.set(false);
        this.snackBar.open(this.t.instant('booking_dialog.times_save_error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  resetTimes(): void {
    const bookingId = String(this.data['id'] ?? '');
    this.arrivalTime        = this.DEFAULT_CHECKIN;
    this.departureTime      = this.DEFAULT_CHECKOUT;
    this.customTimeComment  = '';
    this.taskTime           = this.DEFAULT_CHECKOUT;
    if (!bookingId) return;
    this.timeOverrideService.delete(bookingId).subscribe({
      next: () => this.snackBar.open(this.t.instant('booking_dialog.times_reset'), '', { duration: 2000 }),
      error: () => {}
    });
  }

  private get channel(): string {
    return (this.draft['channel'] || this.draft['source'] || 'direct').toString().toLowerCase();
  }

  isDirect(): boolean { return this.channel === 'direct' || this.channel === ''; }

  channelLabel(): string {
    const keys: Record<string, string> = {
      direct:  'booking_dialog.channel_direct',
      airbnb:  'booking_dialog.channel_airbnb',
      booking: 'booking_dialog.channel_booking',
      abritel: 'booking_dialog.channel_abritel',
      beds24:  'booking_dialog.channel_beds24',
    };
    return keys[this.channel] ? this.t.instant(keys[this.channel]) : this.channel;
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

  goCreateInvoice(): void {
    const booking = { ...this.draft };
    this.dialogRef.close();
    this.router.navigate(['/admin/invoices/new'], { state: { booking } });
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
