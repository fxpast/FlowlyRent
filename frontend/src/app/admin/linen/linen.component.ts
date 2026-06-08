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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '@env/environment';
import { BookingService } from '../../core/services/booking.service';
import { localDateStr } from '../../core/utils/date.utils';

interface Property { id: number; name: string; }

interface LinenItem {
  id: number;
  beds24PropertyId: string;
  propertyName?: string;
  label: string;
  category: string;
  totalQuantity: number;
  minThreshold?: number;
  defaultPerCleaning?: number;
  sortOrder: number;
  atLaundry: number;
  atProperty: number;
}

interface LinenMovement {
  id: number;
  direction: 'TO_LAUNDRY' | 'FROM_LAUNDRY';
  quantity: number;
  movementDate: string;
  notes?: string;
  createdAt: string;
  linenItem: { id: number; label: string; category: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  DRAPS:          'Draps',
  SERVIETTES_BAIN: 'Serviettes bain',
  SERVIETTES_MAIN: 'Serviettes main',
  TAIES:           "Taies d'oreiller",
  HOUSSES_COUETTE: 'Housses couette',
  NAPPES:          'Nappes',
  AUTRE:           'Autre'
};

const CATEGORY_ICONS: Record<string, string> = {
  DRAPS:           'bed',
  SERVIETTES_BAIN: 'dry',
  SERVIETTES_MAIN: 'dry',
  TAIES:           'layers',
  HOUSSES_COUETTE: 'king_bed',
  NAPPES:          'table_restaurant',
  AUTRE:           'category'
};

@Component({
  selector: 'app-linen',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatDividerModule, MatTooltipModule
  ],
  template: `
    <div class="linen-root">

      <!-- Sélecteur de logement -->
      <mat-form-field class="prop-select">
        <mat-label>Logement</mat-label>
        <mat-select [(ngModel)]="selectedPropId" (ngModelChange)="onPropertyChange($event)">
          @for (p of properties(); track p.id) {
            <mat-option [value]="strId(p.id)">{{ p.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (selectedPropId) {

        <!-- ── En-tête articles ── -->
        <div class="section-header">
          <span class="section-title"><mat-icon>inventory_2</mat-icon> Stock de linge</span>
          <button mat-flat-button color="primary" (click)="openItemForm()">
            <mat-icon>add</mat-icon> Ajouter un article
          </button>
        </div>

        <!-- Formulaire article (création / édition) -->
        @if (itemForm.show) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>{{ itemForm.editingId ? 'Modifier l\'article' : 'Nouvel article' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field class="flex2">
                  <mat-label>Libellé *</mat-label>
                  <input matInput [(ngModel)]="itemForm.label" placeholder="Ex : Draps 2 personnes">
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Catégorie</mat-label>
                  <mat-select [(ngModel)]="itemForm.category">
                    @for (c of categories; track c.value) {
                      <mat-option [value]="c.value">{{ c.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field>
                  <mat-label>Quantité totale *</mat-label>
                  <input matInput type="number" min="1" [(ngModel)]="itemForm.totalQuantity">
                  <span matTextSuffix>pcs</span>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Par ménage (défaut)</mat-label>
                  <input matInput type="number" min="0" [(ngModel)]="itemForm.defaultPerCleaning" placeholder="Ex : 1">
                  <span matTextSuffix>pcs</span>
                  <mat-hint>Pré-rempli à la création de tâche</mat-hint>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Alerte stock bas</mat-label>
                  <input matInput type="number" min="0" [(ngModel)]="itemForm.minThreshold" placeholder="Ex : 2">
                  <span matTextSuffix>pcs</span>
                  <mat-hint>Alerte si disponible &lt; seuil</mat-hint>
                </mat-form-field>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="primary" (click)="saveItem()"
                      [disabled]="!itemForm.label.trim() || itemForm.totalQuantity < 1 || itemForm.saving">
                {{ itemForm.editingId ? 'Modifier' : 'Créer' }}
              </button>
              <button mat-button (click)="cancelItemForm()">Annuler</button>
            </mat-card-actions>
          </mat-card>
        }

        <!-- Liste des articles -->
        @if (itemsLoading()) {
          <div class="center"><mat-spinner diameter="36" /></div>
        } @else if (items().length === 0) {
          <p class="empty">Aucun article configuré pour ce logement.</p>
        } @else {
          <div class="items-grid">
            @for (item of items(); track item.id) {
              <mat-card class="item-card" [class.alert]="isAlert(item)" [class.ok]="!isAlert(item) && item.atProperty > 0">
                <div class="item-header">
                  <div class="item-icon">
                    <mat-icon>{{ categoryIcon(item.category) }}</mat-icon>
                  </div>
                  <div class="item-meta">
                    <div class="item-label">{{ item.label }}</div>
                    <div class="item-category">{{ categoryLabel(item.category) }}</div>
                  </div>
                  <div class="item-actions-top">
                    <button mat-icon-button (click)="openItemForm(item)" matTooltip="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteItem(item)" matTooltip="Supprimer">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Badges stock -->
                <div class="stock-row">
                  <div class="stock-badge total" matTooltip="Total possédé">
                    <span class="badge-val">{{ item.totalQuantity }}</span>
                    <span class="badge-lbl">total</span>
                  </div>
                  <div class="stock-badge laundry" matTooltip="En blanchisserie">
                    <mat-icon>local_laundry_service</mat-icon>
                    <span class="badge-val">{{ item.atLaundry }}</span>
                    <span class="badge-lbl">blanchisserie</span>
                  </div>
                  <div class="stock-badge" [class.available-ok]="!isAlert(item)" [class.available-alert]="isAlert(item)" matTooltip="Disponible au logement">
                    <mat-icon>home</mat-icon>
                    <span class="badge-val">{{ item.atProperty }}</span>
                    <span class="badge-lbl">disponible</span>
                  </div>
                  @if (item.minThreshold != null) {
                    <div class="stock-badge threshold" matTooltip="Seuil d'alerte">
                      <mat-icon>notification_important</mat-icon>
                      <span class="badge-val">{{ item.minThreshold }}</span>
                      <span class="badge-lbl">seuil</span>
                    </div>
                  }
                </div>

                @if (isAlert(item)) {
                  <div class="alert-banner">
                    <mat-icon>warning</mat-icon> Stock bas — pensez à récupérer du linge propre
                  </div>
                }

                <!-- Boutons mouvement rapide -->
                @if (movementForm.itemId !== item.id) {
                  <div class="move-btns">
                    <button mat-stroked-button (click)="openMovementForm(item, 'TO_LAUNDRY')" [disabled]="item.atProperty === 0">
                      <mat-icon>local_laundry_service</mat-icon> Parti en blanchisserie
                    </button>
                    <button mat-stroked-button color="primary" (click)="openMovementForm(item, 'FROM_LAUNDRY')" [disabled]="item.atLaundry === 0">
                      <mat-icon>check_circle</mat-icon> Retour propre
                    </button>
                  </div>
                }

                <!-- Formulaire mouvement inline -->
                @if (movementForm.itemId === item.id) {
                  <div class="mv-form">
                    <div class="mv-form-title">
                      @if (movementForm.direction === 'TO_LAUNDRY') {
                        <mat-icon>local_laundry_service</mat-icon> Départ en blanchisserie
                      } @else {
                        <mat-icon>check_circle</mat-icon> Retour de blanchisserie
                      }
                    </div>
                    <div class="mv-form-row">
                      <mat-form-field class="qty-field">
                        <mat-label>Quantité</mat-label>
                        <input matInput type="number" min="1" [(ngModel)]="movementForm.quantity">
                        <span matTextSuffix>pcs</span>
                      </mat-form-field>
                      <mat-form-field class="date-field">
                        <mat-label>Date</mat-label>
                        <input matInput [matDatepicker]="mvPicker" [(ngModel)]="movementForm.date">
                        <mat-datepicker-toggle matIconSuffix [for]="mvPicker"></mat-datepicker-toggle>
                        <mat-datepicker #mvPicker></mat-datepicker>
                      </mat-form-field>
                    </div>
                    <mat-form-field style="width:100%">
                      <mat-label>Notes (optionnel)</mat-label>
                      <input matInput [(ngModel)]="movementForm.notes" placeholder="Ex : récupéré par Marie">
                    </mat-form-field>
                    <div class="mv-form-actions">
                      <button mat-flat-button color="primary" (click)="saveMovement()"
                              [disabled]="movementForm.quantity < 1 || !movementForm.date || movementForm.saving">
                        @if (movementForm.saving) { <mat-spinner diameter="16" style="display:inline-block"/> }
                        @else { <mat-icon>check</mat-icon> }
                        Enregistrer
                      </button>
                      <button mat-button (click)="closeMovementForm()">Annuler</button>
                    </div>
                  </div>
                }
              </mat-card>
            }
          </div>
        }

        <!-- ── Historique ── -->
        <mat-divider style="margin: 28px 0 20px"></mat-divider>
        <div class="section-title"><mat-icon>history</mat-icon> Historique des mouvements</div>

        @if (movementsLoading()) {
          <div class="center" style="margin-top:20px"><mat-spinner diameter="32" /></div>
        } @else if (movements().length === 0) {
          <p class="empty">Aucun mouvement enregistré.</p>
        } @else {
          <div class="history-list">
            @for (mv of movements(); track mv.id) {
              <div class="mv-row" [class.to-laundry]="mv.direction === 'TO_LAUNDRY'">
                <div class="mv-row-left">
                  <mat-icon class="mv-icon">
                    {{ mv.direction === 'TO_LAUNDRY' ? 'local_laundry_service' : 'check_circle' }}
                  </mat-icon>
                  <div class="mv-info">
                    <div class="mv-label">{{ mv.linenItem.label }}</div>
                    <div class="mv-sub">
                      {{ mv.direction === 'TO_LAUNDRY' ? 'Parti en blanchisserie' : 'Retour de blanchisserie' }}
                      @if (mv.notes) { — {{ mv.notes }} }
                    </div>
                  </div>
                </div>
                <div class="mv-row-right">
                  <span class="mv-qty" [class.out]="mv.direction === 'TO_LAUNDRY'">
                    {{ mv.direction === 'TO_LAUNDRY' ? '-' : '+' }}{{ mv.quantity }}
                  </span>
                  <span class="mv-date">{{ mv.movementDate | date:'dd/MM/yyyy':'':'fr-FR' }}</span>
                  <button mat-icon-button color="warn" (click)="deleteMovement(mv)" matTooltip="Supprimer">
                    <mat-icon style="font-size:16px;width:16px;height:16px">delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .linen-root { padding: 8px 0 24px; }
    .prop-select { width: 320px; max-width: 100%; margin-bottom: 20px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #333; }
    .section-title mat-icon { color: #1976d2; font-size: 20px; width: 20px; height: 20px; }
    .center { display: flex; justify-content: center; padding: 32px; }
    .empty { color: #999; font-size: 14px; padding: 20px 0; }

    /* Formulaire article */
    .form-card { margin-bottom: 20px; }
    mat-card-content { padding-top: 16px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 4px; flex-wrap: wrap; }
    .form-row mat-form-field { flex: 1; min-width: 160px; }
    .form-row .flex2 { flex: 2; }
    mat-card-actions { padding: 8px 16px; }

    /* Grille articles */
    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 8px; }
    .item-card { padding: 16px; border-left: 4px solid #e0e0e0; }
    .item-card.ok    { border-left-color: #4caf50; }
    .item-card.alert { border-left-color: #f44336; }

    .item-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .item-icon { width: 40px; height: 40px; border-radius: 10px; background: #e3f2fd; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .item-icon mat-icon { color: #1976d2; }
    .item-meta { flex: 1; min-width: 0; }
    .item-label { font-size: 15px; font-weight: 600; color: #222; }
    .item-category { font-size: 12px; color: #888; margin-top: 2px; }
    .item-actions-top { display: flex; flex-direction: row; gap: 0; flex-shrink: 0; }

    /* Badges stock */
    .stock-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .stock-badge { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .stock-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .badge-val { font-size: 15px; font-weight: 700; }
    .badge-lbl { font-size: 11px; font-weight: 400; color: rgba(0,0,0,0.5); margin-left: 2px; }
    .stock-badge.total        { background: #f5f5f5; color: #555; }
    .stock-badge.laundry      { background: #fff8e1; color: #f57f17; }
    .stock-badge.available-ok { background: #e8f5e9; color: #2e7d32; }
    .stock-badge.available-alert { background: #ffebee; color: #c62828; }
    .stock-badge.threshold    { background: #fce4ec; color: #880e4f; }

    .alert-banner { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #c62828; background: #ffebee; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }
    .alert-banner mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Boutons mouvement */
    .move-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .move-btns button { font-size: 12px; }

    /* Formulaire mouvement inline */
    .mv-form { margin-top: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; }
    .mv-form-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #1976d2; margin-bottom: 10px; }
    .mv-form-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .mv-form-row { display: flex; gap: 12px; }
    .qty-field { width: 120px; flex-shrink: 0; }
    .date-field { flex: 1; }
    .mv-form-actions { display: flex; gap: 8px; align-items: center; margin-top: 4px; }

    /* Historique */
    .history-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-top: 12px; }
    .mv-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f5f5f5; gap: 12px; }
    .mv-row:last-child { border-bottom: none; }
    .mv-row.to-laundry { background: #fffde7; }
    .mv-row-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .mv-icon { font-size: 20px; width: 20px; height: 20px; color: #1976d2; flex-shrink: 0; }
    .to-laundry .mv-icon { color: #f57f17; }
    .mv-info { min-width: 0; }
    .mv-label { font-size: 13px; font-weight: 600; color: #333; }
    .mv-sub { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mv-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .mv-qty { font-size: 14px; font-weight: 700; min-width: 36px; text-align: right; color: #2e7d32; }
    .mv-qty.out { color: #f57f17; }
    .mv-date { font-size: 12px; color: #999; }

    @media (max-width: 600px) {
      .items-grid { grid-template-columns: 1fr; }
      .prop-select { width: 100%; }
    }
  `]
})
export class LinenComponent implements OnInit {
  private base = environment.apiUrl;

