import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvoiceService } from '../../core/services/invoice.service';
import { UserService } from '../../core/services/user.service';
import { Invoice, InvoiceStatus } from '../../core/models/invoice.model';
import { generateInvoicePdf } from '../invoice-editor/invoice-pdf';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatTableModule, MatChipsModule,
    MatSelectModule, MatFormFieldModule, MatSnackBarModule,
    MatTooltipModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h2>Factures</h2>
      <button mat-flat-button color="primary" (click)="newInvoice()">
        <mat-icon>add</mat-icon> Nouvelle facture
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Statut</mat-label>
        <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
          <mat-option value="">Tous</mat-option>
          <mat-option value="DRAFT">Brouillon</mat-option>
          <mat-option value="ISSUED">Émise</mat-option>
          <mat-option value="PAID">Payée</mat-option>
          <mat-option value="CANCELLED">Annulée</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="40"/></div>
    } @else if (invoices().length === 0) {
      <div class="empty-state">
        <mat-icon>receipt_long</mat-icon>
        <p>Aucune facture</p>
        <button mat-flat-button color="primary" (click)="newInvoice()">Créer la première facture</button>
      </div>
    } @else {
      <div class="invoice-list">
        @for (inv of invoices(); track inv.id) {
          <div class="invoice-row" (click)="openInvoice(inv)">
            <div class="inv-number">{{ inv.invoiceNumber }}</div>
            <div class="inv-date">{{ inv.issueDate | date:'dd/MM/yyyy' }}</div>
            <div class="inv-guest">{{ inv.guestName || '—' }}</div>
            <div class="inv-total">{{ totalTTC(inv) | number:'1.2-2' }} €</div>
            <div class="inv-status">
              <span class="status-chip" [class]="'status-' + inv.status.toLowerCase()">
                {{ statusLabel(inv.status) }}
              </span>
            </div>
            <div class="inv-actions" (click)="$event.stopPropagation()">
              <button mat-icon-button matTooltip="Télécharger PDF"
                      (click)="downloadPdf(inv, $event)">
                <mat-icon>picture_as_pdf</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Supprimer" color="warn"
                      (click)="deleteInvoice(inv, $event)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    h2 { margin: 0; font-size: 24px; font-weight: 500; }
    .filters { margin-bottom: 16px; }
    .filters mat-form-field { width: 200px; }
    .center-spin { display: flex; justify-content: center; padding: 60px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 24px; color: #aaa; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { font-size: 16px; margin: 0; }
    .invoice-list { display: flex; flex-direction: column; gap: 4px; }
    .invoice-row { display: grid; grid-template-columns: 120px 1fr 2fr 120px 120px 80px;
      align-items: center; gap: 12px; padding: 12px 16px;
      background: white; border: 1px solid #e8e8e8; border-radius: 8px; cursor: pointer;
      transition: box-shadow 0.15s; }
    .invoice-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .inv-number { font-weight: 600; color: #1976d2; font-size: 14px; }
    .inv-date { font-size: 13px; color: #666; }
    .inv-guest { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .inv-total { font-weight: 600; text-align: right; font-size: 14px; }
    .inv-status { display: flex; justify-content: center; }
    .inv-actions { display: flex; justify-content: flex-end; }
    .status-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
    .status-draft     { background: #f5f5f5; color: #757575; }
    .status-issued    { background: #e3f2fd; color: #0277bd; }
    .status-paid      { background: #e8f5e9; color: #2e7d32; }
    .status-cancelled { background: #fce4ec; color: #c62828; }
    @media (max-width: 600px) {
      .invoice-row { grid-template-columns: 1fr 1fr; }
      .inv-date, .inv-actions { display: none; }
    }
  `]
})
export class InvoicesComponent implements OnInit {
  loading  = signal(true);
  invoices = signal<Invoice[]>([]);
  filterStatus = '';
  private userProfile: any = null;

  constructor(
    private invoiceService: InvoiceService,
    private userService: UserService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe(p => this.userProfile = p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.invoiceService.getAll(this.filterStatus || undefined).subscribe({
      next: list => { this.invoices.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  newInvoice(): void { this.router.navigate(['/admin/invoices/new']); }

  openInvoice(inv: Invoice): void { this.router.navigate(['/admin/invoices', inv.id]); }

  totalTTC(inv: Invoice): number {
    return (inv.lines ?? []).reduce((sum, l) => {
      const ht = (l.quantity ?? 0) * (l.unitPrice ?? 0);
      return sum + ht + ht * ((l.vatRate ?? 0) / 100);
    }, 0);
  }

  statusLabel(s: InvoiceStatus): string {
    const m: Record<string, string> = { DRAFT: 'Brouillon', ISSUED: 'Émise', PAID: 'Payée', CANCELLED: 'Annulée' };
    return m[s] ?? s;
  }

  downloadPdf(inv: Invoice, e: Event): void {
    e.stopPropagation();
    generateInvoicePdf(inv, this.userProfile);
  }

  deleteInvoice(inv: Invoice, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Supprimer la facture ${inv.invoiceNumber} ?`)) return;
    this.invoiceService.delete(inv.id!).subscribe({
      next: () => {
        this.invoices.update(list => list.filter(i => i.id !== inv.id));
        this.snackBar.open('Facture supprimée', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 })
    });
  }
}
