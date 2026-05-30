import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { environment } from '../../../environments/environment';

interface ReportDef {
  id: string;
  label: string;
  category: 'menage' | 'beds24';
  params: ParamDef[];
  endpoint: string;
}

interface ParamDef {
  key: string;
  label: string;
  type: 'date' | 'year' | 'staff' | 'property-id';
}

interface ReportResult {
  type: string;
  title: string;
  headers: string[];
  rows: any[][];
  summary: Record<string, any>;
  generatedAt: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTableModule, MatProgressBarModule, MatSnackBarModule,
    MatTabsModule, MatChipsModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="page-header">
      <h1>Rapports</h1>
      <p class="subtitle">Générez et exportez vos rapports ménage et Beds24 en PDF, Excel ou CSV.</p>
    </div>

    <mat-tab-group animationDuration="200ms">

      <!-- =================== MÉNAGE =================== -->
      <mat-tab label="Ménage">
        <div class="tab-content">
          <div class="report-grid">
            @for (def of menageReports; track def.id) {
              <mat-card class="report-card" [class.selected]="selectedReport()?.id === def.id"
                        (click)="selectReport(def)">
                <mat-card-header>
                  <mat-icon mat-card-avatar>cleaning_services</mat-icon>
                  <mat-card-title>{{ def.label }}</mat-card-title>
                </mat-card-header>
              </mat-card>
            }
          </div>
        </div>
      </mat-tab>

      <!-- =================== BEDS24 =================== -->
      <mat-tab label="Beds24 / CA">
        <div class="tab-content">
          <div class="report-grid">
            @for (def of beds24Reports; track def.id) {
              <mat-card class="report-card" [class.selected]="selectedReport()?.id === def.id"
                        (click)="selectReport(def)">
                <mat-card-header>
                  <mat-icon mat-card-avatar>bar_chart</mat-icon>
                  <mat-card-title>{{ def.label }}</mat-card-title>
                </mat-card-header>
              </mat-card>
            }
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>