  properties  = signal<Property[]>([]);
  items       = signal<LinenItem[]>([]);
  movements   = signal<LinenMovement[]>([]);
  itemsLoading      = signal(false);
  movementsLoading  = signal(false);
  selectedPropId    = '';

  categories = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

  itemForm: {
    show: boolean;
    editingId: number | null;
    label: string;
    category: string;
    totalQuantity: number;
    minThreshold: string;
    defaultPerCleaning: string;
    saving: boolean;
  } = { show: false, editingId: null, label: '', category: 'DRAPS', totalQuantity: 0, minThreshold: '', defaultPerCleaning: '', saving: false };

  movementForm: {
    itemId: number | null;
    direction: 'TO_LAUNDRY' | 'FROM_LAUNDRY';
    quantity: number;
    date: Date;
    notes: string;
    saving: boolean;
  } = { itemId: null, direction: 'TO_LAUNDRY', quantity: 1, date: new Date(), notes: '', saving: false };

  constructor(
    private http: HttpClient,
    private bookingService: BookingService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.bookingService.getPropertiesWithDisplayNames().subscribe(p => this.properties.set(p));
  }

  strId(id: number): string { return String(id); }

  onPropertyChange(propId: string): void {
    this.selectedPropId = propId;
    this.itemForm.show = false;
    this.movementForm.itemId = null;
    this.loadItems();
    this.loadMovements();
  }

