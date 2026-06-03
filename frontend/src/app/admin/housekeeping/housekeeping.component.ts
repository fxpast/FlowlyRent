import { Component, OnInit, signal, ViewChild, TemplateRef } from '@angular/core';
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
  housekeeper?: { id: number; name: string; phone?: string; email?: string; hourlyRate?: number | null };
  property?: { id: number; name: string; city?: string };
  booking?: { id: number; firstName?: string; lastName?: string };
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
  scheduledDate: string;
  reportComment?: string;
  hasIncident?: boolean;
  incidentDescription?: string;
  photos: TaskPhoto[];
  loading: boolean;
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
                  <mat-form-field>
                    <mat-label>Prestataire</mat-label>
                    <mat-select [(ngModel)]="newTask.housekeeperId">
                      <mat-option [value]="null">— Non assigné —</mat-option>
                      @for (h of housekeepers(); track h.id) {
                        <mat-option [value]="h.id">{{ h.name }}
                          @if (h.phone) { <span class="hk-sub"> · {{ h.phone }}</span> }
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field class="flex2">
                    <mat-label>Notes</mat-label>
                    <input matInput [(ngModel)]="newTask.notes" />
                  </mat-form-field>
                </div>
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
                    <mat-icon>home</mat-icon> {{ task.propertyName ?? task.property?.name ?? resolvePropertyName(task.beds24PropertyId) ?? task.beds24PropertyId }}
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
              <div class="rsection-label"><mat-icon>warning</mat-icon> Incident signalé</div>
              @if (reportPanel()!.incidentDescription) {
                <div class="rcomment-text">{{ reportPanel()!.incidentDescription }}</div>
              }
            </div>
          }
          @if (reportPanel()!.loading) {
            <div class="rcenter"><mat-spinner diameter="36" /></div>
          } @else if (reportPanel()!.photos.length === 0) {
            <p class="rno-photos">Aucune photo déposée par le prestataire.</p>
          } @else {
            <div class="rsection">
              <div class="rsection-label"><mat-icon>photo_library</mat-icon> Photos ({{ reportPanel()!.photos.length }})</div>
              <div class="rphotos-grid">
                @for (photo of reportPanel()!.photos; track photo.id) {
                  <div class="rphoto-item">
                    <img [src]="photo.url ?? photo.data" [alt]="photo.caption || photo.photoType" (click)="openFullscreen(photo.url ?? photo.data ?? '')">
                    <div class="rphoto-badge" [class.incident]="photo.photoType === 'INCIDENT'">{{ photoTypeLabel(photo.photoType) }}</div>
                    @if (photo.caption) { <div class="rphoto-caption">{{ photo.caption }}</div> }
                  </div>
                }
              </div>
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
    .task-notes { font-size: 12px; color: #888; margin: 8px 0; font-style: italic; }
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
    .hk-time-field { width: 110px; flex-shrink: 0; }
    .task-rate { font-size: 12px; font-weight: 600; color: #2e7d32; background: #e8f5e9; padding: 1px 6px; border-radius: 10px; margin-left: 4px; }
    .hk-phone { color: #1976d2; margin-left: 4px; display: inline-flex; align-items: center; }
    .hk-phone mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-incident { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #e65100; font-weight: 500; margin: 4px 0; }
    .task-incident mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-report-preview { font-size: 12px; color: #555; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; }
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
  showForm = false;
  editingHk: Partial<HousekeeperProfile> | null = null;

  filterFrom = localDateStr(new Date(Date.now() - 7 * 86400000));
  filterTo   = localDateStr(new Date(Date.now() + 30 * 86400000));
  filterFromDate: Date = new Date(Date.now() - 7 * 86400000);
  filterToDate: Date   = new Date(Date.now() + 30 * 86400000);
  filterStatus = '';

  newTask = { propertyId: null as number | null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null as number | null, notes: '' };
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
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Task[]>(`${this.base}/admin/housekeeping`, {
      params: { from: this.filterFrom, to: this.filterTo }
    }).subscribe({
      next: t => { this.tasks.set(t); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openNewTaskForm(): void {
    this.newTaskDate = new Date();
    this.newTaskTime = '09:00';
    this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: this.fromDate(new Date()), housekeeperId: null, notes: '' };
    this.showForm = true;
  }

  applyFilter(): void {
    const all = this.tasks();
    const filtered = this.filterStatus ? all.filter(t => t.status === this.filterStatus) : all;
    this.filteredTasks.set(
      [...filtered].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
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
    this.http.post<Task>(`${this.base}/admin/housekeeping`, payload).subscribe(() => {
      this.showForm = false;
      this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: '', housekeeperId: null, notes: '' };
      this.showForm = false;
      this.load();
    });
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
      scheduledDate: task.scheduledDate,
      reportComment: task.reportComment,
      hasIncident: task.hasIncident,
      incidentDescription: task.incidentDescription,
      photos: [],
      loading: true
    });
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
