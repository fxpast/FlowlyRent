import { Component, OnInit, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';
import { localDateStr } from '../../core/utils/date.utils';
import { HousekeeperService, HousekeeperProfile } from '../../core/services/housekeeper.service';
import { BookingService } from '../../core/services/booking.service';
import { LinenComponent } from '../linen/linen.component';

interface Task {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  propertyName?: string;
  beds24PropertyId?: string;
  notes?: string;
  completedAt?: string;
  hasIncident?: boolean;
  reportComment?: string;
  incidentDescription?: string;
  reportedAt?: string;
  extraHours?: number;
  hourlyRate?: number;
  housekeeper?: { id: number; name: string; phone?: string; email?: string; hourlyRate?: number | null };
  property?: { id: number; name: string; city?: string };
  booking?: { id: number; firstName?: string; lastName?: string };
}

interface HkChargesEntry {
  hk: { id: number; name: string; phone?: string; hourlyRate?: number | null };
  tasks: Task[];
  totalHours: number;
  totalCost: number;
}

interface TaskPhoto {
  id: number;
  photoType: string;
  url?: string;   // Cloudinary (nouveaux uploads)
  data?: string;  // base64 legacy
  caption?: string;
  uploadedAt: string;
}

interface ReportPanel {
  taskId: number;
  taskLabel: string;
  propertyName: string;
  beds24PropertyId?: string;
  scheduledDate: string;
  reportComment?: string;
  hasIncident?: boolean;
  incidentDescription?: string;
  housekeeperPhone?: string;
  photos: TaskPhoto[];
  loading: boolean;
}

interface InterventionDraft {
  show: boolean;
  housekeeperId: number | null;
  date: Date | null;
  notes: string;
  saving: boolean;
}

interface Property { id: number; name: string; city?: string; }

const TYPE_KEYS: Record<string, string> = {
  CHECKOUT_CLEANING: 'housekeeping.type_checkout_cleaning',
  CHECKIN_PREP:      'housekeeping.type_checkin_prep',
  CLEANING:          'housekeeping.type_cleaning',
  MAINTENANCE:       'housekeeping.type_maintenance',
  INSPECTION:        'housekeeping.type_inspection'
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     '#f57c00',
  IN_PROGRESS: '#1976d2',
  DONE:        '#2e7d32',
  SKIPPED:     '#757575'
};

const STATUS_KEYS: Record<string, string> = {
  PENDING:     'housekeeping.status_pending',
  IN_PROGRESS: 'housekeeping.status_in_progress',
  DONE:        'housekeeping.status_done',
  SKIPPED:     'housekeeping.status_skipped'
};

@Component({
  selector: 'app-housekeeping',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatDialogModule,
    MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatTabsModule, MatDividerModule, MatButtonToggleModule, MatTooltipModule, MatCheckboxModule,
    LinenComponent, TranslateModule
  ],
  template: `
    <mat-tab-group animationDuration="150ms">

      <!-- ══════════════ ONGLET TÂCHES ══════════════ -->
      <mat-tab [label]="'housekeeping.tasks_tab' | translate">
        <div class="tab-content">

          <div class="header-row">
            <mat-button-toggle-group [value]="taskCategory()" (change)="setTaskCategory($event.value)" hideSingleSelectionIndicator>
              <mat-button-toggle value="menage">
                <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px">cleaning_services</mat-icon>
                {{ 'housekeeping.cleanings' | translate }}
              </mat-button-toggle>
              <mat-button-toggle value="depannage">
                <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px">build</mat-icon>
                {{ 'housekeeping.repairs' | translate }}
                @if (unassignedDepannageCount()) {
                  <span class="depannage-alert">{{ unassignedDepannageCount() }}</span>
                }
              </mat-button-toggle>
            </mat-button-toggle-group>
            <div class="header-actions">
              <button mat-stroked-button color="warn" (click)="openIncidentForm()">
                <mat-icon>warning</mat-icon> {{ 'housekeeping.report_incident' | translate }}
              </button>
              <button mat-flat-button color="primary" (click)="openNewTaskForm()">
                <mat-icon>add</mat-icon> {{ 'housekeeping.new_task' | translate }}
              </button>
            </div>
          </div>

          <!-- Formulaire création -->
          @if (showForm) {
            <mat-card class="create-form">
              <mat-card-header><mat-card-title>{{ editingTask ? ('housekeeping.edit_task_title' | translate) : ('housekeeping.create_task_title' | translate) }}</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field>
                    <mat-label>{{ 'common.property' | translate }}</mat-label>
                    <mat-select [ngModel]="newTask.propertyId" (ngModelChange)="onNewPropertyChange($event)">
                      @for (p of properties(); track p.id) {
                        <mat-option [value]="p.id">{{ p.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'common.type' | translate }}</mat-label>
                    <mat-select [ngModel]="newTask.type" (ngModelChange)="onNewTypeChange($event)">
                      @for (t of filteredTaskTypes(); track t.value) {
                        <mat-option [value]="t.value">{{ t.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <div class="hk-datetime-pair">
                    <mat-form-field>
                      <mat-label>{{ 'common.date' | translate }}</mat-label>
                      <input matInput [matDatepicker]="schedPicker" [(ngModel)]="newTaskDate"
                             (ngModelChange)="newTask.scheduledDate = fromDate($event)">
                      <mat-datepicker-toggle matIconSuffix [for]="schedPicker"></mat-datepicker-toggle>
                      <mat-datepicker #schedPicker></mat-datepicker>
                    </mat-form-field>
                    <mat-form-field class="hk-time-field">
                      <mat-label>{{ 'common.time' | translate }}</mat-label>
                      <input matInput type="time" [(ngModel)]="newTaskTime">
                    </mat-form-field>
                  </div>
                </div>
                <div class="form-row">
                  <mat-form-field class="flex2">
                    <mat-label>{{ 'housekeeping.provider' | translate }}</mat-label>
                    <mat-select [ngModel]="newTask.housekeeperId" (ngModelChange)="onNewHousekeeperChange($event)">
                      <mat-option [value]="null">{{ 'housekeeping.unassigned_option' | translate }}</mat-option>
                      @for (h of housekeepers(); track h.id) {
                        <mat-option [value]="h.id">{{ h.name }}{{ h.phone ? ' · ' + h.phone : '' }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'housekeeping.intervention_hours' | translate }}</mat-label>
                    <input matInput type="number" min="0" step="0.5" [(ngModel)]="newTask.extraHours" placeholder="Ex : 3">
                    <span matTextSuffix>{{ 'housekeeping.hours_unit' | translate }}</span>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'housekeeping.hourly_rate' | translate }}</mat-label>
                    <input matInput type="number" min="0" step="0.5" [(ngModel)]="newTask.hourlyRate" placeholder="Ex : 15">
                    <span matTextSuffix>{{ 'housekeeping.rate_unit' | translate }}</span>
                  </mat-form-field>
                </div>
                @if (newTask.extraHours && newTask.hourlyRate) {
                  <div class="task-total">
                    <mat-icon>calculate</mat-icon>
                    {{ 'housekeeping.estimated_total' | translate }} <strong>{{ +newTask.extraHours * +newTask.hourlyRate | number:'1.2-2' }} €</strong>
                  </div>
                }
                @if (taskLinenItems().length > 0) {
                  <div class="task-linen-preset">
                    <div class="task-linen-title">
                      <mat-icon>local_laundry_service</mat-icon> {{ 'housekeeping.linen_used' | translate }}
                    </div>
                    @for (item of taskLinenItems(); track item.linenItemId) {
                      <div class="task-linen-row">
                        <span class="task-linen-label">{{ item.label }}</span>
                        <mat-form-field class="task-linen-qty">
                          <input matInput type="number" min="0" [ngModel]="item.quantity" (ngModelChange)="updateLinenQty(item.linenItemId, $event)">
                          <span matTextSuffix>pcs</span>
                        </mat-form-field>
                      </div>
                    }
                  </div>
                }
                <mat-form-field style="width:100%">
                  <mat-label>{{ 'common.notes' | translate }}</mat-label>
                  <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="5" [(ngModel)]="newTask.notes" [placeholder]="'housekeeping.notes_placeholder' | translate"></textarea>
                </mat-form-field>
                @if (newTask.type === 'MAINTENANCE') {
                  <mat-checkbox [(ngModel)]="newTask.hasIncident" class="incident-checkbox">
                    {{ 'housekeeping.report_incident' | translate }}
                  </mat-checkbox>
                  @if (newTask.hasIncident) {
                    <mat-form-field style="width:100%">
                      <mat-label>{{ 'housekeeping.incident_desc' | translate }}</mat-label>
                      <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="3" [(ngModel)]="newTask.incidentDescription"></textarea>
                    </mat-form-field>
                  }
                }
              </mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" (click)="createTask()" [disabled]="!newTask.propertyId || !newTaskDate">
                  {{ editingTask ? ('common.edit' | translate) : ('common.create' | translate) }}
                </button>
                <button mat-button (click)="cancelTaskForm()">{{ 'common.cancel' | translate }}</button>
              </mat-card-actions>
            </mat-card>
    }

          <!-- Filtres -->
          <div class="filters">
      <mat-button-toggle-group [(ngModel)]="houseDateMode" (change)="onHouseDateModeChange()">
        <mat-button-toggle value="all">{{ 'expenses.filter_all_dates' | translate }}</mat-button-toggle>
        <mat-button-toggle value="range">{{ 'expenses.filter_period' | translate }}</mat-button-toggle>
      </mat-button-toggle-group>

      @if (houseDateMode === 'range') {
        <mat-form-field>
          <mat-label>{{ 'common.from' | translate }}</mat-label>
          <input matInput [matDatepicker]="fromPicker" [(ngModel)]="filterFromDate" (ngModelChange)="filterFrom = fromDate($event); load()">
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ 'common.to' | translate }}</mat-label>
          <input matInput [matDatepicker]="toPicker" [(ngModel)]="filterToDate" (ngModelChange)="filterTo = fromDate($event); load()">
          <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>
      }

      <mat-form-field>
        <mat-label>{{ 'common.status' | translate }}</mat-label>
        <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
          <mat-option value="">{{ 'common.all' | translate }}</mat-option>
          @for (s of statuses; track s.value) {
            <mat-option [value]="s.value">{{ s.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

          <!-- Liste des tâches -->
          @if (loading()) {
            <div class="center"><mat-spinner diameter="40" /></div>
          } @else if (displayedTasks().length === 0) {
            <p class="empty">{{ 'housekeeping.no_tasks' | translate }}</p>
          } @else {
            <div class="tasks-grid">
              @for (task of displayedTasks(); track task.id) {
                <mat-card class="task-card" [class.done]="task.status === 'DONE'" [class.in-progress]="task.status === 'IN_PROGRESS'">
                  <div class="task-header">
                    <div class="task-date">{{ task.scheduledDate | date:'EEE dd/MM · HH:mm' : '' : 'fr-FR' }}</div>
                    <span class="status-chip" [style.background]="statusColor(task.status)">
                      {{ statusLabel(task.status) }}
                    </span>
                  </div>
                  <div class="task-type">{{ typeLabel(task.type) }}</div>
                  <div class="task-property">
                    <mat-icon>home</mat-icon> {{ task.propertyName ?? task.property?.name ?? task.beds24PropertyId }}
                  </div>
                  @if (task.booking) {
                    <div class="task-guest">
                      <mat-icon>person</mat-icon> {{ task.booking.firstName }} {{ task.booking.lastName }}
                    </div>
                  }
                  @if (task.housekeeper) {
                    <div class="task-assigned">
                      <mat-icon>engineering</mat-icon> {{ task.housekeeper.name }}
                      @if (task.housekeeper.hourlyRate != null) {
                        <span class="task-rate">{{ task.housekeeper.hourlyRate | number:'1.2-2' }} €/h</span>
                      }
                      @if (task.housekeeper.phone) {
                        <a [href]="'tel:' + task.housekeeper.phone" class="hk-phone" (click)="$event.stopPropagation()">
                          <mat-icon>phone</mat-icon>
                        </a>
                        <a [href]="waUrl(task.housekeeper.phone)" target="_blank" class="hk-wa" [matTooltip]="'housekeeping.whatsapp_hk' | translate" (click)="$event.stopPropagation()">
                          <mat-icon>chat</mat-icon>
                        </a>
                      }
                    </div>
                  }
                  @if (!task.housekeeper && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
                    <div class="task-unassigned"><mat-icon>person_off</mat-icon> {{ 'housekeeping.unassigned' | translate }}</div>
                  }
                  @if (task.hasIncident) {
                    <div class="task-incident"><mat-icon>warning</mat-icon> {{ 'housekeeping.incident_reported' | translate }}</div>
                    @if (task.incidentDescription) {
                      <div class="task-incident-desc">{{ task.incidentDescription }}</div>
                    }
                  }
                  @if (task.reportComment) {
                    <div class="task-report-preview">{{ task.reportComment }}</div>
                  }
                  @if (task.notes) {
                    <div class="task-notes">{{ task.notes }}</div>
                  }
                  <div class="task-actions">
                    @if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
                      @if (task.status === 'PENDING') {
                        <button mat-stroked-button (click)="updateStatus(task, 'IN_PROGRESS')">
                          <mat-icon>play_arrow</mat-icon> {{ 'housekeeping.start' | translate }}
                        </button>
                      }
                      @if (task.status === 'IN_PROGRESS') {
                        <button mat-flat-button color="primary" (click)="updateStatus(task, 'DONE')">
                          <mat-icon>check</mat-icon> {{ 'housekeeping.complete' | translate }}
                        </button>
                      }
                    } @else if (task.status === 'DONE') {
                      <span class="completed-at">
                        {{ 'housekeeping.completed_prefix' | translate }} {{ task.completedAt | date:'dd/MM HH:mm' }}
                      </span>
                    } @else if (task.status === 'SKIPPED') {
                      <span class="skipped-label">{{ 'housekeeping.skipped_label' | translate }}</span>
                      <button mat-icon-button (click)="updateStatus(task, 'PENDING')" [title]="'housekeeping.reactivate' | translate" style="color:#1976d2">
                        <mat-icon>replay</mat-icon>
                      </button>
                    }
                    @if (task.housekeeper) {
                      <button mat-icon-button (click)="openReport(task)" [title]="'housekeeping.photos_reports' | translate"
                              [style.color]="task.hasIncident ? '#e65100' : '#1976d2'">
                        <mat-icon>photo_library</mat-icon>
                      </button>
                    }
                    <button mat-icon-button (click)="openEditTaskForm(task)" [title]="'housekeeping.edit_task_title' | translate" style="color:#555">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteTask(task)" [title]="'housekeeping.delete_confirm' | translate" style="color:#c62828">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-card>
              }
            </div>
          }

        </div>
      </mat-tab>

      <!-- ══════════════ ONGLET PRESTATAIRES ══════════════ -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px">engineering</mat-icon>
          {{ 'housekeeping.providers_tab' | translate }}
          @if (housekeepers().length) { <span class="hk-count">{{ housekeepers().length }}</span> }
        </ng-template>

        <div class="tab-content">
          <div class="header-row">
            <span></span>
            <button mat-flat-button color="primary" (click)="startNewHousekeeper()">
              <mat-icon>person_add</mat-icon> {{ 'housekeeping.new_provider' | translate }}
            </button>
          </div>

          @if (editingHk) {
            <mat-card class="create-form">
              <mat-card-header>
                <mat-card-title>{{ editingHk.id ? ('housekeeping.edit_provider_title' | translate) : ('housekeeping.new_provider' | translate) }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field>
                    <mat-label>{{ 'housekeeping.name_required' | translate }}</mat-label>
                    <input matInput [(ngModel)]="editingHk.name" placeholder="Marie D." autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'common.phone' | translate }}</mat-label>
                    <input matInput [(ngModel)]="editingHk.phone" type="tel" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'common.email' | translate }}</mat-label>
                    <input matInput [(ngModel)]="editingHk.email" type="email" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>{{ 'housekeeping.hourly_rate_field' | translate }}</mat-label>
                    <input matInput [(ngModel)]="editingHk.hourlyRate" type="number" min="0" step="0.50" placeholder="15">
                    <span matTextSuffix>{{ 'housekeeping.rate_unit' | translate }}</span>
                  </mat-form-field>
                </div>
                <mat-form-field style="width:100%">
                  <mat-label>{{ 'common.notes' | translate }}</mat-label>
                  <input matInput [(ngModel)]="editingHk.notes">
                </mat-form-field>
              </mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" (click)="saveHousekeeper()" [disabled]="!editingHk.name?.trim()">
                  {{ 'common.save' | translate }}
                </button>
                <button mat-button (click)="editingHk = null">{{ 'common.cancel' | translate }}</button>
              </mat-card-actions>
            </mat-card>
          }

          @if (housekeepers().length === 0 && !editingHk) {
            <p class="empty">{{ 'housekeeping.no_providers' | translate }}</p>
          }
          <div class="hk-list">
            @for (h of housekeepers(); track h.id) {
              <mat-card class="hk-card">
                <div class="hk-avatar"><mat-icon>person</mat-icon></div>
                <div class="hk-info">
                  <div class="hk-name">{{ h.name }}</div>
                  @if (h.phone) {
                    <a [href]="'tel:' + h.phone" class="hk-detail">
                      <mat-icon>phone</mat-icon> {{ h.phone }}
                    </a>
                  }
                  @if (h.email) {
                    <a [href]="'mailto:' + h.email" class="hk-detail">
                      <mat-icon>email</mat-icon> {{ h.email }}
                    </a>
                  }
                  @if (h.hourlyRate != null) {
                    <div class="hk-rate">
                      <mat-icon>payments</mat-icon> {{ h.hourlyRate | number:'1.2-2' }} €/h
                    </div>
                  }
                  @if (h.notes) {
                    <div class="hk-notes">{{ h.notes }}</div>
                  }
                </div>
                <div class="hk-actions">
                  <button mat-icon-button (click)="editHousekeeper(h)" [matTooltip]="'common.edit' | translate">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteHousekeeper(h)" [matTooltip]="'common.delete' | translate">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                <!-- Badge portail actif -->
                @if (h.linkedUser) {
                  <div class="portal-badge active">
                    <mat-icon>lock_open</mat-icon> {{ 'housekeeping.portal_active' | translate }} — {{ h.linkedUser.email }}
                    <button mat-icon-button color="warn" (click)="deactivatePortal(h)" [matTooltip]="'housekeeping.revoke_access' | translate">
                      <mat-icon>no_accounts</mat-icon>
                    </button>
                  </div>
                } @else {
                  <div class="portal-badge inactive" (click)="toggleActivate(h)">
                    <mat-icon>lock</mat-icon> {{ 'housekeeping.activate_portal' | translate }}
                    <mat-icon class="expand-icon">{{ activatingHk === h.id ? 'expand_less' : 'chevron_right' }}</mat-icon>
                  </div>
                  @if (activatingHk === h.id) {
                    <div class="activate-form">
                      <mat-form-field>
                        <mat-label>{{ 'housekeeping.portal_email' | translate }}</mat-label>
                        <input matInput [(ngModel)]="activateEmail" type="email" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field>
                        <mat-label>{{ 'housekeeping.portal_password' | translate }}</mat-label>
                        <input matInput [(ngModel)]="activatePassword" type="password" autocomplete="new-password">
                      </mat-form-field>
                      <div class="activate-actions">
                        <button mat-flat-button color="primary" (click)="activatePortal(h)"
                                [disabled]="!activateEmail.trim() || !activatePassword.trim()">
                          {{ 'housekeeping.create_account' | translate }}
                        </button>
                        <button mat-button (click)="activatingHk = null">{{ 'common.cancel' | translate }}</button>
                      </div>
                    </div>
                  }
                }
              </mat-card>
            }
          </div>

          <!-- ══ CHARGES MENSUELLES ══ -->
          <mat-divider style="margin: 28px 0 20px"></mat-divider>
          <div class="charges-section">
            <div class="charges-header">
              <div class="charges-title">
                <mat-icon>payments</mat-icon>
                <span>{{ 'housekeeping.monthly_charges' | translate }}</span>
              </div>
              <div class="charges-nav">
                <button mat-icon-button (click)="prevChargesMonth()" [title]="'housekeeping.prev_month' | translate">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="charges-month-label">{{ chargesMonthLabel() }}</span>
                <button mat-icon-button (click)="nextChargesMonth()" [title]="'housekeeping.next_month' | translate">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </div>

            @if (chargesLoading()) {
              <div class="center"><mat-spinner diameter="36"/></div>
            } @else if (housekeeperCharges().length === 0) {
              <p class="empty">{{ 'housekeeping.no_tasks_month' | translate }}</p>
            } @else {
              @for (entry of housekeeperCharges(); track entry.hk.id) {
                <mat-card class="charges-card">
                  <div class="charges-hk-header">
                    <div class="charges-hk-name">
                      <mat-icon>engineering</mat-icon>
                      {{ entry.hk.name }}
                    </div>
                    <div class="charges-hk-totals">
                      <span class="charges-badge-count">{{ entry.tasks.length }} {{ entry.tasks.length > 1 ? ('housekeeping.task_plural' | translate) : ('housekeeping.task_singular' | translate) }}</span>
                      @if (entry.totalHours > 0) {
                        <span class="charges-badge-hours">{{ entry.totalHours | number:'1.0-1' }} h</span>
                      }
                      @if (entry.totalCost > 0) {
                        <span class="charges-badge-cost">{{ entry.totalCost | number:'1.2-2' }} €</span>
                      }
                    </div>
                  </div>
                  <div class="charges-list">
                    @for (task of entry.tasks; track task.id) {
                      <div class="charges-row">
                        <div class="charges-row-left">
                          <span class="charges-row-date">{{ task.scheduledDate | date:'dd/MM':'':'fr-FR' }}</span>
                          <span class="charges-row-type">{{ typeLabel(task.type) }}</span>
                          <span class="charges-row-prop">{{ task.propertyName ?? task.beds24PropertyId }}</span>
                        </div>
                        <div class="charges-row-right">
                          @if (task.extraHours != null) {
                            <span class="charges-hours">{{ task.extraHours | number:'1.0-1' }} h</span>
                          }
                          @if (taskCost(task) > 0) {
                            <span class="charges-cost-cell">{{ taskCost(task) | number:'1.2-2' }} €</span>
                          } @else if (task.extraHours != null) {
                            <span class="charges-cost-cell muted">—</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </mat-card>
              }
              @if (housekeeperCharges().length > 1) {
                <div class="charges-grand-total">
                  <span>{{ 'common.total' | translate }}</span>
                  <div class="charges-hk-totals">
                    @if (chargesTotalHours() > 0) {
                      <span class="charges-badge-hours">{{ chargesTotalHours() | number:'1.0-1' }} h</span>
                    }
                    @if (chargesTotalCost() > 0) {
                      <span class="charges-badge-cost">{{ chargesTotalCost() | number:'1.2-2' }} €</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </mat-tab>

      <!-- ══════════════ ONGLET BLANCHISSERIE ══════════════ -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px">local_laundry_service</mat-icon>
          {{ 'housekeeping.laundry_tab' | translate }}
        </ng-template>
        <div class="tab-content">
          <app-linen />
        </div>
      </mat-tab>

    </mat-tab-group>

    <!-- ══════════════ DIALOG RAPPORT & PHOTOS ══════════════ -->
    <ng-template #reportDialogTpl>
      @if (reportPanel()) {
        <div class="rdialog-header">
          <div>
            <div class="rdialog-title">{{ reportPanel()!.taskLabel }}</div>
            <div class="rdialog-sub">{{ reportPanel()!.propertyName }} &mdash; {{ reportPanel()!.scheduledDate | date:'dd/MM/yyyy HH:mm' }}</div>
          </div>
          <button mat-icon-button (click)="closeReport()"><mat-icon>close</mat-icon></button>
        </div>
        <mat-dialog-content class="rdialog-content">
          @if (reportPanel()!.reportComment) {
            <div class="rsection">
              <div class="rsection-label"><mat-icon>description</mat-icon> {{ 'housekeeping.report_title' | translate }}</div>
              <div class="rcomment-text">{{ reportPanel()!.reportComment }}</div>
            </div>
          }
          @if (reportPanel()!.hasIncident) {
            <div class="rsection rincident">
              <div class="rsection-label" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <span><mat-icon>warning</mat-icon> {{ 'housekeeping.incident_reported' | translate }}</span>
                @if (!interventionDraft().show) {
                  <button mat-stroked-button color="warn" type="button" (click)="openInterventionForm()">
                    <mat-icon>build</mat-icon> {{ 'housekeeping.create_intervention' | translate }}
                  </button>
                }
              </div>
              @if (reportPanel()!.incidentDescription) {
                <div class="rcomment-text">{{ reportPanel()!.incidentDescription }}</div>
              }
              @if (reportPanel()!.housekeeperPhone) {
                <a [href]="waUrl(reportPanel()!.housekeeperPhone!)" target="_blank" class="wa-media-link">
                  <mat-icon>chat</mat-icon>
                  {{ 'housekeeping.whatsapp_view_media' | translate }}
                </a>
              }
              @if (interventionDraft().show) {
                <div class="intervention-form">
                  <div class="intervention-title"><mat-icon>build</mat-icon> {{ 'housekeeping.new_intervention_title' | translate }}</div>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ 'housekeeping.provider' | translate }}</mat-label>
                    <mat-select [ngModel]="interventionDraft().housekeeperId"
                                (ngModelChange)="setInterventionHousekeeper($event)">
                      @for (hk of housekeepers(); track hk.id) {
                        <mat-option [value]="hk.id">{{ hk.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ 'housekeeping.intervention_date' | translate }}</mat-label>
                    <input matInput [matDatepicker]="interventionPicker"
                           [ngModel]="interventionDraft().date"
                           (ngModelChange)="setInterventionDate($event)">
                    <mat-datepicker-toggle matIconSuffix [for]="interventionPicker"/>
                    <mat-datepicker #interventionPicker/>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ 'common.notes' | translate }}</mat-label>
                    <textarea matInput rows="2"
                              [ngModel]="interventionDraft().notes"
                              (ngModelChange)="setInterventionNotes($event)"></textarea>
                  </mat-form-field>
                  <div class="intervention-actions">
                    <button mat-flat-button color="warn" (click)="createIntervention()"
                            [disabled]="!interventionDraft().housekeeperId || !interventionDraft().date || interventionDraft().saving">
                      @if (interventionDraft().saving) { <mat-spinner diameter="18" style="display:inline-block"/> }
                      @else { <mat-icon>check</mat-icon> }
                      {{ 'common.create' | translate }}
                    </button>
                    <button mat-stroked-button type="button" (click)="cancelIntervention()">
                      {{ 'common.cancel' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
          @if (reportPanel()!.loading) {
            <div class="rcenter"><mat-spinner diameter="36" /></div>
          } @else {
            <div class="rsection">
              <div class="rsection-label" style="display:flex;align-items:center;justify-content:space-between">
                <span><mat-icon>photo_library</mat-icon> {{ 'housekeeper.photos' | translate }} ({{ reportPanel()!.photos.length }})</span>
                @if (adminUploadingPhoto()) {
                  <span class="admin-upload-progress"><mat-spinner diameter="18"></mat-spinner> {{ adminUploadProgress() }}</span>
                } @else {
                  <span class="admin-photo-btns">
                    <button mat-stroked-button type="button" (click)="triggerAdminPhoto('BEFORE', adminPhotoInput)">
                      <mat-icon>photo_camera</mat-icon> {{ 'housekeeping.photo_before' | translate }}
                    </button>
                    <button mat-stroked-button type="button" (click)="triggerAdminPhoto('AFTER', adminPhotoInput)">
                      <mat-icon>photo_camera</mat-icon> {{ 'housekeeping.photo_after' | translate }}
                    </button>
                    <button mat-stroked-button color="warn" type="button" (click)="triggerAdminPhoto('INCIDENT', adminPhotoInput)">
                      <mat-icon>warning</mat-icon> {{ 'housekeeping.incident' | translate }}
                    </button>
                    <input #adminPhotoInput type="file" accept="image/*,image/heic,image/heif"
                           multiple style="display:none" (change)="onAdminPhotoSelected($event)">
                  </span>
                }
              </div>
              @if (reportPanel()!.photos.length === 0) {
                <p class="rno-photos">{{ 'housekeeping.no_photos' | translate }}</p>
              } @else {
                <div class="rphotos-grid">
                  @for (photo of reportPanel()!.photos; track photo.id) {
                    <div class="rphoto-item">
                      <img [src]="photo.url ?? photo.data" [alt]="photo.caption || photo.photoType" (click)="openFullscreen(photo.url ?? photo.data ?? '')">
                      <div class="rphoto-badge" [class.incident]="photo.photoType === 'INCIDENT'">{{ photoTypeLabel(photo.photoType) }}</div>
                      <button class="rphoto-del" (click)="deleteAdminPhoto(photo)" title="Supprimer">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </mat-dialog-content>
      }
    </ng-template>
  `,
  styles: [`
    .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .create-form { margin-bottom: 24px; }
    mat-card-content { padding-top: 16px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .form-row mat-form-field { flex: 1; }
    .form-row .flex2 { flex: 2; }
    mat-card-actions { padding: 8px 16px; }
    .filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .filters mat-form-field { flex: 1; min-width: 140px; max-width: 220px; }
    .filters mat-button-toggle-group { height: 40px; }
    @media (max-width: 768px) {
      .header-row { flex-wrap: wrap; gap: 8px; }
      .form-row { flex-direction: column; gap: 0; }
      .filters mat-form-field { max-width: 100%; }
      .tasks-grid { grid-template-columns: 1fr; }
      h2 { font-size: 20px; }
    }
    .center { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #888; padding: 40px; }
    .tasks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .task-card { padding: 16px; }
    .task-card.done { opacity: 0.65; }
    .task-card.in-progress { border-left: 4px solid #1976d2; }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .task-date { font-size: 13px; color: #555; font-weight: 500; }
    .status-chip { font-size: 11px; padding: 3px 8px; border-radius: 12px; color: white; font-weight: 500; }
    .task-type { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .task-property, .task-guest, .task-assigned { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; margin-bottom: 4px; }
    .task-property mat-icon, .task-guest mat-icon, .task-assigned mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .task-notes { font-size: 12px; color: #888; margin: 8px 0; font-style: italic; white-space: pre-wrap; }
    .task-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .completed-at { font-size: 12px; color: #2e7d32; }
    .skipped-label { font-size: 12px; color: #757575; font-style: italic; }
    .tab-content { padding: 16px 0; }
    .hk-count { display: inline-flex; align-items: center; justify-content: center; background: #1976d2; color: white; border-radius: 10px; font-size: 11px; font-weight: 600; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 6px; }
    .hk-list { display: flex; flex-direction: column; gap: 12px; }
    .hk-card { display: flex; align-items: flex-start; gap: 16px; padding: 16px; }
    .hk-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e3f2fd; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hk-avatar mat-icon { color: #1976d2; }
    .hk-info { flex: 1; min-width: 0; }
    .hk-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .hk-detail { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; text-decoration: none; margin-bottom: 2px; }
    .hk-detail mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .hk-detail:hover { color: #1976d2; }
    .hk-rate  { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #2e7d32; font-weight: 500; margin-bottom: 2px; }
    .hk-rate mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .hk-notes { font-size: 12px; color: #888; font-style: italic; margin-top: 4px; }
    .hk-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .hk-sub { color: #888; font-size: 12px; }
    .hk-datetime-pair { display: flex; gap: 8px; align-items: flex-start; }
    .task-total { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #2e7d32; background: #e8f5e9; border-radius: 6px; padding: 6px 12px; margin-bottom: 8px; }
    .task-total mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .hk-time-field { width: 110px; flex-shrink: 0; }
    .task-rate { font-size: 12px; font-weight: 600; color: #2e7d32; background: #e8f5e9; padding: 1px 6px; border-radius: 10px; margin-left: 4px; }
    .hk-phone { color: #1976d2; margin-left: 4px; display: inline-flex; align-items: center; }
    .hk-phone mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .hk-wa { color: #25D366; margin-left: 4px; display: inline-flex; align-items: center; }
    .hk-wa mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .wa-media-link { display: inline-flex; align-items: center; gap: 6px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; margin-top: 10px; }
    .wa-media-link mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .depannage-alert { display: inline-flex; align-items: center; justify-content: center; background: #d32f2f; color: #fff; border-radius: 10px; font-size: 11px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 6px; line-height: 1; }
    .task-unassigned { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #f57c00; font-weight: 600; margin: 4px 0; background: #fff3e0; border-radius: 4px; padding: 2px 6px; width: fit-content; }
    .task-unassigned mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-incident { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #e65100; font-weight: 500; margin: 4px 0; }
    .task-incident mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-incident-desc { font-size: 12px; color: #e65100; background: #fff3e0; border-radius: 4px; padding: 4px 8px; margin: 4px 0; white-space: pre-wrap; }
    .incident-checkbox { display: block; margin: 8px 0; }
    .task-report-preview { font-size: 12px; color: #555; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; }
    .intervention-form { margin-top: 12px; padding: 12px; background: #fff8f8; border-radius: 8px; border: 1px solid #ffcdd2; display: flex; flex-direction: column; gap: 0; }
    .intervention-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #c62828; margin-bottom: 10px; }
    .intervention-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .intervention-form .full { width: 100%; }
    .intervention-actions { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
    /* Charges mensuelles */
    .charges-section { margin-top: 4px; }
    .charges-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .charges-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; color: #333; }
    .charges-title mat-icon { color: #1976d2; }
    .charges-nav { display: flex; align-items: center; gap: 2px; }
    .charges-month-label { font-size: 14px; font-weight: 500; min-width: 130px; text-align: center; }
    .charges-card { margin-bottom: 14px; overflow: hidden; padding: 0; }
    .charges-hk-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #e3f2fd; flex-wrap: wrap; gap: 8px; }
    .charges-hk-name { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #0d47a1; }
    .charges-hk-name mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .charges-hk-totals { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .charges-badge-count { font-size: 12px; color: #555; }
    .charges-badge-hours { background: #bbdefb; color: #0d47a1; padding: 2px 9px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .charges-badge-cost  { background: #1976d2; color: white; padding: 2px 9px; border-radius: 12px; font-size: 12px; font-weight: 700; }
    .charges-list { padding: 4px 0; }
    .charges-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 16px; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
    .charges-row:last-child { border-bottom: none; }
    .charges-row-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; }
    .charges-row-date { font-weight: 600; color: #555; flex-shrink: 0; }
    .charges-row-type { color: #333; flex-shrink: 0; }
    .charges-row-prop { color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .charges-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .charges-hours { background: #e8f5e9; color: #2e7d32; padding: 1px 7px; border-radius: 10px; font-size: 12px; font-weight: 600; }
    .charges-cost-cell { font-size: 13px; font-weight: 600; color: #1976d2; min-width: 60px; text-align: right; }
    .charges-cost-cell.muted { color: #aaa; font-weight: 400; }
    .charges-grand-total { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f5f5f5; border-radius: 8px; font-size: 14px; font-weight: 600; color: #333; margin-top: 4px; }
    /* dialog styles in global styles.scss (bypass ViewEncapsulation for CDK overlay) */
    .task-linen-preset { margin-bottom: 8px; padding: 10px 12px; background: #f3f4f6; border-radius: 8px; border: 1px solid #e0e0e0; }
    .task-linen-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #1976d2; margin-bottom: 8px; }
    .task-linen-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .task-linen-row { display: flex; align-items: center; gap: 12px; margin-bottom: 0; }
    .task-linen-label { flex: 1; font-size: 13px; color: #333; }
    .task-linen-qty { width: 110px; flex-shrink: 0; }
    .portal-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 8px; border-radius: 6px; margin-top: 8px; cursor: pointer; flex-wrap: wrap; }
    .portal-badge.active { background: #e8f5e9; color: #2e7d32; cursor: default; }
    .portal-badge.inactive { background: #f3f4f6; color: #555; }
    .portal-badge mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .expand-icon { margin-left: auto; }
    .activate-form { padding: 12px 0 4px; display: flex; flex-direction: column; gap: 0; }
    .activate-form mat-form-field { width: 100%; }
    .activate-actions { display: flex; gap: 8px; }
  `]
})
export class HousekeepingComponent implements OnInit {
  private base = environment.apiUrl;

