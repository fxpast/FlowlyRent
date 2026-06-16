import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextFieldModule } from '@angular/cdk/text-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { UserService } from '../../core/services/user.service';
import { BookingService } from '../../core/services/booking.service';
import { Invoice, InvoiceLine, InvoiceLineType, InvoiceStatus } from '../../core/models/invoice.model';
import { generateInvoicePdf, totalHT, totalTTC } from './invoice-pdf';

interface LineForm {
  id?: number;
  lineType: InvoiceLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

@Component({
  selector: 'app-invoice-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule,
    MatTooltipModule, TextFieldModule, TranslateModule
  ],
  template: `
    <div class="editor-wrap">

      <div class="editor-header">
        <button mat-icon-button (click)="goBack()" [matTooltip]="'invoices.back_tooltip' | translate">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-title">
          @if (invoice()?.invoiceNumber) {
            <span class="inv-num">{{ invoice()!.invoiceNumber }}</span>
          } @else {
            <span class="inv-num new">{{ 'invoices.new' | translate }}</span>
          }
          @if (invoice()?.status) {
            <span class="status-chip" [class]="'status-' + invoice()!.status.toLowerCase()">
              {{ statusLabel(invoice()!.status) }}
            </span>
          }
        </div>
        <div class="header-actions">
          @if (invoice()?.id && invoice()?.status === 'DRAFT') {
            <button mat-stroked-button (click)="changeStatus('ISSUED')">
              <mat-icon>send</mat-icon> {{ 'invoices.issue_action' | translate }}
            </button>
          }
          @if (invoice()?.id && invoice()?.status === 'ISSUED') {
            <button mat-stroked-button color="accent" (click)="changeStatus('PAID')">
              <mat-icon>check_circle</mat-icon> {{ 'invoices.mark_paid' | translate }}
            </button>
          }
          @if (invoice()?.id) {
            <button mat-stroked-button (click)="downloadPdf()" [disabled]="!invoice()?.lines?.length">
              <mat-icon>picture_as_pdf</mat-icon> PDF
            </button>
          }
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon> {{ saveLabel() }}
          </button>
        </div>
      </div>

      <mat-divider/>

      <div class="editor-body">

        <!-- Colonne gauche : client + dates -->
        <div class="col-main">

          <div class="section-title">
            <mat-icon>person</mat-icon> {{ 'invoices.section_client' | translate }}
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'invoices.client_name' | translate }}</mat-label>
            <input matInput [(ngModel)]="form.guestName">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'common.email' | translate }}</mat-label>
            <input matInput [(ngModel)]="form.guestEmail" type="email">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'invoices.client_address' | translate }}</mat-label>
            <textarea matInput rows="2" [(ngModel)]="form.guestAddress"></textarea>
          </mat-form-field>

          <div class="section-title" style="margin-top:16px">
            <mat-icon>calendar_today</mat-icon> {{ 'invoices.section_dates' | translate }}
          </div>
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'invoices.issue_date' | translate }}</mat-label>
              <input matInput [matDatepicker]="issuePicker" [(ngModel)]="issueDateObj">
              <mat-datepicker-toggle matIconSuffix [for]="issuePicker"/>
              <mat-datepicker #issuePicker/>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'invoices.due_date' | translate }}</mat-label>
              <input matInput [matDatepicker]="duePicker" [(ngModel)]="dueDateObj">
              <mat-datepicker-toggle matIconSuffix [for]="duePicker"/>
              <mat-datepicker #duePicker/>
            </mat-form-field>
          </div>

          @if (form.beds24BookingId) {
            <div class="ref-chip">
              <mat-icon>link</mat-icon> {{ 'invoices.booking_ref' | translate:{ id: form.beds24BookingId } }}
            </div>
          }

          <div class="section-title" style="margin-top:16px">
            <mat-icon>home</mat-icon> {{ 'invoices.section_property' | translate }}
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'invoices.property_label' | translate }}</mat-label>
            <mat-select [(ngModel)]="form.beds24PropertyId">
              <mat-option value="">{{ 'invoices.no_property' | translate }}</mat-option>
              @for (p of properties(); track p['id']) {
                <mat-option [value]="'' + p['id']">{{ p['name'] || p['id'] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

        </div>

        <!-- Colonne droite : aperçu émetteur -->
        <div class="col-side">
          <div class="company-card">
            <div class="section-title"><mat-icon>business</mat-icon> {{ 'invoices.section_issuer' | translate }}</div>
            @if (userProfile()?.companyName) {
              <p class="co-name">{{ userProfile()!.companyName }}</p>
            }
            @if (userProfile()?.companyAddress) {
              <p class="co-addr">{{ userProfile()!.companyAddress }}</p>
            }
            @if (userProfile()?.siret) {
              <p class="co-siret">SIRET : {{ userProfile()!.siret }}</p>
            }
            @if (!userProfile()?.companyName && !userProfile()?.siret) {
              <p class="co-empty">
                <mat-icon>info</mat-icon>
                {{ 'invoices.billing_hint_before' | translate }}<a routerLink="/admin/settings">{{ 'nav.settings' | translate }}</a>{{ 'invoices.billing_hint_after' | translate }}
              </p>
            }
          </div>
        </div>

      </div>

      <!-- Lignes -->
      <div class="lines-section">
        <div class="lines-header">
          <div class="section-title"><mat-icon>list_alt</mat-icon> {{ 'invoices.section_lines' | translate }}</div>
          <button mat-stroked-button (click)="addLine()">
            <mat-icon>add</mat-icon> {{ 'invoices.add_line' | translate }}
          </button>
        </div>

        @if (lines().length === 0) {
          <div class="lines-empty">{{ 'invoices.no_lines' | translate }}</div>
        }

        <div class="lines-table">
          @if (lines().length > 0) {
            <div class="lines-th">
              <span>{{ 'invoices.col_type' | translate }}</span><span class="desc-col">{{ 'invoices.col_description' | translate }}</span>
              <span class="num-col">{{ 'invoices.col_qty' | translate }}</span><span class="num-col">{{ 'invoices.col_unit_ht' | translate }}</span>
              <span class="num-col">{{ 'invoices.col_vat' | translate }}</span><span class="num-col">{{ 'invoices.col_total_ht' | translate }}</span>
              <span></span>
            </div>
          }
          @for (line of lines(); track line; let i = $index) {
            <div class="line-row">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select [(ngModel)]="line.lineType">
                  <mat-option value="BOOKING">{{ 'invoices.line_booking' | translate }}</mat-option>
                  <mat-option value="CLEANING">{{ 'invoices.line_cleaning' | translate }}</mat-option>
                  <mat-option value="TOURIST_TAX">{{ 'invoices.line_tourist_tax' | translate }}</mat-option>
                  <mat-option value="CUSTOM">{{ 'invoices.line_custom' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="desc-col">
                <input matInput [(ngModel)]="line.description" placeholder="Description…">
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="num-col">
                <input matInput type="number" min="0" step="0.5" [(ngModel)]="line.quantity">
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="num-col">
                <input matInput type="number" min="0" step="0.01" [(ngModel)]="line.unitPrice">
                <span matTextSuffix>€</span>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="num-col">
                <mat-select [(ngModel)]="line.vatRate">
                  <mat-option [value]="0">0%</mat-option>
                  <mat-option [value]="5.5">5,5%</mat-option>
                  <mat-option [value]="10">10%</mat-option>
                  <mat-option [value]="20">20%</mat-option>
                </mat-select>
              </mat-form-field>
              <div class="num-col total-ht">
                {{ lineTotal(line) | number:'1.2-2' }} €
              </div>
              <button mat-icon-button color="warn" (click)="removeLine(i)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          }
        </div>

        @if (lines().length > 0) {
          <div class="totals">
            <div class="total-row"><span>{{ 'invoices.total_ht' | translate }}</span><span>{{ computedTotalHT() | number:'1.2-2' }} €</span></div>
            @for (v of vatBreakdown(); track v.rate) {
              <div class="total-row"><span>{{ 'invoices.vat_rate' | translate:{ rate: v.rate } }}</span><span>{{ v.amount | number:'1.2-2' }} €</span></div>
            }
            <mat-divider/>
            <div class="total-row total-ttc"><span>{{ 'invoices.total_ttc' | translate }}</span><span>{{ computedTotalTTC() | number:'1.2-2' }} €</span></div>
          </div>
        }
      </div>

      <!-- Notes -->
      <mat-form-field appearance="outline" class="full notes-field">
        <mat-label>{{ 'invoices.notes_label' | translate }}</mat-label>
        <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="3" [(ngModel)]="form.notes"
                  [placeholder]="'invoices.notes_placeholder' | translate"></textarea>
      </mat-form-field>

    </div>
  `,
  styles: [`
    .editor-wrap { max-width: 900px; margin: 0 auto; }
    .editor-header { display: flex; align-items: center; gap: 12px; padding: 0 0 16px; flex-wrap: wrap; }
    .header-title { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .inv-num { font-size: 18px; font-weight: 600; color: #1976d2; }
    .inv-num.new { color: #555; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .status-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
    .status-draft     { background: #f5f5f5; color: #757575; }
    .status-issued    { background: #e3f2fd; color: #0277bd; }
    .status-paid      { background: #e8f5e9; color: #2e7d32; }
    .status-cancelled { background: #fce4ec; color: #c62828; }
    mat-divider { margin: 0 0 24px; }
    .editor-body { display: grid; grid-template-columns: 1fr 280px; gap: 24px; margin-bottom: 24px; }
    .col-main { display: flex; flex-direction: column; gap: 0; }
    .col-side {}
    .section-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
      color: #1976d2; margin-bottom: 10px; }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .full { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ref-chip { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666;
      background: #f5f5f5; padding: 4px 10px; border-radius: 8px; width: fit-content; margin-top: 8px; }
    .ref-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .company-card { background: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 8px; padding: 16px; }
    .co-name  { font-weight: 600; font-size: 14px; margin: 0 0 4px; }
    .co-addr  { font-size: 12px; color: #555; margin: 0 0 4px; white-space: pre-wrap; line-height: 1.5; }
    .co-siret { font-size: 12px; color: #888; margin: 0; }
    .co-empty { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; margin: 0; }
    .co-empty mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .co-empty a { color: #1976d2; }
    .lines-section { margin-bottom: 24px; }
    .lines-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .lines-empty { font-size: 13px; color: #aaa; padding: 20px; text-align: center;
      background: #fafafa; border: 1px dashed #ddd; border-radius: 8px; }
    .lines-th { display: grid; grid-template-columns: 130px 1fr 70px 90px 70px 90px 40px;
      gap: 8px; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #666; }
    .line-row { display: grid; grid-template-columns: 130px 1fr 70px 90px 70px 90px 40px;
      gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
    .desc-col { overflow: hidden; }
    .num-col { min-width: 0; }
    .total-ht { font-weight: 600; font-size: 13px; text-align: right; padding-right: 4px; }
    .totals { display: flex; flex-direction: column; gap: 4px; max-width: 320px; margin-left: auto; margin-top: 12px; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
    .total-ttc { font-weight: 700; font-size: 15px; color: #1976d2; padding: 6px 0 0; }
    .notes-field { width: 100%; }
    @media (max-width: 700px) {
      .editor-body { grid-template-columns: 1fr; }
      .col-side { order: -1; }
      .lines-th { display: none; }
      .line-row { grid-template-columns: 1fr 1fr; }
      .desc-col { grid-column: 1 / -1; }
    }
  `]
})
export class InvoiceEditorComponent implements OnInit {
  invoice     = signal<Invoice | null>(null);
  loading     = signal(false);
  saving      = signal(false);
  userProfile = signal<any>(null);
  properties  = signal<any[]>([]);