  loadItems(): void {
    if (!this.selectedPropId) return;
    this.itemsLoading.set(true);
    this.http.get<LinenItem[]>(`${this.base}/admin/linen/items`, { params: { beds24PropertyId: this.selectedPropId } }).subscribe({
      next: items => { this.items.set(items); this.itemsLoading.set(false); },
      error: () => this.itemsLoading.set(false)
    });
  }

  loadMovements(): void {
    if (!this.selectedPropId) return;
    this.movementsLoading.set(true);
    this.http.get<LinenMovement[]>(`${this.base}/admin/linen/movements`, { params: { beds24PropertyId: this.selectedPropId } }).subscribe({
      next: mvs => { this.movements.set(mvs); this.movementsLoading.set(false); },
      error: () => this.movementsLoading.set(false)
    });
  }

  isAlert(item: LinenItem): boolean {
    return item.minThreshold != null ? item.atProperty < item.minThreshold : item.atProperty === 0 && item.totalQuantity > 0;
  }

  categoryLabel(cat: string): string { return CATEGORY_LABELS[cat] ?? cat; }
  categoryIcon(cat: string): string  { return CATEGORY_ICONS[cat] ?? 'category'; }

  openItemForm(item?: LinenItem): void {
    this.movementForm.itemId = null;
    if (item) {
      this.itemForm = { show: true, editingId: item.id, label: item.label, category: item.category, totalQuantity: item.totalQuantity, minThreshold: item.minThreshold != null ? String(item.minThreshold) : '', defaultPerCleaning: item.defaultPerCleaning != null ? String(item.defaultPerCleaning) : '', saving: false };
    } else {
      this.itemForm = { show: true, editingId: null, label: '', category: 'DRAPS', totalQuantity: 1, minThreshold: '', defaultPerCleaning: '', saving: false };
    }
  }