  @ViewChild('reportDialogTpl') reportDialogTpl!: TemplateRef<unknown>;
  private dialogRef?: MatDialogRef<unknown>;

  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  properties = signal<Property[]>([]);
  housekeepers = signal<HousekeeperProfile[]>([]);
  loading = signal(false);
  reportPanel = signal<ReportPanel | null>(null);
  adminUploadingPhoto = signal(false);
  adminUploadProgress = signal('');
  private adminPhotoType = 'AFTER';
  interventionDraft = signal<InterventionDraft>({ show: false, housekeeperId: null, date: null, notes: '', saving: false });

  chargesYear  = signal(new Date().getFullYear());
  chargesMonth = signal(new Date().getMonth() + 1);
  chargeTasks  = signal<Task[]>([]);
  chargesLoading = signal(false);

  chargesMonthLabel = computed(() => {
    const d = new Date(this.chargesYear(), this.chargesMonth() - 1, 1);
    const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  housekeeperCharges = computed<HkChargesEntry[]>(() => {
    const byHk = new Map<number, HkChargesEntry>();
    for (const task of this.chargeTasks()) {
      if (!task.housekeeper || task.status !== 'DONE') continue;
      const hkId = task.housekeeper.id;
      if (!byHk.has(hkId)) {
        byHk.set(hkId, { hk: task.housekeeper, tasks: [], totalHours: 0, totalCost: 0 });
      }
      const entry = byHk.get(hkId)!;
      entry.tasks.push(task);
      const hours = task.extraHours ?? 0;
      const rate = Number(task.hourlyRate ?? task.housekeeper.hourlyRate ?? 0);
      entry.totalHours += hours;
      entry.totalCost  += hours * rate;
    }
    return Array.from(byHk.values())
      .map(e => ({ ...e, tasks: [...e.tasks].sort((a, b) => (b.scheduledDate ?? '') < (a.scheduledDate ?? '') ? -1 : 1) }))
      .sort((a, b) => a.hk.name.localeCompare(b.hk.name));
  });

  chargesTotalHours = computed(() => this.housekeeperCharges().reduce((s, e) => s + e.totalHours, 0));
  chargesTotalCost  = computed(() => this.housekeeperCharges().reduce((s, e) => s + e.totalCost, 0));

  private propConfigs = signal<any[]>([]);
  taskLinenItems = signal<{linenItemId: number; label: string; category: string; quantity: number}[]>([]);
  showForm = false;
  editingTask: Task | null = null;
  editingHk: Partial<HousekeeperProfile> | null = null;

  houseDateMode: 'all' | 'range' = 'all';
  filterFrom = '2000-01-01';
  filterTo   = '2099-12-31';
  filterFromDate: Date = new Date(Date.now() - 7 * 86400000);
  filterToDate: Date   = new Date(Date.now() + 30 * 86400000);
  filterStatus = '';

  newTask = { propertyId: null as number | null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null as number | null, notes: '', extraHours: '', hourlyRate: '', hasIncident: false, incidentDescription: '' };
  newTaskDate: Date | null = null;
  newTaskTime = '09:00';
  activatingHk: number | null = null;
  activateEmail = '';
  activatePassword = '';

  taskTypes: { value: string; label: string }[] = [];
  statuses:  { value: string; label: string }[] = [];

  private readonly MENAGE_TYPES = new Set(['CHECKOUT_CLEANING', 'CHECKIN_PREP', 'CLEANING']);
  taskCategory = signal<'menage' | 'depannage'>('menage');

  displayedTasks = computed(() => {
    const cat = this.taskCategory();
    return this.filteredTasks().filter(t =>
      cat === 'menage' ? this.MENAGE_TYPES.has(t.type) : !this.MENAGE_TYPES.has(t.type)
    );
  });

  filteredTaskTypes = computed(() =>
    this.taskTypes.filter(t =>
      this.taskCategory() === 'menage' ? this.MENAGE_TYPES.has(t.value) : !this.MENAGE_TYPES.has(t.value)
    )
  );

  unassignedDepannageCount = computed(() =>
    this.filteredTasks().filter(t =>
      !this.MENAGE_TYPES.has(t.type) && !t.housekeeper &&
      (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    ).length
  );

  setTaskCategory(cat: 'menage' | 'depannage'): void {
    this.taskCategory.set(cat);
  }

  constructor(
    private http: HttpClient,
    private housekeeperService: HousekeeperService,
    private bookingService: BookingService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.taskTypes = Object.entries(TYPE_KEYS).map(([value, key]) => ({ value, label: this.t.instant(key) }));
    this.statuses  = Object.entries(STATUS_KEYS).map(([value, key]) => ({ value, label: this.t.instant(key) }));
    this.bookingService.getPropertiesWithDisplayNames().subscribe(p => this.properties.set(p));
    this.housekeeperService.getAll().subscribe(h => this.housekeepers.set(h));
    this.http.get<any[]>(`${this.base}/admin/property-configs`).subscribe({
      next: cfgs => this.propConfigs.set(cfgs ?? []),
      error: () => {}
    });
    this.load();
    this.loadCharges();
  }

  loadCharges(): void {
    const y = this.chargesYear();
    const m = this.chargesMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${y}-${pad(m)}-01`;
    const to   = `${y}-${pad(m)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    this.chargesLoading.set(true);
    this.http.get<Task[]>(`${this.base}/admin/housekeeping`, { params: { from, to } }).subscribe({
      next: t => {
        this.bookingService.getPropertyNames().subscribe(names => {
          this.chargeTasks.set(t.map(task => {
            const pid = task.beds24PropertyId ?? '';
            return pid && names[pid] ? { ...task, propertyName: names[pid] } : task;
          }));
          this.chargesLoading.set(false);
        });
      },
      error: () => this.chargesLoading.set(false)
    });
  }

  prevChargesMonth(): void {
    let m = this.chargesMonth() - 1;
    let y = this.chargesYear();
    if (m < 1) { m = 12; y--; }
    this.chargesMonth.set(m); this.chargesYear.set(y);
    this.loadCharges();
  }

  nextChargesMonth(): void {
    let m = this.chargesMonth() + 1;
    let y = this.chargesYear();
    if (m > 12) { m = 1; y++; }
    this.chargesMonth.set(m); this.chargesYear.set(y);
    this.loadCharges();
  }

  taskCost(task: Task): number {
    if (!task.extraHours) return 0;
    return task.extraHours * Number(task.hourlyRate ?? task.housekeeper?.hourlyRate ?? 0);
  }

  onHouseDateModeChange(): void {
    if (this.houseDateMode === 'all') {
      this.filterFrom = '2000-01-01';
      this.filterTo   = '2099-12-31';
    } else {
      this.filterFrom = localDateStr(new Date(Date.now() - 7 * 86400000));
      this.filterTo   = localDateStr(new Date(Date.now() + 30 * 86400000));
      this.filterFromDate = new Date(Date.now() - 7 * 86400000);
      this.filterToDate   = new Date(Date.now() + 30 * 86400000);
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Task[]>(`${this.base}/admin/housekeeping`, {
      params: { from: this.filterFrom, to: this.filterTo }
    }).subscribe({
      next: t => {
        this.bookingService.getPropertyNames().subscribe(names => {
          this.tasks.set(t.map(task => {
            const pid = task.beds24PropertyId ?? '';
            return pid && names[pid] ? { ...task, propertyName: names[pid] } : task;
          }));
          this.applyFilter();
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false)
    });
  }

  openNewTaskForm(): void {
    this.editingTask = null;
    this.newTaskDate = new Date();
    this.newTaskTime = '09:00';
    const defaultType = this.taskCategory() === 'menage' ? 'CHECKOUT_CLEANING' : 'MAINTENANCE';
    this.newTask = { propertyId: null, type: defaultType, scheduledDate: this.fromDate(new Date()), housekeeperId: null, notes: '', extraHours: '', hourlyRate: '', hasIncident: false, incidentDescription: '' };
    this.taskLinenItems.set([]);
    this.showForm = true;
  }

  openIncidentForm(): void {
    this.taskCategory.set('depannage');
    this.openNewTaskForm();
    this.newTask.type = 'MAINTENANCE';
    this.newTask.hasIncident = true;
  }

  openEditTaskForm(task: Task): void {
    this.editingTask = task;
    const dt = task.scheduledDate ? new Date(task.scheduledDate) : new Date();
    this.newTaskDate = dt;
    this.newTaskTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    const matchingProp = this.properties().find(p => String(p.id) === task.beds24PropertyId);
    this.newTask = {
      propertyId:    matchingProp?.id ?? (task.beds24PropertyId ? Number(task.beds24PropertyId) : null),
      type:          task.type,
      scheduledDate: task.scheduledDate ?? '',
      housekeeperId: task.housekeeper?.id ?? null,
      notes:         task.notes ?? '',
      extraHours:    task.extraHours != null ? String(task.extraHours) : '',
      hourlyRate:    task.hourlyRate != null ? String(task.hourlyRate) : '',
      hasIncident:   task.hasIncident ?? false,
      incidentDescription: task.incidentDescription ?? ''
    };
    this.taskLinenItems.set([]);
    this.showForm = true;
    this.http.get<any[]>(`${this.base}/admin/housekeeping/${task.id}/linen`).subscribe({
      next: usages => {
        if (usages.length > 0) {
          this.taskLinenItems.set(usages.map(u => ({
            linenItemId: u.linenItem.id,
            label: u.linenItem.label,
            category: u.linenItem.category,
            quantity: u.quantity
          })));
        } else if (task.beds24PropertyId) {
          this.loadTaskLinenDefaults(task.beds24PropertyId);
        }
      },
      error: () => {
        if (task.beds24PropertyId) this.loadTaskLinenDefaults(task.beds24PropertyId);
      }
    });
  }

  cancelTaskForm(): void {
    this.showForm = false;
    this.editingTask = null;
    this.newTask.scheduledDate = '';
    this.taskLinenItems.set([]);
  }

  saveTask(): void {
    const task = this.editingTask!;
    const dateStr = this.fromDate(this.newTaskDate);
    const pid = String(this.newTask.propertyId ?? '');
    const prop = this.properties().find(p => String(p.id) === pid);
    const payload: Record<string, unknown> = {
      beds24PropertyId: pid,
      propertyName:     prop ? (prop['name'] ?? '') : (task.propertyName ?? null),
      type:             this.newTask.type,
      scheduledDate:    dateStr ? `${dateStr}T${this.newTaskTime}:00` : '',
      notes:            this.newTask.notes || null,
      housekeeperId:    this.newTask.housekeeperId ?? null,
      extraHours:       this.newTask.extraHours || null,
      hourlyRate:       this.newTask.hourlyRate || null,
      linenUsages:      this.taskLinenItems().filter(i => i.quantity > 0).map(i => ({ linenItemId: i.linenItemId, quantity: i.quantity }))
    };
    if (this.newTask.type === 'MAINTENANCE') {
      payload['hasIncident'] = this.newTask.hasIncident;
      payload['incidentDescription'] = this.newTask.hasIncident ? (this.newTask.incidentDescription || null) : null;
    }
    this.http.patch<Task>(`${this.base}/admin/housekeeping/${task.id}`, payload).subscribe({
      next: updated => {
        this.bookingService.getPropertyNames().subscribe(names => {
          const pid2 = updated.beds24PropertyId ?? '';
          const withName = pid2 && names[pid2] ? { ...updated, propertyName: names[pid2] } : updated;
          this.tasks.update(all => all.map(t => t.id === withName.id ? withName : t));
          this.applyFilter();
          this.cancelTaskForm();
        });
      }
    });
  }

  applyFilter(): void {
    const all = this.tasks();
    const filtered = this.filterStatus ? all.filter(t => t.status === this.filterStatus) : all;
    const done = new Set(['DONE', 'SKIPPED']);
    this.filteredTasks.set(
      [...filtered].sort((a, b) => {
        const aD = done.has(a.status) ? 1 : 0;
        const bD = done.has(b.status) ? 1 : 0;
        if (aD !== bD) return aD - bD;
        const da = (a.scheduledDate ?? '');
        const db = (b.scheduledDate ?? '');
        return da > db ? -1 : da < db ? 1 : 0;
      })
    );
  }

  createTask(): void {
    if (this.editingTask) { this.saveTask(); return; }
    const dateStr = this.fromDate(this.newTaskDate);
    const pid = String(this.newTask.propertyId ?? '');
    const prop = this.properties().find(p => String(p.id) === pid);
    const payload: Record<string, unknown> = {
      beds24PropertyId: pid,
      propertyName:     prop ? (prop['name'] ?? '') : '',
      type:             this.newTask.type,
      scheduledDate:    dateStr ? `${dateStr}T${this.newTaskTime}:00` : '',
      notes:            this.newTask.notes
    };
    if (this.newTask.housekeeperId) payload['housekeeperId'] = this.newTask.housekeeperId;
    if (this.newTask.extraHours)   payload['extraHours']   = this.newTask.extraHours;
    if (this.newTask.hourlyRate)   payload['hourlyRate']   = this.newTask.hourlyRate;
    if (this.newTask.type === 'MAINTENANCE' && this.newTask.hasIncident) {
      payload['hasIncident'] = true;
      payload['incidentDescription'] = this.newTask.incidentDescription || null;
    }
    const usages = this.taskLinenItems().filter(i => i.quantity > 0);
    if (usages.length > 0) payload['linenUsages'] = usages.map(i => ({ linenItemId: i.linenItemId, quantity: i.quantity }));
    this.http.post<Task>(`${this.base}/admin/housekeeping`, payload).subscribe(() => {
      this.showForm = false;
      this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null, notes: '', extraHours: '', hourlyRate: '', hasIncident: false, incidentDescription: '' };
      this.taskLinenItems.set([]);
      this.load();
    });
  }

  onNewPropertyChange(id: number | null): void {
    this.newTask.propertyId = id;
    if (id != null) {
      const cfg = this.propConfigs().find(c => c.beds24PropertyId === String(id));
      if (cfg?.cleaningHours != null) this.newTask.extraHours = String(cfg.cleaningHours);
      this.loadTaskLinenDefaults(String(id));
    } else {
      this.taskLinenItems.set([]);
    }
    if (id && this.newTask.housekeeperId && this.newTask.type === 'CHECKOUT_CLEANING') {
      const hk = this.housekeepers().find(h => h.id === this.newTask.housekeeperId);
      if (hk) this.generateNewTaskNotes(hk);
    }
  }

  onNewTypeChange(type: string): void {
    this.newTask.type = type;
    if (type === 'CHECKOUT_CLEANING' && this.newTask.housekeeperId && this.newTask.propertyId) {
      const hk = this.housekeepers().find(h => h.id === this.newTask.housekeeperId);
      if (hk) this.generateNewTaskNotes(hk);
    }
  }

  onNewHousekeeperChange(id: number | null): void {
    this.newTask.housekeeperId = id;
    const hk = this.housekeepers().find(h => h.id === id);
    this.newTask.hourlyRate = hk?.hourlyRate != null ? String(hk.hourlyRate) : '';
    if (id && hk && this.newTask.type === 'CHECKOUT_CLEANING' && this.newTask.propertyId) {
      this.generateNewTaskNotes(hk);
    }
  }

  private generateNewTaskNotes(hk: HousekeeperProfile): void {
    const pid      = String(this.newTask.propertyId ?? '');
    const departure = this.fromDate(this.newTaskDate);
    const prop     = this.properties().find(p => String(p.id) === pid);
    const propName = prop?.name ?? '';

    const buildNotes = (nextCheckinTime?: string) => {
      const cfg      = this.propConfigs().find(c => c.beds24PropertyId === pid);
      const code     = cfg?.accessCode ?? '';
      const prevCode = cfg?.previousAccessCode ?? '';
      const hours    = this.newTask.extraHours ? ` — ${this.newTask.extraHours}h` : '';
      let msg = `Bonjour ${hk.name},\n\nMénage ${propName} à partir du ${this.toFrDate(departure)} à ${this.newTaskTime}${hours}\n\nCode : ${prevCode}\nNouveau : ${code}`;
      if (nextCheckinTime) msg += `\n\nUn client arrive cet après-midi à ${nextCheckinTime}`;
      this.newTask.notes = msg;
    };

    const checkNextArrival = () => {
      if (!departure || !pid) { buildNotes(); return; }
      this.bookingService.getArrivals(departure).subscribe({
        next: arrivals => {
          const next = (arrivals ?? []).find((b: any) => {
            const bpid    = String(b['propId'] ?? b['propertyId'] ?? '');
            const arrDate = (b['arrival'] || '').toString().substring(0, 10);
            return bpid === pid && arrDate === departure;
          });
          let checkinTime: string | undefined;
          if (next) {
            const arrStr = (next['arrival'] || '').toString();
            const t = arrStr.includes('T') ? arrStr.substring(11, 16) : '';
            checkinTime = (t && t !== '00:00') ? t : '16:00';
          }
          buildNotes(checkinTime);
        },
        error: () => buildNotes()
      });
    };

    checkNextArrival();
  }

  private loadTaskLinenDefaults(pid: string): void {
    this.http.get<any[]>(`${this.base}/admin/linen/items`, { params: { beds24PropertyId: pid } }).subscribe({
      next: items => {
        this.taskLinenItems.set(
          items
            .filter(i => i.defaultPerCleaning > 0)
            .map(i => ({ linenItemId: i.id, label: i.label, category: i.category, quantity: i.defaultPerCleaning }))
        );
      },
      error: () => this.taskLinenItems.set([])
    });
  }

  updateLinenQty(linenItemId: number, qty: number): void {
    this.taskLinenItems.update(items =>
      items.map(i => i.linenItemId === linenItemId ? { ...i, quantity: Math.max(0, qty || 0) } : i)
    );
  }

  private toFrDate(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  updateStatus(task: Task, status: string): void {
    this.http.patch<Task>(`${this.base}/admin/housekeeping/${task.id}/status`, { status }).subscribe(updated => {
      this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t));
      this.applyFilter();
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`${this.t.instant('housekeeping.delete_confirm')} "${this.typeLabel(task.type)}" ?`)) return;
    this.http.delete(`${this.base}/admin/housekeeping/${task.id}`).subscribe(() => {
      this.tasks.update(all => all.filter(t => t.id !== task.id));
      this.applyFilter();
    });
  }

  resolvePropertyName(beds24PropertyId?: string): string | undefined {
    if (!beds24PropertyId) return undefined;
    const p = this.properties().find(x => String(x.id) === beds24PropertyId);
    return p?.name ?? undefined;
  }

  typeLabel(type: string): string   { return TYPE_KEYS[type] ? this.t.instant(TYPE_KEYS[type]) : type; }
  statusLabel(s: string): string    { return STATUS_KEYS[s] ? this.t.instant(STATUS_KEYS[s]) : s; }
  statusColor(s: string): string    { return STATUS_COLORS[s] ?? '#888'; }
  waUrl(phone: string): string      { return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`; }

  photoTypeLabel(type: string): string {
    const map: Record<string, string> = {
      BEFORE:   'housekeeping.photo_before',
      AFTER:    'housekeeping.photo_after',
      INCIDENT: 'housekeeping.photo_incident'
    };
    return map[type] ? this.t.instant(map[type]) : type;
  }

  openReport(task: Task): void {
    const propName = task.propertyName ?? task.property?.name ?? task.beds24PropertyId ?? '';
    this.reportPanel.set({
      taskId: task.id,
      taskLabel: this.typeLabel(task.type),
      propertyName: propName,
      beds24PropertyId: task.beds24PropertyId,
      scheduledDate: task.scheduledDate,
      reportComment: task.reportComment,
      hasIncident: task.hasIncident,
      incidentDescription: task.incidentDescription,
      housekeeperPhone: task.housekeeper?.phone,
      photos: [],
      loading: true
    });
    this.interventionDraft.set({ show: false, housekeeperId: null, date: null, notes: '', saving: false });
    this.dialogRef = this.dialog.open(this.reportDialogTpl, {
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false
    });
    this.dialogRef.afterClosed().subscribe(() => this.reportPanel.set(null));
    this.http.get<TaskPhoto[]>(`${this.base}/admin/housekeeping/${task.id}/photos`).subscribe({
      next: photos => this.reportPanel.update(p => p ? { ...p, photos, loading: false } : null),
      error: () => this.reportPanel.update(p => p ? { ...p, loading: false } : null)
    });
  }

  closeReport(): void { this.dialogRef?.close(); }

  setInterventionHousekeeper(id: number | null): void {
    this.interventionDraft.update(d => ({ ...d, housekeeperId: id }));
  }

  setInterventionDate(date: Date | null): void {
    this.interventionDraft.update(d => ({ ...d, date }));
  }

  setInterventionNotes(notes: string): void {
    this.interventionDraft.update(d => ({ ...d, notes }));
  }

  cancelIntervention(): void {
    this.interventionDraft.update(d => ({ ...d, show: false }));
  }

  openInterventionForm(): void {
    const panel = this.reportPanel();
    this.interventionDraft.set({
      show: true,
      housekeeperId: null,
      date: new Date(),
      notes: panel?.incidentDescription ?? '',
      saving: false
    });
  }

  createIntervention(): void {
    const draft = this.interventionDraft();
    const panel = this.reportPanel();
    if (!draft.housekeeperId || !draft.date || !panel) return;
    const dateStr = localDateStr(draft.date);
    this.interventionDraft.update(d => ({ ...d, saving: true }));
    const prop = this.properties().find(p => String(p.id) === panel.beds24PropertyId);
    const payload: Record<string, unknown> = {
      beds24PropertyId: panel.beds24PropertyId ?? '',
      propertyName: prop?.name ?? panel.propertyName ?? '',
      type: 'MAINTENANCE',
      scheduledDate: `${dateStr}T09:00:00`,
      housekeeperId: draft.housekeeperId,
      notes: draft.notes
    };
    this.http.post<Task>(`${this.base}/admin/housekeeping`, payload).subscribe({
      next: task => {
        this.tasks.update(all => [task, ...all]);
        this.applyFilter();
        this.interventionDraft.update(d => ({ ...d, show: false, saving: false }));
        this.snack.open(this.t.instant('housekeeping.intervention_created'), '', { duration: 3000 });
      },
      error: () => {
        this.interventionDraft.update(d => ({ ...d, saving: false }));
        this.snack.open(this.t.instant('housekeeping.intervention_error'), this.t.instant('common.close'), { duration: 4000 });
      }
    });
  }

  triggerAdminPhoto(type: string, input: HTMLInputElement): void {
    this.adminPhotoType = type;
    input.value = '';
    input.click();
  }

  onAdminPhotoSelected(event: Event): void {
    const panel = this.reportPanel();
    if (!panel) return;
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploadAdminFilesSequentially(files, panel.taskId, 0);
  }

  private uploadAdminFilesSequentially(files: File[], taskId: number, index: number): void {
    if (index >= files.length) {
      this.adminUploadingPhoto.set(false);
      this.snack.open(files.length > 1 ? this.t.instant('housekeeper.photos_added', { count: files.length }) : this.t.instant('housekeeper.photo_added'), '', { duration: 2000 });
      return;
    }
    this.adminUploadingPhoto.set(true);
    this.adminUploadProgress.set(files.length > 1 ? this.t.instant('housekeeper.uploading_n', { current: index + 1, total: files.length }) : this.t.instant('housekeeping.upload_in_progress'));
    this.compressImage(files[index]).then(base64 => {
      this.http.post<TaskPhoto>(`${this.base}/admin/housekeeping/${taskId}/photos`,
        { photoType: this.adminPhotoType, data: base64, caption: '' }
      ).subscribe({
        next: photo => {
          this.reportPanel.update(p => p ? { ...p, photos: [...p.photos, photo] } : null);
          this.uploadAdminFilesSequentially(files, taskId, index + 1);
        },
        error: () => {
          this.adminUploadingPhoto.set(false);
          this.snack.open(this.t.instant('housekeeping.upload_error'), this.t.instant('common.close'), { duration: 4000 });
        }
      });
    }).catch(() => {
      this.adminUploadingPhoto.set(false);
      this.snack.open(this.t.instant('housekeeping.read_error'), this.t.instant('common.close'), { duration: 3000 });
    });
  }

  deleteAdminPhoto(photo: TaskPhoto): void {
    const panel = this.reportPanel();
    if (!panel) return;
    this.http.delete(`${this.base}/admin/housekeeping/${panel.taskId}/photos/${photo.id}`).subscribe({
      next: () => this.reportPanel.update(p => p ? { ...p, photos: p.photos.filter(ph => ph.id !== photo.id) } : null),
      error: () => this.snack.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  private compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  openFullscreen(dataUri: string): void {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUri}" style="max-width:100%;max-height:100vh"></body></html>`);
      win.document.close();
    }
  }

  housekeeperByName(name: string): HousekeeperProfile | undefined {
    return this.housekeepers().find(h => h.name === name);
  }

  toggleActivate(h: HousekeeperProfile): void {
    if (this.activatingHk === h.id) { this.activatingHk = null; return; }
    this.activatingHk = h.id;
    this.activateEmail = h.email ?? '';
    this.activatePassword = '';
  }

  activatePortal(h: HousekeeperProfile): void {
    this.housekeeperService.activatePortal(h.id, this.activateEmail.trim(), this.activatePassword).subscribe({
      next: updated => {
        this.housekeepers.update(all => all.map(x => x.id === updated.id ? updated : x));
        this.activatingHk = null;
        this.snack.open(this.t.instant('housekeeping.portal_created') + ' — ' + this.activateEmail.trim(), '', { duration: 3000 });
      },
      error: (err) => this.snack.open(err.error ?? 'Erreur', '', { duration: 3000 })
    });
  }

  deactivatePortal(h: HousekeeperProfile): void {
    if (!confirm(`${this.t.instant('housekeeping.revoke_access')} "${h.name}" ?`)) return;
    this.housekeeperService.deactivatePortal(h.id).subscribe(updated => {
      this.housekeepers.update(all => all.map(x => x.id === updated.id ? updated : x));
      this.snack.open(this.t.instant('housekeeping.access_revoked'), '', { duration: 2500 });
    });
  }

  startNewHousekeeper(): void {
    this.editingHk = { name: '', phone: '', email: '', notes: '', hourlyRate: null };
  }

  editHousekeeper(h: HousekeeperProfile): void {
    this.editingHk = { ...h };
  }

  saveHousekeeper(): void {
    if (!this.editingHk?.name?.trim()) return;
    const data: Record<string, string> = {
      name:  this.editingHk.name!.trim(),
      phone: this.editingHk.phone ?? '',
      email: this.editingHk.email ?? '',
      notes: this.editingHk.notes ?? '',
      hourlyRate: this.editingHk.hourlyRate != null ? String(this.editingHk.hourlyRate) : ''
    };
    if (this.editingHk.id) {
      this.housekeeperService.update(this.editingHk.id, data).subscribe(updated => {
        this.housekeepers.update(all => all.map(h => h.id === updated.id ? updated : h));
        this.editingHk = null;
        this.snack.open(this.t.instant('housekeeping.housekeeper_updated'), '', { duration: 2500 });
      });
    } else {
      this.housekeeperService.create(data).subscribe(created => {
        this.housekeepers.update(all => [...all, created]);
        this.editingHk = null;
        this.snack.open(this.t.instant('housekeeping.housekeeper_added'), '', { duration: 2500 });
      });
    }
  }

  deleteHousekeeper(h: HousekeeperProfile): void {
    if (!confirm(`${this.t.instant('common.delete')} "${h.name}" ?`)) return;
    this.housekeeperService.delete(h.id).subscribe(() => {
      this.housekeepers.update(all => all.filter(x => x.id !== h.id));
      this.snack.open(this.t.instant('housekeeping.housekeeper_deleted'), '', { duration: 2500 });
    });
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
