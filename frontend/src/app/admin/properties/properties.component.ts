import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';
import { environment } from '@env/environment';
import { PropertyConfigService, PropertyConfig } from '../../core/services/property-config.service';
import { localDateStr } from '../../core/utils/date.utils';

interface OccupancyStatus {
  type: 'urgent' | 'vacant_long' | 'vacant_short' | 'occupied';
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  icon: string;
  sortKey: string;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatTooltipModule, MatSnackBarModule, MatDividerModule
  ],
  template: `
    <div class="page-header">
      <h1>Logements</h1>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Rechercher</mat-label>
        <input matInput [(ngModel)]="searchDraft" placeholder="Nom, ville…"
               autocomplete="off" (keydown.enter)="applySearch()">
        @if (search()) {
          <button mat-icon-button matSuffix (click)="clearSearch()" matTooltip="Effacer">
            <mat-icon>close</mat-icon>
          </button>
        } @else {
          <button mat-icon-button matSuffix (click)="applySearch()" matTooltip="Rechercher">
            <mat-icon>search</mat-icon>
          </button>
        }
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
    } @else if (filtered().length === 0) {
      <div class="empty">
        <mat-icon>home_work</mat-icon>
        <p>Aucun logement synchronisé depuis Beds24.</p>
      </div>
    } @else {
      <p class="count">{{ filtered().length }} logement{{ filtered().length !== 1 ? 's' : '' }}</p>
      <div class="props-grid">
        @for (p of filtered(); track p['id']) {
          <mat-card class="prop-card">
            <mat-card-header>
              <div class="prop-avatar" mat-card-avatar>
                <mat-icon>home</mat-icon>
              </div>
              <mat-card-title>{{ p['name'] || '—' }}</mat-card-title>
              <mat-card-subtitle class="sub">
                @if (p['city']) {
                  <mat-icon class="sub-icon">location_on</mat-icon>{{ p['city'] }}
                  @if (p['country']) { &nbsp;· {{ p['country'] }} }
                }
              </mat-card-subtitle>
            </mat-card-header>

            @if (occupancyMap()[p['id']]; as occ) {
              <div class="occ-banner" [style.background]="occ.bg" [style.color]="occ.color">
                <mat-icon class="occ-icon">{{ occ.icon }}</mat-icon>
                <span class="occ-label">{{ occ.label }}</span>
                @if (occ.sublabel) { <span class="occ-sub">· {{ occ.sublabel }}</span> }
              </div>
            }

            <mat-card-content>
              <div class="info-rows">
                @if (p['address']) {
                  <div class="info-row">
                    <mat-icon>place</mat-icon>
                    <span>{{ p['address'] }}</span>
                  </div>
                }
                @if (roomCount(p)) {
                  <div class="info-row">
                    <mat-icon>bed</mat-icon>
                    <span>{{ roomCount(p) }} chambre{{ roomCount(p) !== 1 ? 's' : '' }}</span>
                  </div>
                }
                @if (p['maxGuests'] || p['maxPeople']) {
                  <div class="info-row">
                    <mat-icon>group</mat-icon>
                    <span>{{ p['maxGuests'] || p['maxPeople'] }} personnes max.</span>
                  </div>
                }
                <div class="info-row">
                  <mat-icon>tag</mat-icon>
                  <span class="prop-id">ID Beds24 : {{ p['id'] }}</span>
                </div>
              </div>

              <mat-divider class="divider"></mat-divider>

              <!-- Code d'accès -->
              <div class="code-section">
                <div class="code-label">
                  <mat-icon>vpn_key</mat-icon>
                  <strong>Code d'accès boîte à clé</strong>
                </div>
                <div class="code-row">
                  <mat-form-field appearance="outline" class="code-input">
                    <input matInput
                           [type]="codeVisible[p['id']] ? 'text' : 'password'"
                           [(ngModel)]="codeEdits[p['id']]"
                           placeholder="Non configuré"
                           maxlength="20">
                    <button mat-icon-button matSuffix (click)="toggleVisible(p['id'])"
                            [matTooltip]="codeVisible[p['id']] ? 'Masquer' : 'Afficher'">
                      <mat-icon>{{ codeVisible[p['id']] ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </mat-form-field>
                  <button mat-icon-button color="primary" (click)="saveCode(p['id'])"
                          matTooltip="Enregistrer le code">
                    <mat-icon>save</mat-icon>
                  </button>
                  <button mat-icon-button (click)="regenerateCode(p['id'])"
                          matTooltip="Générer un nouveau code 4 chiffres">
                    <mat-icon>casino</mat-icon>
                  </button>
                </div>
                @if (prevCodes[p['id']]) {
                  <div class="prev-code">
                    <mat-icon>history</mat-icon> Précédent : {{ prevCodes[p['id']] }}
                  </div>
                }
              </div>
            </mat-card-content>

            @if (p['active'] === false) {
              <div class="inactive-banner">
                <mat-icon>pause_circle</mat-icon> Logement inactif sur Beds24
              </div>
            }
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    h1 { margin: 0; }
    .search-field { width: 260px; }
    .count { margin: 0 0 16px; font-size: 13px; color: #888; }

    .center { display: flex; justify-content: center; padding: 60px; }
    .empty { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #bbb; }
    .empty mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 12px; }
    .empty p { font-size: 15px; }

    .props-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .prop-card { display: flex; flex-direction: column; }

    .prop-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: #e3f2fd; display: flex; align-items: center; justify-content: center;
    }
    .prop-avatar mat-icon { color: #0288d1; font-size: 22px; width: 22px; height: 22px; }

    .sub { display: flex; align-items: center; flex-wrap: wrap; }
    .sub-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; margin-right: 2px; }

    .info-rows { display: flex; flex-direction: column; gap: 6px; padding: 8px 0 4px; }
    .info-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #555; }
    .info-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0288d1; flex-shrink: 0; margin-top: 1px; }
    .prop-id { font-family: monospace; font-size: 12px; color: #aaa; }

    .divider { margin: 12px 0 10px; }

    .code-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; margin-bottom: 8px;
    }
    .code-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0288d1; }
    .code-row { display: flex; align-items: center; gap: 6px; }
    .code-input { flex: 1; }

    .prev-code {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #aaa; margin-top: 2px;
    }
    .prev-code mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .occ-banner {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      padding: 7px 16px; border-bottom: 1px solid rgba(0,0,0,.06);
    }
    .occ-icon { font-size: 15px; width: 15px; height: 15px; }
    .occ-label { font-weight: 700; }
    .occ-sub { font-weight: 400; opacity: .85; }

    .inactive-banner {
      display: flex; align-items: center; gap: 6px;
      background: #fff3e0; color: #e65100; font-size: 12px;
      padding: 8px 16px; border-top: 1px solid #ffe0b2; border-radius: 0 0 4px 4px;
    }
    .inactive-banner mat-icon { font-size: 16px; width: 16px; height: 16px; }

    @media (max-width: 600px) {
      .props-grid { grid-template-columns: 1fr; }
      .search-field { width: 100%; }
    }
  `]
})
export class PropertiesComponent implements OnInit {
  properties = signal<any[]>([]);
  loading    = signal(false);
  search     = signal('');

