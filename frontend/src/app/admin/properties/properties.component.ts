import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';
import { environment } from '@env/environment';
import { PropertyConfigService, PropertyConfig } from '../../core/services/property-config.service';
import { BookingService } from '../../core/services/booking.service';
import { PropertyInventoryService, InventoryItem, INVENTORY_CATEGORIES, QUICK_ITEMS } from '../../core/services/property-inventory.service';
import { localDateStr } from '../../core/utils/date.utils';

interface OccupancyStatus {
  type: 'urgent' | 'vacant_long' | 'vacant_short' | 'occupied';
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  icon: string;
  sortKey: string;
  tips: string[];
  backToBack?: boolean;
  backToBackDate?: string;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
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
              <mat-card-title>
                {{ displayName(p) || '—' }}
                @if (shortNameSaved[p['id']]) {
                  <span class="short-name-badge">{{ p['name'] }}</span>
                }
              </mat-card-title>
              <mat-card-subtitle class="sub">
                @if (p['city']) {
                  <mat-icon class="sub-icon">location_on</mat-icon>{{ p['city'] }}
                  @if (p['country']) { &nbsp;· {{ p['country'] }} }
                }
              </mat-card-subtitle>
            </mat-card-header>

            @if (occupancyMap()[p['id']]; as occ) {
              <div class="occ-banner" [style.background]="occ.bg" [style.color]="occ.color"
                   (click)="toggleTip(p['id'])" role="button" style="cursor:pointer">
                <mat-icon class="occ-icon">{{ occ.icon }}</mat-icon>
                <span class="occ-label">{{ occ.label }}</span>
                @if (occ.sublabel) { <span class="occ-sub">· {{ occ.sublabel }}</span> }
                @if (occ.backToBack) {
                  <span class="btb-badge" [matTooltip]="'Back-to-back le ' + (occ.backToBackDate | date:'dd/MM')">
                    <mat-icon class="btb-icon">swap_horiz</mat-icon> Back-to-back
                  </span>
                }
                <mat-icon class="occ-arrow">{{ tipsOpen[p['id']] ? 'expand_less' : 'lightbulb' }}</mat-icon>
              </div>
              @if (tipsOpen[p['id']]) {
                <div class="occ-tips" [style.border-left-color]="occ.color">
                  @for (tip of occ.tips; track $index) {
                    <div class="tip-row">
                      <mat-icon class="tip-bullet">chevron_right</mat-icon>
                      <span>{{ tip }}</span>
                    </div>
                  }
                </div>
              }
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

              <!-- Nom court -->
              <div class="code-section">
                <div class="code-label">
                  <mat-icon matTooltip="Remplace le nom Beds24 dans toute l'application si renseigné">label</mat-icon>
                  <strong>Nom court</strong>
                  @if (isShortNameDirty(p['id'])) {
                    <button mat-flat-button color="primary" class="save-btn"
                            (click)="saveShortName(p['id'])">
                      <mat-icon>save</mat-icon> Enregistrer
                    </button>
                  }
                </div>
                <mat-form-field appearance="outline" class="code-field">
                  <input matInput [(ngModel)]="shortNameDraft[p['id']]"
                         placeholder="Ex : Appt Centre-Ville, Studio Mer…"
                         (ngModelChange)="shortNameDraft[p['id']] = $event">
                </mat-form-field>
              </div>

              <mat-divider class="divider"></mat-divider>

              <!-- Code d'accès -->
              <div class="code-section">
                <div class="code-label">
                  <mat-icon>vpn_key</mat-icon>
                  <strong>Code d'accès boîte à clé</strong>
                  @if (isDirty(p['id'])) {
                    <span class="unsaved-dot" matTooltip="Modifications non enregistrées"></span>
                  }
                </div>
                <div class="code-row">
                  <mat-form-field appearance="outline" class="code-input">
                    <input matInput
                           type="text"
                           [class.code-masked]="!codeVisible[p['id']]"
                           [(ngModel)]="codeDraft[p['id']]"
                           autocomplete="off"
                           placeholder="Non configuré"
                           maxlength="20"
                           (keydown.enter)="$event.preventDefault()">
                    <button type="button" mat-icon-button matSuffix (click)="toggleVisible(p['id'])"
                            [matTooltip]="codeVisible[p['id']] ? 'Masquer' : 'Afficher'">
                      <mat-icon>{{ codeVisible[p['id']] ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </mat-form-field>
                  <button type="button" mat-icon-button color="primary" (click)="saveCode(p['id'])"
                          matTooltip="Enregistrer le code"
                          [disabled]="!isDirty(p['id'])">
                    <mat-icon>save</mat-icon>
                  </button>
                  <button type="button" mat-icon-button (click)="regenerateCode(p['id'])"
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

              <mat-divider class="divider"></mat-divider>

              <!-- Durée ménage standard -->
              <div class="cleaning-section">
                <div class="cleaning-label">
                  <mat-icon>cleaning_services</mat-icon>
                  <strong>Durée ménage standard</strong>
                  @if (isCleaningDirty(p['id'])) {
                    <span class="unsaved-dot" matTooltip="Modifications non enregistrées"></span>
                  }
                </div>
                <div class="cleaning-row">
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <input matInput type="number" min="0" step="0.5"
                           [(ngModel)]="cleaningDraft[p['id']]"
                           placeholder="Ex : 3"
                           (keydown.enter)="saveCleaning(p['id'])">
                    <span matTextSuffix>h</span>
                  </mat-form-field>
                  <button type="button" mat-icon-button color="primary"
                          (click)="saveCleaning(p['id'])"
                          matTooltip="Enregistrer la durée"
                          [disabled]="!isCleaningDirty(p['id'])">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <mat-divider class="divider"></mat-divider>

              <!-- Inventaire & Équipements -->
              <div class="inventory-section">
                <div class="inventory-header" (click)="toggleInventory(p['id'])">
                  <mat-icon class="inv-icon">inventory_2</mat-icon>
                  <strong>Inventaire & Équipements</strong>
                  @if (inventoryMap()[p['id']]?.length) {
                    <span class="inv-count">
                      {{ inventoryMap()[p['id']].length }} article{{ inventoryMap()[p['id']].length > 1 ? 's' : '' }}
                    </span>
                  }
                  <mat-icon class="inv-toggle">{{ inventoryOpen()[p['id']] ? 'expand_less' : 'expand_more' }}</mat-icon>
                </div>

                @if (inventoryOpen()[p['id']]) {
                  <!-- Liste des articles groupés par catégorie -->
                  @if (!inventoryLoading()[p['id']] && inventoryMap()[p['id']]?.length) {
                    @for (cat of usedCategories(p['id']); track cat) {
                      <div class="inv-category">
                        <div class="inv-cat-label">
                          <mat-icon>{{ catIcon(cat) }}</mat-icon>{{ catLabel(cat) }}
                        </div>
                        @for (item of itemsByCategory(p['id'], cat); track item.id) {
                          <div class="inv-item">
                            <span class="inv-qty">×{{ item.quantity }}</span>
                            <span class="inv-label">{{ item.label }}</span>
                            @if (item.details) {
                              <span class="inv-details">{{ item.details }}</span>
                            }
                            <button mat-icon-button class="inv-del" (click)="deleteItem(p['id'], item)" matTooltip="Supprimer">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  }
                  @if (inventoryLoading()[p['id']]) {
                    <div class="inv-loading"><mat-spinner diameter="20"/></div>
                  }

                  <!-- Ajout rapide -->
                  <div class="inv-quick-title">Ajout rapide</div>
                  <div class="inv-quick-list">
                    @for (s of quickSuggestions(); track s.label + s.details) {
                      <button mat-stroked-button class="inv-quick-btn" (click)="quickAdd(p['id'], s)">
                        + {{ s.label }} @if (s.details) { <span class="inv-q-detail">{{ s.details }}</span> }
                      </button>
                    }
                  </div>

                  <!-- Formulaire ajout personnalisé -->
                  @if (newItemMap()[p['id']]; as ni) {
                    <div class="inv-custom-form">
                      <mat-form-field appearance="outline" class="inv-cat-field">
                        <mat-label>Catégorie</mat-label>
                        <mat-select [(ngModel)]="ni.category">
                          @for (c of categories; track c.value) {
                            <mat-option [value]="c.value">{{ c.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-label-field">
                        <mat-label>Équipement</mat-label>
                        <input matInput [(ngModel)]="ni.label" placeholder="Nom…">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-detail-field">
                        <mat-label>Détails</mat-label>
                        <input matInput [(ngModel)]="ni.details" placeholder="160x200, 55″…">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-qty-field">
                        <mat-label>Qté</mat-label>
                        <input matInput type="number" min="1" [(ngModel)]="ni.quantity">
                      </mat-form-field>
                      <button mat-flat-button color="primary" (click)="addItem(p['id'])"
                              [disabled]="!ni.label?.trim()">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  }
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
    .short-name-badge { font-size: 11px; font-weight: 400; color: #888; margin-left: 8px;
      background: #f5f5f5; padding: 1px 6px; border-radius: 8px; }
    .code-row { display: flex; align-items: center; gap: 6px; }
    .code-input { flex: 1; }

    input.code-masked { -webkit-text-security: disc; letter-spacing: 2px; }

    .unsaved-dot {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: #f57c00; margin-left: 6px; vertical-align: middle;
    }

    .prev-code {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #aaa; margin-top: 2px;
    }
    .prev-code mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .cleaning-section { margin-top: 12px; }
    .cleaning-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; margin-bottom: 8px;
    }
    .cleaning-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #546e7a; }
    .cleaning-row { display: flex; align-items: center; gap: 6px; }
    .cleaning-input { width: 120px; }

    .occ-banner {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      padding: 7px 16px; border-bottom: 1px solid rgba(0,0,0,.06);
      user-select: none;
    }
    .occ-banner:hover { filter: brightness(.97); }
    .occ-icon  { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .occ-label { font-weight: 700; }
    .occ-sub   { font-weight: 400; opacity: .85; flex: 1; }
    .occ-arrow { font-size: 16px; width: 16px; height: 16px; margin-left: auto; opacity: .7; }
    .btb-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700;
      background: rgba(0,0,0,.12); padding: 1px 6px; border-radius: 10px; white-space: nowrap; cursor: help; }
    .btb-icon { font-size: 13px; width: 13px; height: 13px; }

    .occ-tips {
      padding: 10px 14px 10px 12px;
      border-left: 3px solid #ccc;
      margin: 0 12px 4px;
      background: #fafafa;
      border-radius: 0 4px 4px 0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .tip-row { display: flex; align-items: flex-start; gap: 4px; font-size: 12px; color: #444; }
    .tip-bullet { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; color: #888; }

    /* Inventaire */
    .inventory-section { margin-top: 12px; }
    .inventory-header { display: flex; align-items: center; gap: 6px; cursor: pointer;
      padding: 4px 0; user-select: none; }
    .inv-icon { font-size: 16px; width: 16px; height: 16px; color: #546e7a; }
    .inventory-header strong { font-size: 13px; flex: 1; }
    .inv-count { font-size: 11px; background: #e3f2fd; color: #0277bd;
      padding: 1px 6px; border-radius: 10px; }
    .inv-toggle { font-size: 18px; width: 18px; height: 18px; color: #aaa; }
    .inv-category { margin: 8px 0 4px; }
    .inv-cat-label { display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 4px; }
    .inv-cat-label mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .inv-item { display: flex; align-items: center; gap: 6px; padding: 3px 0;
      font-size: 13px; border-bottom: 1px solid #f5f5f5; }
    .inv-qty { font-weight: 700; color: #546e7a; min-width: 24px; }
    .inv-label { flex: 1; }
    .inv-details { font-size: 12px; color: #888; background: #f5f5f5;
      padding: 1px 6px; border-radius: 6px; }
    .inv-del { width: 24px !important; height: 24px !important; line-height: 24px !important;
      color: #ccc; flex-shrink: 0; }
    .inv-del mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .inv-loading { display: flex; justify-content: center; padding: 8px; }
    .inv-quick-title { font-size: 11px; color: #aaa; margin: 8px 0 4px;
      text-transform: uppercase; letter-spacing: 0.5px; }
    .inv-quick-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .inv-quick-btn { font-size: 11px !important; height: 28px !important;
      padding: 0 8px !important; color: #546e7a !important; border-color: #b0bec5 !important; }
    .inv-q-detail { color: #999; margin-left: 2px; }
    .inv-custom-form { display: flex; gap: 6px; align-items: flex-start; flex-wrap: wrap; margin-top: 4px; }
    .inv-cat-field { width: 120px; flex-shrink: 0; }
    .inv-label-field { flex: 2; min-width: 100px; }
    .inv-detail-field { flex: 1; min-width: 80px; }
    .inv-qty-field { width: 60px; flex-shrink: 0; }

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

  searchDraft = '';
  tipsOpen:   Record<string, boolean> = {};
  bookings    = signal<any[]>([]);
  shortNameSaved: Record<string, string> = {};
  shortNameDraft: Record<string, string> = {};
  codeSaved:   Record<string, string>  = {};
  codeDraft:   Record<string, string>  = {};
  prevCodes:   Record<string, string>  = {};
  codeVisible: Record<string, boolean> = {};
  cleaningDraft: Record<string, string> = {};
  cleaningSaved: Record<string, string> = {};

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

  // ── Inventaire ──────────────────────────────────────────────────────
  readonly categories   = INVENTORY_CATEGORIES;
  readonly allQuickItems = QUICK_ITEMS;
  inventoryOpen    = signal<Record<string, boolean>>({});
  inventoryLoading = signal<Record<string, boolean>>({});
  inventoryMap     = signal<Record<string, InventoryItem[]>>({});
  newItemMap       = signal<Record<string, Partial<InventoryItem> & { quantity: number }>>({});

  toggleInventory(propId: string): void {
    const open = !this.inventoryOpen()[propId];
    this.inventoryOpen.update(m => ({ ...m, [propId]: open }));
    if (open && !this.inventoryMap()[propId]) this.loadInventory(propId);
    if (!this.newItemMap()[propId]) {
      this.newItemMap.update(m => ({ ...m, [propId]: { category: 'BEDS', label: '', details: '', quantity: 1 } }));
    }
  }

  private loadInventory(propId: string): void {
    this.inventoryLoading.update(m => ({ ...m, [propId]: true }));
    this.inventoryService.getAll(String(propId)).subscribe({
      next: items => {
        this.inventoryMap.update(m => ({ ...m, [propId]: items }));
        this.inventoryLoading.update(m => ({ ...m, [propId]: false }));
      },
      error: () => {
        this.inventoryMap.update(m => ({ ...m, [propId]: [] }));
        this.inventoryLoading.update(m => ({ ...m, [propId]: false }));
      }
    });
  }

  usedCategories(propId: string): string[] {
    const items = this.inventoryMap()[propId] ?? [];
    return [...new Set(items.map(i => i.category))];
  }

  itemsByCategory(propId: string, cat: string): InventoryItem[] {
    return (this.inventoryMap()[propId] ?? []).filter(i => i.category === cat);
  }

  catLabel(cat: string): string { return this.categories.find(c => c.value === cat)?.label ?? cat; }
  catIcon(cat: string):  string { return this.categories.find(c => c.value === cat)?.icon  ?? 'category'; }

  quickSuggestions(): typeof QUICK_ITEMS { return this.allQuickItems; }

  quickAdd(propId: string, s: { category: string; label: string; details?: string }): void {
    const key      = s.label + (s.details ?? '');
    const existing = (this.inventoryMap()[propId] ?? [])
      .find(i => (i.label + (i.details ?? '')) === key);
    if (existing?.id) {
      this.inventoryService.update(existing.id, { quantity: existing.quantity + 1 }).subscribe(updated => {
        this.inventoryMap.update(m => ({
          ...m, [propId]: (m[propId] ?? []).map(i => i.id === updated.id ? updated : i)
        }));
      });
    } else {
      this.inventoryService.create({
        beds24PropertyId: String(propId), category: s.category,
        label: s.label, details: s.details ?? null, quantity: 1
      }).subscribe(item => {
        this.inventoryMap.update(m => ({ ...m, [propId]: [...(m[propId] ?? []), item] }));
      });
    }
  }

  addItem(propId: string): void {
    const form = this.newItemMap()[propId];
    if (!form?.label?.trim()) return;
    this.inventoryService.create({
      beds24PropertyId: String(propId),
      category: form.category ?? 'OTHER',
      label:    form.label.trim(),
      details:  form.details?.trim() || null,
      quantity: form.quantity ?? 1
    }).subscribe(item => {
      this.inventoryMap.update(m => ({ ...m, [propId]: [...(m[propId] ?? []), item] }));
      this.newItemMap.update(m => ({ ...m, [propId]: { category: form.category, label: '', details: '', quantity: 1 } }));
      this.snackBar.open('Équipement ajouté', '', { duration: 1500 });
    });
  }

  deleteItem(propId: string, item: InventoryItem): void {
    if (!item.id) return;
    this.inventoryService.delete(item.id).subscribe(() => {
      this.inventoryMap.update(m => ({ ...m, [propId]: (m[propId] ?? []).filter(i => i.id !== item.id) }));
    });
  }

  constructor(
    private http: HttpClient,
    private propConfigService: PropertyConfigService,
    private bookingService: BookingService,
    private inventoryService: PropertyInventoryService,
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
          this.shortNameSaved[c.beds24PropertyId] = c.shortName ?? '';
          this.shortNameDraft[c.beds24PropertyId] = c.shortName ?? '';
          this.codeSaved[c.beds24PropertyId]     = c.accessCode         ?? '';
          this.codeDraft[c.beds24PropertyId]     = c.accessCode         ?? '';
          this.prevCodes[c.beds24PropertyId]     = c.previousAccessCode ?? '';
          const ch = c.cleaningHours != null ? String(c.cleaningHours) : '';
          this.cleaningSaved[c.beds24PropertyId] = ch;
          this.cleaningDraft[c.beds24PropertyId] = ch;
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

    const normId = (v: any): string => {
      if (v == null) return '';
      const n = Number(v);
      return isNaN(n) ? String(v) : String(Math.floor(n));
    };

    for (const p of this.properties()) {
      const id = normId(p['id']);
      const rel = this.bookings().filter(b => {
        const s = (b['status'] ?? '').toLowerCase();
        const bId = normId(b['propId'] ?? b['propertyId']);
        return active.has(s) && bId === id;
      });

      const d10 = (s: string) => (s ?? '').substring(0, 10);
      // Fix 1 : inclure le jour de départ (>= au lieu de >)
      const current  = rel.find(b => d10(b['arrival']) <= today && d10(b['departure']) >= today);
      const nextBook = rel
        .filter(b => d10(b['arrival']) > today)
        .sort((a, b) => d10(a['arrival']).localeCompare(d10(b['arrival'])))[0];

      const depDays = current  ? daysDiff(d10(current['departure'])) : null;
      const arrDays = nextBook ? daysDiff(d10(nextBook['arrival']))   : null;

      // Back-to-back : chercher parmi toutes les paires consécutives triées par arrivée
      const sorted = [...rel].sort((a, b) => d10(a['arrival']).localeCompare(d10(b['arrival'])));
      let btb = false;
      let btbDate: string | undefined;
      for (let i = 0; i < sorted.length - 1; i++) {
        const dep = d10(sorted[i]['departure']);
        const arr = d10(sorted[i + 1]['arrival']);
        if (dep === arr && dep >= today) { btb = true; btbDate = dep; break; }
      }

      const guestName = (b: any) => {
        const f = b['guestFirstName'] || b['firstName'] || '';
        const l = b['guestLastName']  || b['lastName']  || '';
        return (f + ' ' + l).trim() || b['guestName'] || '—';
      };

      // ── Back-to-back AUJOURD'HUI : départ + arrivée le même jour ──
      const depUrgent = depDays !== null && depDays <= 1;
      const arrUrgent = arrDays !== null && arrDays <= 1;
      if (depDays === 0 && arrDays === 0 && d10(current!['departure']) === d10(nextBook!['arrival'])) {
        const depName = guestName(current!);
        const arrName = guestName(nextBook!);
        map[id] = { type: 'urgent',
          label: 'Back-to-back aujourd\'hui',
          sublabel: `Départ : ${depName} · Arrivée : ${arrName}`,
          color: '#e65100', bg: '#fff3e0', icon: 'swap_horiz',
          sortKey: '00_btb',
          tips: ['Gérez le départ puis préparez l\'arrivée sans délai.',
                 'Vérifiez que le ménage est planifié entre les deux séjours.',
                 'Confirmez l\'heure d\'arrivée avec le prochain voyageur.'],
          backToBack: true, backToBackDate: today };
        continue;
      }

      // ── Rouge : départ ou arrivée dans <= 1 jour ──
      if (depUrgent || arrUrgent) {
        const depLabel = depDays === 0 ? 'Départ aujourd\'hui' : 'Départ demain';
        const arrLabel = arrDays === 0 ? 'Arrivée aujourd\'hui' : 'Arrivée demain';
        const label    = depUrgent ? depLabel : arrLabel;
        const sub      = depUrgent && arrUrgent ? (depLabel + ' · ' + arrLabel) : undefined;
        const tips = depUrgent
          ? ['Planifiez le ménage dès la sortie du voyageur.',
             'Vérifiez l\'état du logement et rechargez les consommables (linge, café, etc.).',
             'Mettez à jour vos disponibilités sur les plateformes si nécessaire.']
          : ['Envoyez les instructions de check-in si ce n\'est pas encore fait.',
             'Vérifiez le bon fonctionnement du code d\'accès.',
             'Confirmez l\'heure d\'arrivée avec le voyageur.'];
        map[id] = { type: 'urgent', label, sublabel: sub,
          color: '#b71c1c', bg: '#ffebee', icon: 'priority_high',
          sortKey: '0_' + (depUrgent ? d10(current!['departure']) : d10(nextBook!['arrival'])), tips,
          backToBack: !!btb, backToBackDate: btbDate };
        continue;
      }

      // ── Vert : occupé, départ dans 2+ jours ──
      if (current) {
        const depLabel = depDays !== null && depDays > 0
          ? `départ dans ${depDays} j · ${fmt(d10(current['departure']))}`
          : `départ le ${fmt(d10(current['departure']))}`;
        map[id] = { type: 'occupied', label: 'Occupé',
          sublabel: depLabel,
          color: '#1b5e20', bg: '#e8f5e9', icon: 'check_circle',
          sortKey: '3_' + d10(current['departure']),
          tips: ['Séjour en cours, rien d\'urgent à faire.',
                 'Pensez à envoyer un message de mi-séjour pour fidéliser le voyageur.',
                 'Profitez-en pour vérifier vos prix sur les dates après le départ.'],
          backToBack: !!btb, backToBackDate: btbDate };
        continue;
      }

      // ── Orange foncé : libre 15+ jours ──
      if (arrDays === null || arrDays >= 15) {
        const sub = arrDays !== null ? `prochaine arrivée le ${fmt(d10(nextBook!['arrival']))}` : 'aucune réservation à venir';
        map[id] = { type: 'vacant_long', label: 'Libre 15+ jours',
          sublabel: sub,
          color: '#bf360c', bg: '#fbe9e7', icon: 'trending_down',
          sortKey: '1_' + (arrDays !== null ? d10(nextBook!['arrival']) : '9999'),
          tips: ['Baissez vos tarifs ou lancez une promotion pour ces dates.',
                 'Réduisez la durée minimum de séjour pour attirer des courts séjours.',
                 'Activez la visibilité boostée sur vos plateformes (Airbnb, Booking…).',
                 'Vérifiez que votre calendrier est bien ouvert et à jour.'],
          backToBack: !!btb, backToBackDate: btbDate };
        continue;
      }

      // ── Orange clair : libre 2-14 jours ──
      const arrFmt = fmt(d10(nextBook!['arrival']));
      map[id] = { type: 'vacant_short',
        label: arrDays === 2 ? 'Arrivée après-demain' : `Arrivée dans ${arrDays} j`,
        sublabel: arrFmt,
        color: '#e65100', bg: '#fff3e0', icon: 'event',
        sortKey: '2_' + d10(nextBook!['arrival']),
        tips: ['Vérifiez vos prix pour les nuits encore libres avant cette arrivée.',
               'Une offre last-minute peut éviter des nuits vides.',
               'Préparez le logement et confirmez les détails avec le prochain voyageur.'],
        backToBack: !!btb, backToBackDate: btbDate };
    }
    return map;
  });

  toggleTip(id: string): void { this.tipsOpen[id] = !this.tipsOpen[id]; }
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

  displayName(p: any): string {
    const id = String(p['id'] ?? '');
    return this.shortNameSaved[id] || p['name'] || '';
  }

  isShortNameDirty(propId: string): boolean {
    return (this.shortNameDraft[propId] ?? '') !== (this.shortNameSaved[propId] ?? '');
  }

  saveShortName(propId: string): void {
    this.propConfigService.updateShortName(String(propId), this.shortNameDraft[propId] ?? '').subscribe({
      next: cfg => {
        this.shortNameSaved[propId] = cfg.shortName ?? '';
        this.shortNameDraft[propId] = cfg.shortName ?? '';
        this.bookingService.clearPropsCache();
        this.snackBar.open('Nom court enregistré', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  isDirty(propId: string): boolean {
    return (this.codeDraft[propId] ?? '') !== (this.codeSaved[propId] ?? '');
  }

  saveCode(propId: string): void {
    this.propConfigService.updateAccessCode(String(propId), this.codeDraft[propId] ?? '').subscribe({
      next: cfg => {
        this.codeSaved[propId] = cfg.accessCode         ?? '';
        this.codeDraft[propId] = cfg.accessCode         ?? '';
        this.prevCodes[propId] = cfg.previousAccessCode ?? '';
        this.snackBar.open('Code enregistré', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  isCleaningDirty(propId: string): boolean {
    return (this.cleaningDraft[propId] ?? '') !== (this.cleaningSaved[propId] ?? '');
  }

  saveCleaning(propId: string): void {
    this.propConfigService.updateCleaningHours(String(propId), this.cleaningDraft[propId] ?? '').subscribe({
      next: cfg => {
        const v = cfg.cleaningHours != null ? String(cfg.cleaningHours) : '';
        this.cleaningSaved[propId] = v;
        this.cleaningDraft[propId] = v;
        this.snackBar.open('Durée ménage enregistrée', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  regenerateCode(propId: string): void {
    this.propConfigService.regenerate(String(propId)).subscribe({
      next: cfg => {
        this.codeSaved[propId] = cfg.accessCode         ?? '';
        this.codeDraft[propId] = cfg.accessCode         ?? '';
        this.prevCodes[propId] = cfg.previousAccessCode ?? '';
        this.snackBar.open(`Nouveau code : ${cfg.accessCode}`, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }
}
