import { Component, OnInit, NgZone, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HousekeeperPortalService, PortalTask, TaskPhoto } from '../../core/services/housekeeper-portal.service';
import { RouterModule } from '@angular/router';

const TYPE_LABELS: Record<string, string> = {
  CHECKOUT_CLEANING: 'Nettoyage départ',
  CHECKIN_PREP: 'Préparation arrivée',
  CLEANING: 'Nettoyage',
  MAINTENANCE: 'Maintenance',
  INSPECTION: 'Inspection'
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:     { label: 'À faire',  color: '#e65100', icon: 'schedule' },
  IN_PROGRESS: { label: 'En cours', color: '#1565c0', icon: 'play_circle' },
  DONE:        { label: 'Terminé',  color: '#2e7d32', icon: 'check_circle' },
  SKIPPED:     { label: 'Ignoré',   color: '#757575', icon: 'cancel' }
};

interface TaskWithPhotos extends PortalTask {
  photos?: TaskPhoto[];
  photosLoaded?: boolean;
}

interface ReportDraft {
  comment: string;
  hasIncident: boolean;
  incidentDesc: string;
}

@Component({
  selector: 'app-housekeeper-tasks',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatSlideToggleModule,
    MatFormFieldModule, MatInputModule
  ],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else if (tasks().length === 0) {
      <div class="empty-state">
        <mat-icon>cleaning_services</mat-icon>
        <p>Aucune mission assignée pour le moment.</p>
      </div>
    } @else {
      @for (group of grouped(); track group.label) {
        <div class="day-group">
          <div class="day-label">{{ group.label }}</div>
          @for (task of group.tasks; track task.id) {
            <mat-card class="task-card" [class.done]="task.status === 'DONE'" [class.in-progress]="task.status === 'IN_PROGRESS'">

              <!-- Header -->
              <div class="task-head">
                <div class="task-date-type">
                  <div class="task-type">{{ typeLabel(task.type) }}</div>
                  <div class="task-date">{{ task.scheduledDate | date:'EEEE dd MMMM · HH:mm':'':'fr-FR' }}</div>
                </div>
                <span class="status-badge" [style.background]="statusColor(task.status)">
                  <mat-icon>{{ statusIcon(task.status) }}</mat-icon>
                  {{ statusLabel(task.status) }}
                </span>
              </div>

              <!-- Property -->
              <div class="task-prop">
                <mat-icon>home</mat-icon>
                {{ task.propertyName ?? task.beds24PropertyId }}
              </div>

              @if (task.extraHours != null) {
                <div class="task-hours">
                  <mat-icon>schedule</mat-icon>
                  Durée prévue : <strong>{{ task.extraHours }} h</strong>
                </div>
              }

              @if (task.notes) {
                <div class="task-notes">{{ task.notes }}</div>
              }

              <!-- Actions statut -->
              @if (task.status !== 'DONE' && task.status !== 'SKIPPED') {
                <div class="task-actions">
                  @if (task.status === 'PENDING') {
                    <button mat-flat-button color="primary" (click)="setStatus(task, 'IN_PROGRESS')">
                      <mat-icon>play_arrow</mat-icon> Démarrer
                    </button>
                  }
                  @if (task.status === 'IN_PROGRESS') {
                    <button mat-flat-button color="accent" class="done-btn" (click)="setStatus(task, 'DONE')">
                      <mat-icon>check</mat-icon> Terminer
                    </button>
                  }
                </div>
              }

              @if (task.status === 'DONE' && task.completedAt) {
                <div class="completed-line">
                  <mat-icon>check_circle</mat-icon>
                  Terminé le {{ task.completedAt | date:'dd/MM à HH:mm' }}
                </div>
              }

              <!-- Rapport existant -->
              @if (task.reportComment || task.hasIncident) {
                <div class="existing-report" [class.incident]="task.hasIncident">
                  <mat-icon>{{ task.hasIncident ? 'warning' : 'comment' }}</mat-icon>
                  <div>
                    @if (task.reportComment) { <div>{{ task.reportComment }}</div> }
                    @if (task.hasIncident && task.incidentDescription) {
                      <div class="incident-text">Incident : {{ task.incidentDescription }}</div>
                    }
                  </div>
                </div>
              }

              <!-- Photos existantes -->
              @if (task.photosLoaded && task.photos && task.photos.length > 0) {
                <div class="photo-row">
                  @for (p of task.photos; track p.id) {
                    <div class="photo-thumb" [class.before]="p.photoType === 'BEFORE'" [class.incident]="p.photoType === 'INCIDENT'">
                      <img [src]="p.url ?? p.data" [alt]="p.caption || p.photoType" (click)="openPhoto(p)">
                      <span class="photo-label">{{ photoTypeLabel(p.photoType) }}</span>
                      <button class="photo-del" (click)="deletePhoto(task, p)" title="Supprimer">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- Bouton rapport -->
              <div class="report-toggle">
                <button mat-stroked-button (click)="toggleReport(task)">
                  <mat-icon>{{ openReport() === task.id ? 'expand_less' : 'add_comment' }}</mat-icon>
                  {{ openReport() === task.id ? 'Fermer' : 'Rapport / Photos' }}
                </button>
              </div>

              <!-- Formulaire rapport (inline) -->
              @if (openReport() === task.id) {
                <div class="report-form">

                  <!-- Comment -->
                  <mat-form-field style="width:100%">
                    <mat-label>Commentaire</mat-label>
                    <textarea matInput rows="3" [(ngModel)]="draft.comment" placeholder="Tout s'est bien passé..."></textarea>
                  </mat-form-field>

                  <!-- Incident toggle -->
                  <div class="incident-toggle">
                    <mat-slide-toggle color="warn" [(ngModel)]="draft.hasIncident">
                      Signaler un incident
                    </mat-slide-toggle>
                  </div>

                  @if (draft.hasIncident) {
                    <mat-form-field style="width:100%">
                      <mat-label>Description de l'incident</mat-label>
                      <textarea matInput rows="2" [(ngModel)]="draft.incidentDesc" placeholder="Détails..."></textarea>
                    </mat-form-field>
                  }

                  <!-- Photos -->
                  <div class="photo-section">
                    <div class="photo-section-title">Photos</div>
                    @if (uploadingPhoto()) {
                      <div class="upload-progress">
                        <mat-spinner diameter="24"></mat-spinner>
                        <span>Envoi en cours…</span>
                      </div>
                    } @else {
                      <div class="photo-type-row">
                        <button mat-stroked-button type="button" (click)="triggerPhoto('BEFORE', photoInput)">
                          <mat-icon>photo_camera</mat-icon> Avant
                        </button>
                        <button mat-stroked-button type="button" (click)="triggerPhoto('AFTER', photoInput)">
                          <mat-icon>photo_camera</mat-icon> Après
                        </button>
                        <button mat-stroked-button color="warn" type="button" (click)="triggerPhoto('INCIDENT', photoInput)">
                          <mat-icon>warning</mat-icon> Incident
                        </button>
                      </div>
                      <input #photoInput type="file" accept="image/*,image/heic,image/heif"
                             style="display:none" (change)="onPhotoSelected($event, task)">
                    }
                  </div>

                  <!-- Boutons rapport -->
                  <div class="report-actions">
                    <button mat-flat-button color="primary" (click)="saveReport(task)" [disabled]="savingReport()">
                      @if (savingReport()) { <mat-spinner diameter="18" style="display:inline-block"/> }
                      @else { Enregistrer }
                    </button>
                    <button mat-button (click)="closeReport()">Annuler</button>
                  </div>
                </div>
              }

            </mat-card>
          }
        </div>
      }
    }

    <!-- Lightbox -->
    @if (lightboxPhoto()) {
      <div class="lightbox" (click)="lightboxPhoto.set(null)">
        <img [src]="lightboxPhoto()!.url ?? lightboxPhoto()!.data" [alt]="lightboxPhoto()!.caption || ''">
        <button class="lightbox-close" (click)="lightboxPhoto.set(null)"><mat-icon>close</mat-icon></button>
      </div>
    }
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 60px; }
    .empty-state { text-align: center; padding: 60px 16px; color: #888; }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; opacity: .3; }
    .day-group { margin-bottom: 24px; }
    .day-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #888; padding: 0 4px 8px; border-bottom: 1px solid #eee; margin-bottom: 12px; }
    .task-card { padding: 16px; margin-bottom: 12px; border-radius: 12px !important; }
    .task-card.done { opacity: .7; }
    .task-card.in-progress { border-left: 4px solid #1565c0; }
    .task-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .task-type { font-size: 17px; font-weight: 700; }
    .task-date { font-size: 13px; color: #666; margin-top: 2px; }
    .status-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: white; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
    .status-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .task-prop { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #444; margin-bottom: 4px; }
    .task-prop mat-icon { font-size: 18px; width: 18px; height: 18px; color: #888; }
    .task-hours { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1565c0;
      background: #e3f2fd; padding: 4px 10px; border-radius: 8px; margin-bottom: 6px; width: fit-content; }
    .task-hours mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .task-notes { font-size: 13px; color: #777; font-style: italic; margin-bottom: 8px; }
    .task-actions { display: flex; gap: 8px; margin: 12px 0 8px; }
    .done-btn { background: #2e7d32 !important; color: white !important; }
    .completed-line { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2e7d32; margin: 8px 0 4px; }
    .completed-line mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .existing-report { display: flex; align-items: flex-start; gap: 8px; background: #f5f5f5; border-radius: 8px; padding: 10px 12px; margin: 8px 0; font-size: 13px; color: #444; }
    .existing-report.incident { background: #fff3e0; }
    .existing-report mat-icon { color: #888; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; }
    .existing-report.incident mat-icon { color: #e65100; }
    .incident-text { color: #e65100; margin-top: 4px; font-weight: 500; }
    .photo-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .photo-thumb { position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 2px solid #ddd; flex-shrink: 0; }
    .photo-thumb.before { border-color: #1565c0; }
    .photo-thumb.incident { border-color: #e65100; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
    .photo-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.5); color: white; font-size: 9px; text-align: center; padding: 2px; }
    .photo-del { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,.5); border: none; color: white; border-radius: 50%; width: 18px; height: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
    .photo-del mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .report-toggle { margin-top: 10px; }
    .report-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
    .incident-toggle { margin-bottom: 12px; }
    .photo-section { margin: 12px 0; }
    .photo-section-title { font-size: 13px; color: #666; margin-bottom: 8px; font-weight: 500; }
    .photo-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .upload-progress { display: flex; align-items: center; gap: 10px; color: #555; font-size: 13px; padding: 4px 0; }
    .report-actions { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.9); z-index: 9999; display: flex; align-items: center; justify-content: center; }
    .lightbox img { max-width: 95vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
    .lightbox-close { position: fixed; top: 16px; right: 16px; background: rgba(255,255,255,.2); border: none; color: white; cursor: pointer; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
  `]
})
export class HousekeeperTasksComponent implements OnInit {
  tasks = signal<TaskWithPhotos[]>([]);
  loading = signal(true);
  openReport = signal<number | null>(null);
  savingReport = signal(false);
  lightboxPhoto = signal<TaskPhoto | null>(null);
  currentPhotoType = 'AFTER';
  uploadingPhoto = signal(false);

  draft: ReportDraft = { comment: '', hasIncident: false, incidentDesc: '' };

  grouped = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const groups: Array<{ label: string; tasks: TaskWithPhotos[] }> = [];
    const map = new Map<string, TaskWithPhotos[]>();

    for (const t of this.tasks()) {
      const d = new Date(t.scheduledDate + 'T00:00:00');
      let key: string;
      if (d.getTime() === today.getTime())    key = "Aujourd'hui";
      else if (d.getTime() === tomorrow.getTime()) key = 'Demain';
      else if (d < today) key = 'Passées';
      else key = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    const order = ["Aujourd'hui", 'Demain'];
    for (const k of order) {
      if (map.has(k)) { groups.push({ label: k, tasks: map.get(k)! }); map.delete(k); }
    }
    for (const [label, ts] of map) {
      if (label !== 'Passées') groups.push({ label, tasks: ts });
    }
    if (map.has('Passées')) groups.push({ label: 'Passées', tasks: map.get('Passées')! });
    return groups;
  });

  private auth = inject(AuthService);
  private router = inject(Router);

  constructor(
    private svc: HousekeeperPortalService,
    private snack: MatSnackBar,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.svc.getTasks().subscribe({
      next: t => { this.tasks.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  typeLabel(t: string)   { return TYPE_LABELS[t] ?? t; }
  statusLabel(s: string) { return STATUS_CFG[s]?.label ?? s; }
  statusColor(s: string) { return STATUS_CFG[s]?.color ?? '#888'; }
  statusIcon(s: string)  { return STATUS_CFG[s]?.icon ?? 'help'; }
  photoTypeLabel(t: string): string {
    return t === 'BEFORE' ? 'Avant' : t === 'AFTER' ? 'Après' : 'Incident';
  }

  setStatus(task: TaskWithPhotos, status: string): void {
    this.svc.updateStatus(task.id, status).subscribe(updated => {
      this.tasks.update(all => all.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    });
  }

  toggleReport(task: TaskWithPhotos): void {
    if (this.openReport() === task.id) {
      this.closeReport(); return;
    }
    this.draft = {
      comment: task.reportComment ?? '',
      hasIncident: task.hasIncident ?? false,
      incidentDesc: task.incidentDescription ?? ''
    };
    this.openReport.set(task.id);
    if (!task.photosLoaded) {
      this.svc.getPhotos(task.id).subscribe(photos => {
        this.tasks.update(all => all.map(t => t.id === task.id ? { ...t, photos, photosLoaded: true } : t));
      });
    }
  }

  closeReport(): void { this.openReport.set(null); }

  saveReport(task: TaskWithPhotos): void {
    this.savingReport.set(true);
    this.svc.saveReport(task.id, {
      reportComment: this.draft.comment,
      hasIncident: this.draft.hasIncident,
      incidentDescription: this.draft.incidentDesc
    }).subscribe({
      next: updated => {
        this.tasks.update(all => all.map(t => t.id === updated.id ? { ...t, ...updated } : t));
        this.savingReport.set(false);
        this.snack.open('Rapport enregistré', '', { duration: 2000 });
        this.closeReport();
      },
      error: () => this.savingReport.set(false)
    });
  }

  triggerPhoto(type: string, input: HTMLInputElement): void {
    this.currentPhotoType = type;
    input.value = '';
    input.click();
  }

  onPhotoSelected(event: Event, task: TaskWithPhotos): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingPhoto.set(true);
    this.compressImage(file).then(base64 => {
      const token = this.svc.token();
      console.log('[Photo] token:', token ? `${token.substring(0, 20)}... (${token.length} chars)` : 'NULL', '| tâche:', task.id);
      fetch(`${this.svc.baseUrl}/tasks/${task.id}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ photoType: this.currentPhotoType, data: base64, caption: '' })
      }).then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<any>;
      }).then(photo => {
        this.zone.run(() => {
          this.tasks.update(all => all.map(t =>
            t.id !== task.id ? t : { ...t, photos: [...(t.photos ?? []), photo], photosLoaded: true }
          ));
          this.uploadingPhoto.set(false);
          this.snack.open('Photo ajoutée', '', { duration: 2000 });
        });
      }).catch((err: Error) => {
        this.zone.run(() => {
          this.uploadingPhoto.set(false);
          const status = err.message;
          if (status === '401') {
            this.auth.logout();
            return;
          }
          const msg = status === '413' ? 'Image trop lourde' : `Erreur upload (${status})`;
          this.snack.open(msg, 'Fermer', { duration: 5000 });
        });
      });
    }).catch(() => {
      this.zone.run(() => {
        this.uploadingPhoto.set(false);
        this.snack.open('Impossible de lire l\'image', 'Fermer', { duration: 3000 });
      });
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

  deletePhoto(task: TaskWithPhotos, photo: TaskPhoto): void {
    this.svc.deletePhoto(task.id, photo.id).subscribe(() => {
      this.tasks.update(all => all.map(t => {
        if (t.id !== task.id) return t;
        return { ...t, photos: (t.photos ?? []).filter(p => p.id !== photo.id) };
      }));
    });
  }

  openPhoto(photo: TaskPhoto): void { this.lightboxPhoto.set(photo); }
}
