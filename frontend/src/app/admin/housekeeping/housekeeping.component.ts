import { Component, OnInit, signal } from '@angular/core';
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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { environment } from '@env/environment';
import { localDateStr } from '../../core/utils/date.utils';

interface Task {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  assignedTo?: string;
  notes?: string;
  completedAt?: string;
  property: { id: number; name: string; city?: string };
  booking?: { id: number; firstName?: string; lastName?: string };
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
    MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="header-row">
      <h2>Tâches ménage</h2>
      <button mat-flat-button color="primary" (click)="showForm = !showForm">
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
            <mat-form-field>
              <mat-label>Date</mat-label>
              <input matInput type="date" [(ngModel)]="newTask.scheduledDate" />
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field>
              <mat-label>Assigné à</mat-label>
              <input matInput [(ngModel)]="newTask.assignedTo" placeholder="Nom du prestataire" />
            </mat-form-field>
            <mat-form-field class="flex2">
              <mat-label>Notes</mat-label>
              <input matInput [(ngModel)]="newTask.notes" />
            </mat-form-field>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="createTask()" [disabled]="!newTask.propertyId || !newTask.scheduledDate">
            Créer
          </button>
          <button mat-button (click)="showForm = false">Annuler</button>
        </mat-card-actions>
      </mat-card>
    }

    <!-- Filtres -->
    <div class="filters">
      <mat-form-field>
        <mat-label>Du</mat-label>
        <input matInput type="date" [(ngModel)]="filterFrom" (change)="load()" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Au</mat-label>
        <input matInput type="date" [(ngModel)]="filterTo" (change)="load()" />
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
              <div class="task-date">{{ task.scheduledDate | date:'EEE dd/MM' : '' : 'fr-FR' }}</div>
              <span class="status-chip" [style.background]="statusColor(task.status)">
                {{ statusLabel(task.status) }}
              </span>
            </div>
            <div class="task-type">{{ typeLabel(task.type) }}</div>
            <div class="task-property">
              <mat-icon>home</mat-icon> {{ task.property.name }}
            </div>
            @if (task.booking) {
              <div class="task-guest">
                <mat-icon>person</mat-icon> {{ task.booking.firstName }} {{ task.booking.lastName }}
              </div>
            }
            @if (task.assignedTo) {
              <div class="task-assigned">
                <mat-icon>engineering</mat-icon> {{ task.assignedTo }}
              </div>
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
            </div>
          </mat-card>
        }
      </div>
    }
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
  `]
})
export class HousekeepingComponent implements OnInit {
  private base = environment.apiUrl;

  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  properties = signal<Property[]>([]);
  loading = signal(false);
  showForm = false;

  filterFrom = localDateStr(new Date(Date.now() - 7 * 86400000));
  filterTo   = localDateStr(new Date(Date.now() + 30 * 86400000));
  filterStatus = '';

  newTask = { propertyId: null as number | null, type: 'CHECKOUT_CLEANING', scheduledDate: '', assignedTo: '', notes: '' };

  taskTypes = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
  statuses  = Object.entries(STATUS_LABELS).map(([value, { label }]) => ({ value, label }));

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<Property[]>(`${this.base}/admin/properties`).subscribe(p => this.properties.set(p));
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

  applyFilter(): void {
    const all = this.tasks();
    this.filteredTasks.set(
      this.filterStatus ? all.filter(t => t.status === this.filterStatus) : all
    );
  }

  createTask(): void {
    this.http.post<Task>(`${this.base}/admin/housekeeping`, this.newTask).subscribe(() => {
      this.showForm = false;
      this.newTask = { propertyId: null, type: 'CHECKOUT_CLEANING', scheduledDate: '', assignedTo: '', notes: '' };
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

  typeLabel(type: string): string   { return TYPE_LABELS[type] ?? type; }
  statusLabel(s: string): string    { return STATUS_LABELS[s]?.label ?? s; }
  statusColor(s: string): string    { return STATUS_LABELS[s]?.color ?? '#888'; }
}