    <!-- =================== PANNEAU PARAMÈTRES =================== -->
    @if (selectedReport()) {
      <mat-card class="params-card">
        <mat-card-header>
          <mat-card-title>{{ selectedReport()!.label }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="params-row">
            @for (param of selectedReport()!.params; track param.key) {
              @if (param.type === 'date') {
                <mat-form-field appearance="outline">
                  <mat-label>{{ param.label }}</mat-label>
                  <input matInput [matDatepicker]="datePicker" [(ngModel)]="paramDates[param.key]" (ngModelChange)="paramValues[param.key] = fromDate($event)">
                  <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
                  <mat-datepicker #datePicker></mat-datepicker>
                </mat-form-field>
              }
              @if (param.type === 'year') {
                <mat-form-field appearance="outline">
                  <mat-label>{{ param.label }}</mat-label>
                  <mat-select [(ngModel)]="paramValues[param.key]">
                    @for (y of years; track y) {
                      <mat-option [value]="y">{{ y }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              @if (param.type === 'staff' || param.type === 'property-id') {
                <mat-form-field appearance="outline">
                  <mat-label>{{ param.label }}</mat-label>
                  <input matInput [(ngModel)]="paramValues[param.key]"
                         [placeholder]="param.type === 'staff' ? 'ID agent' : 'ID propriété Beds24'">
                </mat-form-field>
              }
            }
          </div>

          <div class="action-row">
            <button mat-raised-button color="primary" (click)="generate()" [disabled]="loading()">
              <mat-icon>play_arrow</mat-icon>
              Générer
            </button>
            @if (result()) {
              <button mat-stroked-button (click)="download('csv')">
                <mat-icon>download</mat-icon> CSV
              </button>
              <button mat-stroked-button (click)="download('excel')">
                <mat-icon>table_chart</mat-icon> Excel
              </button>
              <button mat-stroked-button (click)="download('pdf')">
                <mat-icon>picture_as_pdf</mat-icon> PDF
              </button>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }

    <!-- =================== RÉSULTATS =================== -->
    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    @if (result()) {
      <mat-card class="result-card">
        <mat-card-header>
          <mat-card-title>{{ result()!.title }}</mat-card-title>
          <mat-card-subtitle>Généré le {{ result()!.generatedAt | date:'dd/MM/yyyy HH:mm' }}</mat-card-subtitle>
        </mat-card-header>

        <!-- Summary chips -->
        @if (result()!.summary) {
          <div class="summary-row">
            @for (entry of summaryEntries(); track entry.key) {
              <mat-chip>{{ entry.label }} : {{ entry.value }}</mat-chip>
            }
          </div>
        }

        <!-- Table -->
        <div class="table-wrapper">
          <table mat-table [dataSource]="result()!.rows">
            @for (col of result()!.headers; track col; let i = $index) {
              <ng-container [matColumnDef]="col">
                <th mat-header-cell *matHeaderCellDef>{{ col }}</th>
                <td mat-cell *matCellDef="let row">{{ row[i] }}</td>
              </ng-container>
            }
            <tr mat-header-row *matHeaderRowDef="result()!.headers"></tr>
            <tr mat-row *matRowDef="let row; columns: result()!.headers;"></tr>
          </table>
        </div>

        <mat-card-footer>
          <span class="row-count">{{ result()!.rows.length }} ligne(s)</span>
        </mat-card-footer>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .subtitle { margin: 4px 0 0; color: #666; }

    .tab-content { padding: 20px 0; }
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    .report-card {
      cursor: pointer;
      transition: box-shadow 0.2s, border 0.2s;
      border: 2px solid transparent;
    }
    .report-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .report-card.selected { border-color: #3f51b5; box-shadow: 0 4px 12px rgba(63,81,181,0.3); }

    .params-card { margin: 20px 0; }
    .params-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 16px 0;
    }
    .params-row mat-form-field { flex: 1; min-width: 180px; max-width: 260px; }
    .action-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .result-card { margin-top: 20px; }
    .summary-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px;
    }
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; }
    th { background: #f5f5f5; font-weight: 600; }
    .row-count { padding: 8px 16px; color: #666; font-size: 13px; }
  `]
})
export class ReportsComponent {
  private apiBase = environment.apiUrl + '/admin/reports';

  loading = signal(false);
  result = signal<ReportResult | null>(null);
  selectedReport = signal<ReportDef | null>(null);
  paramValues: Record<string, any> = {};
  paramDates: Record<string, Date | null> = {};

  years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  menageReports: ReportDef[] = [
    {
      id: 'HK_MONTH_BY_STAFF',
      label: 'Tâches par agent (période)',
      category: 'menage',
      endpoint: '/hk/month-by-staff',
      params: [
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    },
    {
      id: 'HK_ANNUAL_BY_PROPERTY',
      label: 'Résumé annuel par propriété',
      category: 'menage',
      endpoint: '/hk/annual-by-property',
      params: [{ key: 'year', label: 'Année', type: 'year' }]
    },
    {
      id: 'HK_ANNUAL_DETAIL',
      label: 'Détail complet annuel',
      category: 'menage',
      endpoint: '/hk/annual-detail',
      params: [{ key: 'year', label: 'Année', type: 'year' }]
    },
    {
      id: 'HK_BY_STAFF',
      label: 'Tâches d\'un agent',
      category: 'menage',
      endpoint: '/hk/by-staff',
      params: [
        { key: 'staffId', label: 'ID Agent', type: 'staff' },
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    },
    {
      id: 'HK_BY_PROPERTY',
      label: 'Tâches d\'une propriété',
      category: 'menage',
      endpoint: '/hk/by-property',
      params: [
        { key: 'beds24PropertyId', label: 'ID Propriété', type: 'property-id' },
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    }
  ];

  beds24Reports: ReportDef[] = [
    {
      id: 'B24_CA_ANNUAL',
      label: 'CA mensuel annuel',
      category: 'beds24',
      endpoint: '/b24/ca-annual',
      params: [{ key: 'year', label: 'Année', type: 'year' }]
    },
    {
      id: 'B24_CA_ANNUAL_PROPERTY',
      label: 'CA annuel par propriété',
      category: 'beds24',
      endpoint: '/b24/ca-annual-by-property',
      params: [{ key: 'year', label: 'Année', type: 'year' }]
    },
    {
      id: 'B24_CA_PROPERTY',
      label: 'CA d\'une propriété (période)',
      category: 'beds24',
      endpoint: '/b24/ca-by-property',
      params: [
        { key: 'propId', label: 'ID Propriété', type: 'property-id' },
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    },
    {
      id: 'B24_STATS_PLATFORM',
      label: 'Stats par plateforme',
      category: 'beds24',
      endpoint: '/b24/stats-platform',
      params: [
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    },
    {
      id: 'B24_OCCUPANCY',
      label: 'Taux d\'occupation',
      category: 'beds24',
      endpoint: '/b24/occupancy',
      params: [
        { key: 'from', label: 'Du', type: 'date' },
        { key: 'to', label: 'Au', type: 'date' }
      ]
    }
  ];

  summaryEntries = computed(() => {
    const s = this.result()?.summary;
    if (!s) return [];
    const labels: Record<string, string> = {
      totalTaches: 'Tâches',
      terminees: 'Terminées',
      enAttente: 'En attente',
      coutTotal: 'Coût total (€)',
      totalReservations: 'Réservations',
      caTotal: 'CA total (€)',
      periodeDays: 'Jours'
    };
    return Object.entries(s).map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value
    }));
  });

  constructor(private http: HttpClient, private snack: MatSnackBar) {
    // Init default year
    const currentYear = new Date().getFullYear();
    this.paramValues['year'] = currentYear;
  }

  selectReport(def: ReportDef): void {
    this.selectedReport.set(def);
    this.result.set(null);
    this.paramDates = {};
    if (!this.paramValues['year']) {
      this.paramValues['year'] = new Date().getFullYear();
    }
  }

  generate(): void {
    const def = this.selectedReport();
    if (!def) return;

    const params = this.buildParams(def);
    if (!params) return;

    this.loading.set(true);
    this.result.set(null);

    this.http.get<ReportResult>(this.apiBase + def.endpoint, { params }).subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(err.error?.error ?? 'Erreur lors de la génération', 'Fermer', { duration: 4000 });
      }
    });
  }

  download(format: 'csv' | 'excel' | 'pdf'): void {
    const def = this.selectedReport();
    if (!def) return;

    const params = this.buildParams(def);
    if (!params) return;

    const queryString = new URLSearchParams({ ...params, format }).toString();
    const url = this.apiBase + def.endpoint + '/export?' + queryString;

    // Trigger download via a temporary link
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const ext = format === 'pdf' ? '.pdf' : format === 'excel' ? '.xlsx' : '.csv';
        const filename = def.id.toLowerCase() + ext;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => this.snack.open('Erreur lors de l\'export', 'Fermer', { duration: 4000 })
    });
  }

  private buildParams(def: ReportDef): Record<string, string> | null {
    const out: Record<string, string> = {};
    for (const p of def.params) {
      const val = this.paramValues[p.key];
      if (!val && val !== 0) {
        this.snack.open('Veuillez renseigner : ' + p.label, 'Fermer', { duration: 3000 });
        return null;
      }
      out[p.key] = String(val);
    }
    return out;
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