  searchDraft  = '';
  bookings     = signal<any[]>([]);
  codeEdits:   Record<string, string>  = {};
  prevCodes:   Record<string, string>  = {};
  codeVisible: Record<string, boolean> = {};

  filtered = computed(() => {
    const q   = this.search().toLowerCase().trim();
    const map = this.occupancyMap();
    const ORDER: Record<string, number> = { urgent: 0, vacant_long: 1, vacant_short: 2, occupied: 3 };

    let list = this.properties();
    if (q) list = list.filter(p =>
      (p['name']    ?? '').toLowerCase().includes(q) ||
      (p['city']    ?? '').toLowerCase().includes(q) ||
      (p['address'] ?? '').toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      const oa = map[String(a['id'])];
      const ob = map[String(b['id'])];
      if (!oa || !ob) return 0;
      const diff = ORDER[oa.type] - ORDER[ob.type];
      if (diff !== 0) return diff;
      const keyCmp = oa.sortKey.localeCompare(ob.sortKey);
      if (keyCmp !== 0) return keyCmp;
      return (a['name'] ?? '').localeCompare(b['name'] ?? '');
    });
  });

  constructor(
    private http: HttpClient,
    private propConfigService: PropertyConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    forkJoin([
      this.http.get<any[]>(`${environment.apiUrl}/admin/properties`),
      this.propConfigService.getAll(),
      this.http.get<any[]>(`${environment.apiUrl}/admin/bookings`, {
        params: { arrivalFrom: localDateStr(sixMonthsAgo) }
      })
    ]).subscribe({
      next: ([props, cfgs, bookings]) => {
        this.properties.set(props ?? []);
        this.bookings.set(bookings ?? []);
        for (const c of cfgs) {
          this.codeEdits[c.beds24PropertyId]  = c.accessCode         ?? '';
          this.prevCodes[c.beds24PropertyId]  = c.previousAccessCode ?? '';
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  occupancyMap = computed((): Record<string, OccupancyStatus> => {
    const today   = localDateStr();
    const todayMs = new Date(today + 'T00:00:00').getTime();
    const active  = new Set(['new', 'confirmed', 'request', 'inquiry']);
    const daysDiff = (iso: string) =>
      Math.round((new Date(iso + 'T00:00:00').getTime() - todayMs) / 86400000);
    const fmt = (iso: string) =>
      new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const map: Record<string, OccupancyStatus> = {};

    for (const p of this.properties()) {
      const id = String(p['id']);
      const rel = this.bookings().filter(b => {
        const s = (b['status'] ?? '').toLowerCase();
        return active.has(s) && String(b['propId'] ?? b['propertyId'] ?? '') === id;
      });

      const current  = rel.find(b => (b['arrival'] ?? '') <= today && (b['departure'] ?? '') > today);
      const nextBook = rel
        .filter(b => (b['arrival'] ?? '') > today)
        .sort((a, b) => (a['arrival'] ?? '').localeCompare(b['arrival'] ?? ''))[0];

      const depDays = current  ? daysDiff(current['departure']) : null;
      const arrDays = nextBook ? daysDiff(nextBook['arrival'])   : null;

      // ── Rouge : arrivée ou départ aujourd'hui / demain ──
      const depUrgent = depDays !== null && depDays <= 1;
      const arrUrgent = arrDays !== null && arrDays <= 1;
      if (depUrgent || arrUrgent) {
        const depLabel = depDays === 0 ? 'Départ aujourd\'hui' : 'Départ demain';
        const arrLabel = arrDays === 0 ? 'Arrivée aujourd\'hui' : 'Arrivée demain';
        const label    = depUrgent ? depLabel : arrLabel;
        const sub      = depUrgent && arrUrgent ? (depLabel + ' · ' + arrLabel) : undefined;
        map[id] = { type: 'urgent', label, sublabel: sub,
          color: '#b71c1c', bg: '#ffebee', icon: 'priority_high',
          sortKey: '0_' + (depUrgent ? current!['departure'] : nextBook!['arrival']) };
        continue;
      }

      // ── Vert : occupé, départ dans 3+ jours ──
      if (current && depDays !== null && depDays >= 3) {
        map[id] = { type: 'occupied', label: 'Occupé',
          sublabel: `départ ${depDays === 3 ? 'dans 3 j' : `dans ${depDays} j`} · ${fmt(current['departure'])}`,
          color: '#1b5e20', bg: '#e8f5e9', icon: 'check_circle',
          sortKey: '3_' + current['departure'] };
        continue;
      }

      // ── Orange foncé : libre 15+ jours ──
      if (arrDays === null || arrDays >= 15) {
        const sub = arrDays !== null ? `prochaine arrivée le ${fmt(nextBook!['arrival'])}` : 'aucune réservation à venir';
        map[id] = { type: 'vacant_long', label: 'Libre 15+ jours',
          sublabel: sub,
          color: '#bf360c', bg: '#fbe9e7', icon: 'trending_down',
          sortKey: '1_' + (arrDays !== null ? nextBook!['arrival'] : '9999') };
        continue;
      }

      // ── Orange clair : libre 2-14 jours ──
      const arrFmt = fmt(nextBook!['arrival']);
      map[id] = { type: 'vacant_short',
        label: arrDays === 2 ? 'Arrivée après-demain' : `Arrivée dans ${arrDays} j`,
        sublabel: arrFmt,
        color: '#e65100', bg: '#fff3e0', icon: 'event',
        sortKey: '2_' + nextBook!['arrival'] };
    }
    return map;
  });

  applySearch(): void { this.search.set(this.searchDraft.trim()); }
  clearSearch(): void  { this.searchDraft = ''; this.search.set(''); }

  roomCount(p: any): number {
    if (Array.isArray(p['rooms'])) return p['rooms'].length;
    if (typeof p['numRooms'] === 'number') return p['numRooms'];
    return 0;
  }

  toggleVisible(id: string): void {
    this.codeVisible[id] = !this.codeVisible[id];
  }

  saveCode(propId: string): void {
    this.propConfigService.updateAccessCode(String(propId), this.codeEdits[propId] ?? '').subscribe({
      next: cfg => {
        this.codeEdits[propId] = cfg.accessCode         ?? '';
        this.prevCodes[propId] = cfg.previousAccessCode ?? '';
        this.snackBar.open('Code enregistré', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  regenerateCode(propId: string): void {
    this.propConfigService.regenerate(String(propId)).subscribe({
      next: cfg => {
        this.prevCodes[propId] = cfg.previousAccessCode ?? '';
        this.codeEdits[propId] = cfg.accessCode         ?? '';
        this.snackBar.open(`Nouveau code : ${cfg.accessCode}`, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }
}