  form = {
    beds24BookingId: '',
    beds24PropertyId: '',
    guestName: '', guestEmail: '', guestAddress: '',
    notes: ''
  };
  issueDateObj: Date = new Date();
  dueDateObj:   Date | null = null;

  private _lines = signal<LineForm[]>([]);
  lines = this._lines.asReadonly();

  computedTotalHT = computed(() =>
    this._lines().reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  );
  computedTotalTTC = computed(() =>
    this._lines().reduce((s, l) => {
      const ht = l.quantity * l.unitPrice;
      return s + ht + ht * (l.vatRate / 100);
    }, 0)
  );
  vatBreakdown = computed(() => {
    const map: Record<number, { base: number; amount: number }> = {};
    for (const l of this._lines()) {
      const ht = l.quantity * l.unitPrice;
      const r  = l.vatRate;
      if (!map[r]) map[r] = { base: 0, amount: 0 };
      map[r].base   += ht;
      map[r].amount += ht * (r / 100);
    }
    return Object.entries(map).map(([r, v]) => ({ rate: Number(r), ...v })).sort((a, b) => a.rate - b.rate);
  });

  constructor(
    private invoiceService: InvoiceService,
    private userService: UserService,
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe(p => this.userProfile.set(p));
    this.bookingService.getPropertiesWithDisplayNames().subscribe(props => this.properties.set(props ?? []));

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.loading.set(true);
      this.invoiceService.getById(Number(id)).subscribe({
        next: inv => { this.loadInvoice(inv); this.loading.set(false); },
        error: ()  => { this.loading.set(false); this.router.navigate(['/admin/invoices']); }
      });
    } else {
      // Pré-remplissage depuis réservation (navigation state)
      const booking = history.state?.booking;
      if (booking) this.prefillFromBooking(booking);
      this.invoice.set({ id: undefined, status: 'DRAFT', issueDate: this.toIso(new Date()), lines: [] });
    }
  }

  private loadInvoice(inv: Invoice): void {
    this.invoice.set(inv);
    this.form.beds24BookingId    = inv.beds24BookingId    ?? '';
    this.form.beds24PropertyId   = inv.beds24PropertyId   ?? '';
    this.form.guestName          = inv.guestName          ?? '';
    this.form.guestEmail      = inv.guestEmail      ?? '';
    this.form.guestAddress    = inv.guestAddress    ?? '';
    this.form.notes           = inv.notes           ?? '';
    this.issueDateObj = inv.issueDate ? new Date(inv.issueDate + 'T12:00:00') : new Date();
    this.dueDateObj   = inv.dueDate   ? new Date(inv.dueDate   + 'T12:00:00') : null;
    this._lines.set((inv.lines ?? []).map(l => ({
      id: l.id,
      lineType:    l.lineType   ?? 'CUSTOM',
      description: l.description ?? '',
      quantity:    l.quantity   ?? 1,
      unitPrice:   l.unitPrice  ?? 0,
      vatRate:     l.vatRate    ?? 0
    })));
  }

  private prefillFromBooking(b: any): void {
    const firstName = b['guestFirstName'] || b['firstName'] || '';
    const lastName  = b['guestLastName']  || b['lastName']  || '';
    this.form.guestName    = (firstName + ' ' + lastName).trim() || b['guestName'] || '';
    this.form.guestEmail   = b['guestEmail'] || b['email'] || '';
    this.form.beds24BookingId = String(b['id'] ?? '');

    const arrival   = (b['arrival']   || '').substring(0, 10);
    const departure = (b['departure'] || '').substring(0, 10);
    const price     = Number(b['totalPrice'] ?? b['price'] ?? 0);

    if (departure) this.issueDateObj = new Date(departure + 'T12:00:00');

    const lines: LineForm[] = [];
    if (price > 0) {
      const nights = arrival && departure
        ? Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000)
        : 1;
      const desc = (arrival && departure)
        ? this.t.instant(nights > 1 ? 'invoices.stay_desc_both' : 'invoices.stay_desc_single', { from: this.frDate(arrival), to: this.frDate(departure), nights })
        : this.t.instant('invoices.stay_default');
      lines.push({ lineType: 'BOOKING', description: desc, quantity: 1, unitPrice: price, vatRate: 0 });
    }

    const tax = Number(b['tax'] ?? b['taxAmount'] ?? 0);
    if (tax > 0) {
      const guests = Number(b['numAdult'] ?? 1);
      const nights = arrival && departure
        ? Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000)
        : 1;
      lines.push({ lineType: 'TOURIST_TAX', description: this.t.instant('invoices.tourist_tax_desc'), quantity: guests * nights, unitPrice: tax / (guests * nights || 1), vatRate: 0 });
    }

    this._lines.set(lines);
  }

  addLine(): void {
    this._lines.update(l => [...l, { lineType: 'CUSTOM', description: '', quantity: 1, unitPrice: 0, vatRate: 0 }]);
  }

  removeLine(i: number): void {
    this._lines.update(l => l.filter((_, idx) => idx !== i));
  }

  lineTotal(l: LineForm): number { return l.quantity * l.unitPrice; }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const payload: Partial<Invoice> = {
      beds24BookingId:  this.form.beds24BookingId  || undefined,
      beds24PropertyId: this.form.beds24PropertyId || undefined,
      guestName:    this.form.guestName,
      guestEmail:   this.form.guestEmail,
      guestAddress: this.form.guestAddress,
      issueDate:    this.toIso(this.issueDateObj),
      dueDate:      this.dueDateObj ? this.toIso(this.dueDateObj) : undefined,
      notes:        this.form.notes,
      lines:        this._lines().map((l, i) => ({ ...l, sortOrder: i })) as InvoiceLine[]
    };

    const id = this.invoice()?.id;
    const req = id
      ? this.invoiceService.update(id, payload)
      : this.invoiceService.create(payload);

    req.subscribe({
      next: inv => {
        this.loadInvoice(inv);
        this.saving.set(false);
        this.snackBar.open(id ? this.t.instant('invoices.saved') : this.t.instant('invoices.created'), this.t.instant('common.ok'), { duration: 2500 });
        if (!id) this.router.navigate(['/admin/invoices', inv.id], { replaceUrl: true });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.t.instant('invoices.save_error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  changeStatus(status: string): void {
    const id = this.invoice()?.id;
    if (!id) return;
    this.invoiceService.updateStatus(id, status).subscribe({
      next: inv => {
        this.invoice.update(i => i ? { ...i, status: inv.status } : i);
        this.snackBar.open(this.t.instant('invoices.status_updated'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 2000 })
    });
  }

  downloadPdf(): void {
    const inv = this.invoice();
    if (!inv) return;
    const current: Invoice = {
      ...inv,
      guestName:       this.form.guestName,
      guestEmail:      this.form.guestEmail,
      guestAddress:    this.form.guestAddress,
      beds24PropertyId: this.form.beds24PropertyId || undefined,
      issueDate:       this.toIso(this.issueDateObj),
      dueDate:         this.dueDateObj ? this.toIso(this.dueDateObj) : undefined,
      notes:           this.form.notes,
      lines:           this._lines().map((l, i) => ({ ...l, sortOrder: i })) as InvoiceLine[]
    };
    generateInvoicePdf(current, this.userProfile(), this.userProfile()?.invoiceFooter);
  }

  selectedPropertyName(): string {
    const id = this.form.beds24PropertyId;
    if (!id) return '';
    const p = this.properties().find(p => String(p['id']) === id);
    return p ? (p['name'] ?? '') : '';
  }

  statusLabel(s: InvoiceStatus): string {
    return this.t.instant('invoices.status_' + s.toLowerCase());
  }

  saveLabel(): string {
    return this.saving() ? '…' : (this.invoice()?.id ? this.t.instant('invoices.save_action') : this.t.instant('invoices.create_action'));
  }

  goBack(): void { this.router.navigate(['/admin/invoices']); }

  private toIso(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private frDate(iso: string): string {
    if (!iso || iso.length < 10) return iso;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
}