  cancelItemForm(): void { this.itemForm.show = false; }

  saveItem(): void {
    if (!this.itemForm.label.trim() || !this.selectedPropId) return;
    this.itemForm.saving = true;
    const prop = this.properties().find(p => String(p.id) === this.selectedPropId);
    const payload = {
      beds24PropertyId: this.selectedPropId,
      propertyName: prop?.name ?? '',
      label: this.itemForm.label.trim(),
      category: this.itemForm.category,
      totalQuantity: this.itemForm.totalQuantity,
      minThreshold: this.itemForm.minThreshold ? Number(this.itemForm.minThreshold) : null,
      defaultPerCleaning: this.itemForm.defaultPerCleaning ? Number(this.itemForm.defaultPerCleaning) : null
    };
    const req = this.itemForm.editingId
      ? this.http.put<LinenItem>(`${this.base}/admin/linen/items/${this.itemForm.editingId}`, payload)
      : this.http.post<LinenItem>(`${this.base}/admin/linen/items`, payload);
    req.subscribe({
      next: () => {
        this.itemForm = { ...this.itemForm, show: false, saving: false };
        this.loadItems();
        this.snack.open(this.itemForm.editingId ? 'Article mis à jour' : 'Article ajouté', '', { duration: 2500 });
      },
      error: () => {
        this.itemForm.saving = false;
        this.snack.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteItem(item: LinenItem): void {
    if (!confirm(`Supprimer "${item.label}" et tous ses mouvements ?`)) return;
    this.http.delete(`${this.base}/admin/linen/items/${item.id}`).subscribe({
      next: () => { this.loadItems(); this.loadMovements(); },
      error: () => this.snack.open('Erreur suppression', 'Fermer', { duration: 3000 })
    });
  }

  openMovementForm(item: LinenItem, direction: 'TO_LAUNDRY' | 'FROM_LAUNDRY'): void {
    this.itemForm.show = false;
    this.movementForm = { itemId: item.id, direction, quantity: 1, date: new Date(), notes: '', saving: false };
  }

  closeMovementForm(): void { this.movementForm.itemId = null; }

  saveMovement(): void {
    if (!this.movementForm.itemId || this.movementForm.quantity < 1) return;
    this.movementForm.saving = true;
    const payload = {
      linenItemId:   this.movementForm.itemId,
      direction:     this.movementForm.direction,
      quantity:      this.movementForm.quantity,
      movementDate:  localDateStr(this.movementForm.date),
      notes:         this.movementForm.notes || null
    };
    this.http.post(`${this.base}/admin/linen/movements`, payload).subscribe({
      next: () => {
        this.movementForm.itemId = null;
        this.movementForm.saving = false;
        this.snack.open('Mouvement enregistré', '', { duration: 2000 });
        this.loadItems();
        this.loadMovements();
      },
      error: () => {
        this.movementForm.saving = false;
        this.snack.open('Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteMovement(mv: LinenMovement): void {
    this.http.delete(`${this.base}/admin/linen/movements/${mv.id}`).subscribe({
      next: () => { this.loadItems(); this.loadMovements(); },
      error: () => this.snack.open('Erreur suppression', 'Fermer', { duration: 3000 })
    });
  }
}
