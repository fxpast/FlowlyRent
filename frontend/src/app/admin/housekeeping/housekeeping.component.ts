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
import { environment } from '@env/environment';
import { localDateStr } from '../../core/utils/date.utils';
import { HousekeeperService, HousekeeperProfile } from '../../core/services/housekeeper.service';
import { BookingService } from '../../core/services/booking.service';

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

const TYPE_LABELS: Record<string, string> = {
  CHECKOUT_CLEANING: 'Nettoyage départ',
  CHECKIN_PREP: 'Préparation arrivée',
  CLEANING: 'Nettoyage',
  MAINTENANCE: 'Maintenance',
  INSPECTION: 'Inspection'
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'À faire',     color: '#f57c00' },
  IN_PROGRESS: { label: 'En cours',    color: '#1976d2' },
  DONE:        { label: 'Terminé',     color: '#2e7d32' },
  SKIPPED:     { label: 'Ignoré',      color: '#757575' }
};

@Component({
  selector: 'app-housekeeping',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatDialogModule,
    MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatTabsModule, MatDividerModule
  ],
  template: `
    <mat-tab-group animationDuration="150ms">

      <!-- ══════════════ ONGLET TÂCHES ══════════════ -->
      <mat-tab label="Tâches">
        <div class="tab-content">

          <div class="header-row">
            <span></span>
            <button mat-flat-button color="primary" (click)="openNewTaskForm()">
              <mat-icon>add</mat-icon> Nouvelle tâche
            </button>
          </div>

          <!-- Formulaire création -->
          @if (showForm) {
            <mat-card class="create-form">
              <mat-card-header><mat-card-title>Créer une tâche</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field>
                    <mat-label>Logement</mat-label>
                    <mat-select [(ngModel)]="newTask.propertyId">
                      @for (p of properties(); track p.id) {
                        <mat-option [value]="p.id">{{ p.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Type</mat-label>
                    <mat-select [(ngModel)]="newTask.type">
                      @for (t of taskTypes; track t.value) {
                        <mat-option [value]="t.value">{{ t.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <div class="hk-datetime-pair">
                    <mat-form-field>
                      <mat-label>Date</mat-label>
                      <input matInput [matDatepicker]="schedPicker" [(ngModel)]="newTaskDate"
                             (ngModelChange)="newTask.scheduledDate = fromDate($event)">
                      <mat-datepicker-toggle matIconSuffix [for]="schedPicker"></mat-datepicker-toggle>
                      <mat-datepicker #schedPicker></mat-datepicker>
                    </mat-form-field>
                    <mat-form-field class="hk-time-field">
                      <mat-label>Heure</mat-label>
                      <input matInput type="time" [(ngModel)]="newTaskTime">
                    </mat-form-field>
                  </div>
                </div>
                <div class="form-row">
                  <mat-form-field class="flex2">
                    <mat-label>Prestataire</mat-label>
                    <mat-select [ngModel]="newTask.housekeeperId" (ngModelChange)="onNewHousekeeperChange($event)">
                      <mat-option [value]="null">— Non assigné —</mat-option>
                      @for (h of housekeepers(); track h.id) {
                        <mat-option [value]="h.id">{{ h.name }}{{ h.phone ? ' · ' + h.phone : '' }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Heures d'intervention</mat-label>
                    <input matInput type="number" min="0" step="0.5" [(ngModel)]="newTask.extraHours" placeholder="Ex : 3">
                    <span matTextSuffix>h</span>
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Taux horaire</mat-label>
                    <input matInput type="number" min="0" step="0.5" [(ngModel)]="newTask.hourlyRate" placeholder="Ex : 15">
                    <span matTextSuffix>€/h</span>
                  </mat-form-field>
                </div>
                @if (newTask.extraHours && newTask.hourlyRate) {
                  <div class="task-total">
                    <mat-icon>calculate</mat-icon>
                    Total estimé : <strong>{{ +newTask.extraHours * +newTask.hourlyRate | number:'1.2-2' }} €</strong>
                  </div>
                }
                <mat-form-field style="width:100%">
                  <mat-label>Notes</mat-label>
                  <textarea matInput rows="2" [(ngModel)]="newTask.notes" placeholder="Instructions particulières…"></textarea>
                </mat-form-field>
              </mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" (click)="createTask()" [disabled]="!newTask.propertyId || !newTaskDate">
                  Créer
                </button>
                <button mat-button (click)="showForm = false; newTask.scheduledDate = ''">Annuler</button>
              </mat-card-actions>
            </mat-card>
    }

          <!-- Filtres -->
          <div class="filters">
      <mat-form-field>
        <mat-label>Du</mat-label>
        <input matInput [matDatepicker]="fromPicker" [(ngModel)]="filterFromDate" (ngModelChange)="filterFrom = fromDate($event); load()">
        <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
        <mat-datepicker #fromPicker></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Au</mat-label>
        <input matInput [matDatepicker]="toPicker" [(ngModel)]="filterToDate" (ngModelChange)="filterTo = fromDate($event); load()">
        <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
        <mat-datepicker #toPicker></mat-datepicker>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Statut</mat-label>
        <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
          <mat-option value="">Tous</mat-option>
          @for (s of statuses; track s.value) {
            <mat-option [value]="s.value">{{ s.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

          <!-- Liste des tâches -->
          @if (loading()) {
            <div class="center"><mat-spinner diameter="40" /></div>
          } @else if (filteredTasks().length === 0) {
            <p class="empty">Aucune tâche sur cette période.</p>
          } @else {
            <div class="tasks-grid">
              @for (task of filteredTasks(); track task.id) {
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
                      }
                    </div>
                  }
                  @if (task.hasIncident) {
                    <div class="task-incident"><mat-icon>warning</mat-icon> Incident signalé</div>
                  }
                  @if (task.reportComment) {
                    <div class="task-report-preview">{{ task.reportComment }}</div>
                  }
                  @if (task.notes) {
                    <div class="task-notes">{{ task.notes }}</div>
                  }
                  <div class="task-actions">
                    @if (task.status !== 'DONE') {
                      @if (task.status === 'PENDING') {
                        <button mat-stroked-button (click)="updateStatus(task, 'IN_PROGRESS')">
                          <mat-icon>play_arrow</mat-icon> Démarrer
                        </button>
                      }
                      @if (task.status === 'IN_PROGRESS') {
                        <button mat-flat-button color="primary" (click)="updateStatus(task, 'DONE')">
                          <mat-icon>check</mat-icon> Terminer
                        </button>
                      }
                      <button mat-icon-button color="warn" (click)="deleteTask(task)" title="Supprimer">
                        <mat-icon>delete</mat-icon>
                      </button>
                    } @else {
                      <span class="completed-at">
                        Terminé {{ task.completedAt | date:'dd/MM HH:mm' }}
                      </span>
                    }
                    @if (task.housekeeper) {
                      <button mat-icon-button (click)="openReport(task)" title="Rapport & photos"
                              [style.color]="task.hasIncident ? '#e65100' : '#1976d2'">
                        <mat-icon>photo_library</mat-icon>
                      </button>
                    }
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
          Prestataires
          @if (housekeepers().length) { <span class="hk-count">{{ housekeepers().length }}</span> }
        </ng-template>

        <div class="tab-content">
          <div class="header-row">
            <span></span>
            <button mat-flat-button color="primary" (click)="startNewHousekeeper()">
              <mat-icon>person_add</mat-icon> Nouveau prestataire
            </button>
          </div>

          @if (editingHk) {
            <mat-card class="create-form">
              <mat-card-header>
                <mat-card-title>{{ editingHk.id ? 'Modifier' : 'Nouveau prestataire' }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field>
                    <mat-label>Nom *</mat-label>
                    <input matInput [(ngModel)]="editingHk.name" placeholder="Marie D." autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Téléphone</mat-label>
                    <input matInput [(ngModel)]="editingHk.phone" type="tel" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Email</mat-label>
                    <input matInput [(ngModel)]="editingHk.email" type="email" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Taux horaire (€/h)</mat-label>
                    <input matInput [(ngModel)]="editingHk.hourlyRate" type="number" min="0" step="0.50" placeholder="15">
                    <span matTextSuffix>€/h</span>
                  </mat-form-field>
                </div>
                <mat-form-field style="width:100%">
                  <mat-label>Notes</mat-label>
                  <input matInput [(ngModel)]="editingHk.notes">
                </mat-form-field>
              </mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" (click)="saveHousekeeper()" [disabled]="!editingHk.name?.trim()">
                  Enregistrer
                </button>
                <button mat-button (click)="editingHk = null">Annuler</button>
              </mat-card-actions>
            </mat-card>
          }

          @if (housekeepers().length === 0 && !editingHk) {
            <p class="empty">Aucun prestataire enregistré.</p>
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
                  <button mat-icon-button (click)="editHousekeeper(h)" matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteHousekeeper(h)" matTooltip="Supprimer">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                <!-- Badge portail actif -->
                @if (h.linkedUser) {
                  <div class="portal-badge active">
                    <mat-icon>lock_open</mat-icon> Portail actif — {{ h.linkedUser.email }}
                    <button mat-icon-button color="warn" (click)="deactivatePortal(h)" matTooltip="Révoquer l'accès">
                      <mat-icon>no_accounts</mat-icon>
                    </button>
                  </div>
                } @else {
                  <div class="portal-badge inactive" (click)="toggleActivate(h)">
                    <mat-icon>lock</mat-icon> Activer le portail prestataire
                    <mat-icon class="expand-icon">{{ activatingHk === h.id ? 'expand_less' : 'chevron_right' }}</mat-icon>
                  </div>
                  @if (activatingHk === h.id) {
                    <div class="activate-form">
                      <mat-form-field>
                        <mat-label>Email de connexion</mat-label>
                        <input matInput [(ngModel)]="activateEmail" type="email" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field>
                        <mat-label>Mot de passe temporaire</mat-label>
                        <input matInput [(ngModel)]="activatePassword" type="password" autocomplete="new-password">
                      </mat-form-field>
                      <div class="activate-actions">
                        <button mat-flat-button color="primary" (click)="activatePortal(h)"
                                [disabled]="!activateEmail.trim() || !activatePassword.trim()">
                          Créer le compte
                        </button>
                        <button mat-button (click)="activatingHk = null">Annuler</button>
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
                <span>Charges mensuelles</span>
              </div>
              <div class="charges-nav">
                <button mat-icon-button (click)="prevChargesMonth()" title="Mois précédent">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="charges-month-label">{{ chargesMonthLabel() }}</span>
                <button mat-icon-button (click)="nextChargesMonth()" title="Mois suivant">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </div>

            @if (chargesLoading()) {
              <div class="center"><mat-spinner diameter="36"/></div>
            } @else if (housekeeperCharges().length === 0) {
              <p class="empty">Aucune tâche terminée ce mois-ci.</p>
            } @else {
              @for (entry of housekeeperCharges(); track entry.hk.id) {
                <mat-card class="charges-card">
                  <div class="charges-hk-header">
                    <div class="charges-hk-name">
                      <mat-icon>engineering</mat-icon>
                      {{ entry.hk.name }}
                    </div>
                    <div class="charges-hk-totals">
                      <span class="charges-badge-count">{{ entry.tasks.length }} tâche{{ entry.tasks.length > 1 ? 's' : '' }}</span>
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
                  <span>Total</span>
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
              <div class="rsection-label"><mat-icon>description</mat-icon> Rapport</div>
              <div class="rcomment-text">{{ reportPanel()!.reportComment }}</div>
            </div>
          }
          @if (reportPanel()!.hasIncident) {
            <div class="rsection rincident">
              <div class="rsection-label" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <span><mat-icon>warning</mat-icon> Incident signalé</span>
                @if (!interventionDraft().show) {
                  <button mat-stroked-button color="warn" type="button" (click)="openInterventionForm()">
                    <mat-icon>build</mat-icon> Créer une tâche d'intervention
                  </button>
                }
              </div>
              @if (reportPanel()!.incidentDescription) {
                <div class="rcomment-text">{{ reportPanel()!.incidentDescription }}</div>
              }
              @if (interventionDraft().show) {
                <div class="intervention-form">
                  <div class="intervention-title"><mat-icon>build</mat-icon> Nouvelle tâche d'intervention</div>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Prestataire</mat-label>
                    <mat-select [ngModel]="interventionDraft().housekeeperId"
                                (ngModelChange)="setInterventionHousekeeper($event)">
                      @for (hk of housekeepers(); track hk.id) {
                        <mat-option [value]="hk.id">{{ hk.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Date d'intervention</mat-label>
                    <input matInput [matDatepicker]="interventionPicker"
                           [ngModel]="interventionDraft().date"
                           (ngModelChange)="setInterventionDate($event)">
                    <mat-datepicker-toggle matIconSuffix [for]="interventionPicker"/>
                    <mat-datepicker #interventionPicker/>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Notes</mat-label>
                    <textarea matInput rows="2"
                              [ngModel]="interventionDraft().notes"
                              (ngModelChange)="setInterventionNotes($event)"></textarea>
                  </mat-form-field>
                  <div class="intervention-actions">
                    <button mat-flat-button color="warn" (click)="createIntervention()"
                            [disabled]="!interventionDraft().housekeeperId || !interventionDraft().date || interventionDraft().saving">
                      @if (interventionDraft().saving) { <mat-spinner diameter="18" style="display:inline-block"/> }
                      @else { <mat-icon>check</mat-icon> }
                      Créer
                    </button>
                    <button mat-stroked-button type="button" (click)="cancelIntervention()">
                      Annuler
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
                <span><mat-icon>photo_library</mat-icon> Photos ({{ reportPanel()!.photos.length }})</span>
                @if (adminUploadingPhoto()) {
                  <span class="admin-upload-progress"><mat-spinner diameter="18"></mat-spinner> {{ adminUploadProgress() }}</span>
                } @else {
                  <span class="admin-photo-btns">
                    <button mat-stroked-button type="button" (click)="triggerAdminPhoto('BEFORE', adminPhotoInput)">
                      <mat-icon>photo_camera</mat-icon> Avant
                    </button>
                    <button mat-stroked-button type="button" (click)="triggerAdminPhoto('AFTER', adminPhotoInput)">
                      <mat-icon>photo_camera</mat-icon> Après
                    </button>
                    <button mat-stroked-button color="warn" type="button" (click)="triggerAdminPhoto('INCIDENT', adminPhotoInput)">
                      <mat-icon>warning</mat-icon> Incident
                    </button>
                    <input #adminPhotoInput type="file" accept="image/*,image/heic,image/heif"
                           multiple style="display:none" (change)="onAdminPhotoSelected($event)">
                  </span>
                }
              </div>
              @if (reportPanel()!.photos.length === 0) {
                <p class="rno-photos">Aucune photo pour cette tâche.</p>
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
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .create-form { margin-bottom: 24px; }
    mat-card-content { padding-top: 16px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .form-row mat-form-field { flex: 1; }
    .form-row .flex2 { flex: 2; }
    mat-card-actions { padding: 8px 16px; }
    .filters { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .filters mat-form-field { flex: 1; min-width: 140px; max-width: 220px; }
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
    .task-incident { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #e65100; font-weight: 500; margin: 4px 0; }
    .task-incident mat-icon { font-size: 14px; width: 14px; height: 14px; }
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
  adminUploadProgress = signal('Envoi en cours…');
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

  showForm = false;
  editingHk: Partial<HousekeeperProfile> | null = null;

  filterFrom = localDateStr(new Date(Date.now() - 7 * 86400000));
  filterTo   = localDateStr(new Date(Date.now() + 30 * 86400000));
  filterFromDate: Date = new Date(Date.now() - 7 * 86400000);
  filterToDate: Date   = new Date(Date.now() + 30 * 86400000);
  filterStatus = '';

  newTask = { propertyId: null as number | null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null as number | null, notes: '', extraHours: '', hourlyRate: '' };
  newTaskDate: Date | null = null;
  newTaskTime = '09:00';
  activatingHk: number | null = null;
  activateEmail = '';
  activatePassword = '';

  taskTypes = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
  statuses  = Object.entries(STATUS_LABELS).map(([value, { label }]) => ({ value, label }));

  constructor(
    private http: HttpClient,
    private housekeeperService: HousekeeperService,
    private bookingService: BookingService,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.bookingService.getPropertiesWithDisplayNames().subscribe(p => this.properties.set(p));
    this.housekeeperService.getAll().subscribe(h => this.housekeepers.set(h));
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
    this.newTaskDate = new Date();
    this.newTaskTime = '09:00';
    this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: this.fromDate(new Date()), housekeeperId: null, notes: '', extraHours: '', hourlyRate: '' };
    this.showForm = true;
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
        return da < db ? -1 : da > db ? 1 : 0;
      })
    );
  }

  createTask(): void {
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
    this.http.post<Task>(`${this.base}/admin/housekeeping`, payload).subscribe(() => {
      this.showForm = false;
      this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null, notes: '', extraHours: '', hourlyRate: '' };
      this.load();
    });
  }

  onNewHousekeeperChange(id: number | null): void {
    this.newTask.housekeeperId = id;
    const hk = this.housekeepers().find(h => h.id === id);
    this.newTask.hourlyRate = hk?.hourlyRate != null ? String(hk.hourlyRate) : '';
  }

  updateStatus(task: Task, status: string): void {
    this.http.patch<Task>(`${this.base}/admin/housekeeping/${task.id}/status`, { status }).subscribe(updated => {
      this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t));
      this.applyFilter();
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Supprimer la tâche "${this.typeLabel(task.type)}" du ${task.scheduledDate} ?`)) return;
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

  typeLabel(type: string): string   { return TYPE_LABELS[type] ?? type; }
  statusLabel(s: string): string    { return STATUS_LABELS[s]?.label ?? s; }
  statusColor(s: string): string    { return STATUS_LABELS[s]?.color ?? '#888'; }

  photoTypeLabel(type: string): string {
    const labels: Record<string, string> = { BEFORE: 'Avant', AFTER: 'Après', INCIDENT: 'Incident' };
    return labels[type] ?? type;
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
        this.snack.open('Tâche d\'intervention créée', '', { duration: 3000 });
      },
      error: () => {
        this.interventionDraft.update(d => ({ ...d, saving: false }));
        this.snack.open('Erreur lors de la création', 'Fermer', { duration: 4000 });
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
      this.snack.open(files.length > 1 ? `${files.length} photos ajoutées` : 'Photo ajoutée', '', { duration: 2000 });
      return;
    }
    this.adminUploadingPhoto.set(true);
    this.adminUploadProgress.set(files.length > 1 ? `Envoi ${index + 1}/${files.length}…` : 'Envoi en cours…');
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
          this.snack.open('Erreur upload', 'Fermer', { duration: 4000 });
        }
      });
    }).catch(() => {
      this.adminUploadingPhoto.set(false);
      this.snack.open('Impossible de lire l\'image', 'Fermer', { duration: 3000 });
    });
  }

  deleteAdminPhoto(photo: TaskPhoto): void {
    const panel = this.reportPanel();
    if (!panel) return;
    this.http.delete(`${this.base}/admin/housekeeping/${panel.taskId}/photos/${photo.id}`).subscribe({
      next: () => this.reportPanel.update(p => p ? { ...p, photos: p.photos.filter(ph => ph.id !== photo.id) } : null),
      error: () => this.snack.open('Erreur suppression', 'Fermer', { duration: 3000 })
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
        this.snack.open('Compte portail créé — ' + this.activateEmail.trim(), '', { duration: 3000 });
      },
      error: (err) => this.snack.open(err.error ?? 'Erreur', '', { duration: 3000 })
    });
  }

  deactivatePortal(h: HousekeeperProfile): void {
    if (!confirm(`Révoquer l'accès portail de "${h.name}" ?`)) return;
    this.housekeeperService.deactivatePortal(h.id).subscribe(updated => {
      this.housekeepers.update(all => all.map(x => x.id === updated.id ? updated : x));
      this.snack.open('Accès portail révoqué', '', { duration: 2500 });
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
        this.snack.open('Prestataire mis à jour', '', { duration: 2500 });
      });
    } else {
      this.housekeeperService.create(data).subscribe(created => {
        this.housekeepers.update(all => [...all, created]);
        this.editingHk = null;
        this.snack.open('Prestataire ajouté', '', { duration: 2500 });
      });
    }
  }

  deleteHousekeeper(h: HousekeeperProfile): void {
    if (!confirm(`Supprimer "${h.name}" ?`)) return;
    this.housekeeperService.delete(h.id).subscribe(() => {
      this.housekeepers.update(all => all.filter(x => x.id !== h.id));
      this.snack.open('Prestataire supprimé', '', { duration: 2500 });
    });
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
