import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HousekeeperPortalService, PortalTask, TaskPhoto } from '../../core/services/housekeeper-portal.service';

const TYPE_LABELS: Record<string, string> = {
  CHECKOUT_CLEANING: 'Nettoyage départ',
  CHECKIN_PREP: 'Préparation arrivée',
  CLEANING: 'Nettoyage',
  MAINTENANCE: 'Maintenance',
  INSPECTION: 'Inspection'
};

interface IncidentTask extends PortalTask {
  photos?: TaskPhoto[];
  photosLoaded?: boolean;
  expanded?: boolean;
}

@Component({
  selector: 'app-housekeeper-reports',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    } @else if (incidents().length === 0) {
      <div class="empty-state">
        <mat-icon>check_circle</mat-icon>
        <p>Aucun incident signalé sur les 90 derniers jours.</p>
      </div>
    } @else {
      <div class="section-header">
        <mat-icon>warning</mat-icon>
        {{ incidents().length }} signalement{{ incidents().length > 1 ? 's' : '' }}
        <span class="period">— 90 derniers jours</span>
      </div>

      @for (task of incidents(); track task.id) {
        <mat-card class="incident-card" (click)="toggle(task)">
          <div class="incident-head">
            <div class="incident-meta">
              <div class="incident-type">
                <mat-icon>warning</mat-icon>
                {{ typeLabel(task.type) }}
              </div>
              <div class="incident-sub">
                <mat-icon>home</mat-icon> {{ task.propertyName ?? task.beds24PropertyId }}
                &nbsp;·&nbsp;
                <mat-icon>calendar_today</mat-icon> {{ task.scheduledDate | date:'dd/MM/yyyy' }}
              </div>
            </div>
            <mat-icon class="expand-icon">{{ task.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
          </div>

          @if (task.expanded) {
            <div class="incident-detail">
              @if (task.incidentDescription) {
                <div class="incident-desc">
                  <strong>Description :</strong> {{ task.incidentDescription }}
                </div>
              }
              @if (task.reportComment) {
                <div class="incident-comment">
                  <strong>Commentaire :</strong> {{ task.reportComment }}
                </div>
              }
              @if (task.reportedAt) {
                <div class="incident-date">
                  Signalé le {{ task.reportedAt | date:'dd/MM/yyyy à HH:mm' }}
                </div>
              }

              @if (!task.photosLoaded) {
                <div class="center small"><mat-spinner diameter="24"/></div>
              } @else if (task.photos && task.photos.length > 0) {
                <div class="photo-row">
                  @for (p of task.photos; track p.id) {
                    <div class="photo-thumb" [class.incident-photo]="p.photoType === 'INCIDENT'"
                         (click)="openPhoto(p, $event)">
                      <img [src]="p.data" [alt]="p.photoType">
                      <span class="photo-label">{{ photoLabel(p.photoType) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="no-photos">Aucune photo jointe</div>
              }
            </div>
          }
        </mat-card>
      }
    }

    @if (lightbox()) {
      <div class="lightbox" (click)="lightbox.set(null)">
        <img [src]="lightbox()!.data" [alt]="lightbox()!.caption || ''">
        <button class="lightbox-close" (click)="lightbox.set(null)"><mat-icon>close</mat-icon></button>
      </div>
    }
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 40px; }
    .center.small { padding: 16px; }
    .empty-state { text-align: center; padding: 60px 16px; color: #888; }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; opacity: .3; color: #2e7d32; }
    .section-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #c62828; margin-bottom: 16px; }
    .section-header mat-icon { color: #c62828; }
    .period { font-size: 13px; font-weight: 400; color: #888; }
    .incident-card { margin-bottom: 12px; border-radius: 12px !important; border-left: 4px solid #e65100; cursor: pointer; padding: 14px 16px; }
    .incident-head { display: flex; align-items: flex-start; justify-content: space-between; }
    .incident-meta { flex: 1; }
    .incident-type { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: #c62828; margin-bottom: 4px; }
    .incident-type mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .incident-sub { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; flex-wrap: wrap; }
    .incident-sub mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .expand-icon { color: #aaa; flex-shrink: 0; }
    .incident-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
    .incident-desc { background: #fff3e0; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 8px; color: #e65100; }
    .incident-comment { background: #f5f5f5; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-bottom: 8px; color: #444; }
    .incident-date { font-size: 12px; color: #999; margin-bottom: 8px; }
    .photo-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .photo-thumb { position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 2px solid #ddd; flex-shrink: 0; cursor: pointer; }
    .photo-thumb.incident-photo { border-color: #e65100; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.55); color: white; font-size: 9px; text-align: center; padding: 2px; }
    .no-photos { font-size: 12px; color: #bbb; font-style: italic; }
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.92); z-index: 9999; display: flex; align-items: center; justify-content: center; }
    .lightbox img { max-width: 96vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
    .lightbox-close { position: fixed; top: 16px; right: 16px; background: rgba(255,255,255,.2); border: none; color: white; cursor: pointer; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
  `]
})
export class HousekeeperReportsComponent implements OnInit {
  incidents = signal<IncidentTask[]>([]);
  loading = signal(true);
  lightbox = signal<TaskPhoto | null>(null);

  constructor(private svc: HousekeeperPortalService) {}

  ngOnInit(): void {
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = from.toISOString().split('T')[0];
    this.svc.getTasks(fromStr).subscribe({
      next: tasks => {
        this.incidents.set(
          tasks.filter(t => t.hasIncident)
               .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  typeLabel(t: string) { return TYPE_LABELS[t] ?? t; }
  photoLabel(t: string) { return t === 'BEFORE' ? 'Avant' : t === 'AFTER' ? 'Après' : 'Incident'; }

  toggle(task: IncidentTask): void {
    task.expanded = !task.expanded;
    this.incidents.update(all => [...all]);
    if (task.expanded && !task.photosLoaded) {
      this.svc.getPhotos(task.id).subscribe(photos => {
        this.incidents.update(all => all.map(t =>
          t.id === task.id ? { ...t, photos, photosLoaded: true } : t
        ));
      });
    }
  }

  openPhoto(photo: TaskPhoto, event: Event): void {
    event.stopPropagation();
    this.lightbox.set(photo);
  }
}
