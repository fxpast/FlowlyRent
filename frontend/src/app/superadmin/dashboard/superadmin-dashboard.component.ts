import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { environment } from '@env/environment';

interface Stats {
  totalUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  loginsLast7Days: number;
  loginsLast30Days: number;
  clicksLast7Days: number;
  clicksLast30Days: number;
  anonymousVisitsLast7Days: number;
  anonymousVisitsLast30Days: number;
  topPages: { page: string; count: number }[];
  userGrowthLast30Days: { date: string; count: number }[];
  loginsChartLast30Days: { date: string; count: number }[];
}

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTableModule, MatButtonToggleModule],
  template: `
    <h2>Dashboard Admin</h2>

    @if (error()) {
      <div class="error-state">
        <mat-icon>lock</mat-icon>
        <p>Accès refusé — vérifiez que votre compte a bien le rôle ADMIN, puis reconnectez-vous.</p>
      </div>
    } @else if (!stats()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {
      <div class="period-toggle">
        <mat-button-toggle-group [(value)]="period" (change)="onPeriodChange()">
          <mat-button-toggle value="7">7 jours</mat-button-toggle>
          <mat-button-toggle value="30">30 jours</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <mat-card class="kpi-card">
          <div class="kpi-icon blue"><mat-icon>group_add</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ period === '7' ? stats()!.newUsersLast7Days : stats()!.newUsersLast30Days }}</div>
            <div class="kpi-label">Nouveaux utilisateurs</div>
            <div class="kpi-sub">Total : {{ stats()!.totalUsers }}</div>
          </div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-icon green"><mat-icon>login</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ period === '7' ? stats()!.loginsLast7Days : stats()!.loginsLast30Days }}</div>
            <div class="kpi-label">Connexions</div>
            <div class="kpi-sub">Sur {{ period }} jours</div>
          </div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-icon orange"><mat-icon>ads_click</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ period === '7' ? stats()!.clicksLast7Days : stats()!.clicksLast30Days }}</div>
            <div class="kpi-label">Clicks</div>
            <div class="kpi-sub">Sur {{ period }} jours</div>
          </div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-icon purple"><mat-icon>visibility</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ period === '7' ? stats()!.anonymousVisitsLast7Days : stats()!.anonymousVisitsLast30Days }}</div>
            <div class="kpi-label">Visiteurs anonymes</div>
            <div class="kpi-sub">flowlyrent.com — {{ period }} jours</div>
          </div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-icon teal"><mat-icon>star</mat-icon></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ topPageName() }}</div>
            <div class="kpi-label">Page la plus consultée</div>
            <div class="kpi-sub">{{ stats()!.topPages[0].count || 0 }} vues</div>
          </div>
        </mat-card>
      </div>

      <!-- Top Pages -->
      <div class="section-row">
        <mat-card class="table-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>bar_chart</mat-icon>
            <mat-card-title>Pages les plus consultées <span class="period-badge">(30j)</span></mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (stats()!.topPages.length === 0) {
              <p class="empty">Aucune donnée encore collectée.</p>
            } @else {
              <table mat-table [dataSource]="stats()!.topPages" class="full-width">
                <ng-container matColumnDef="rank">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="page">
                  <th mat-header-cell *matHeaderCellDef>Page</th>
                  <td mat-cell *matCellDef="let row"><code>{{ row.page }}</code></td>
                </ng-container>
                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef>Vues</th>
                  <td mat-cell *matCellDef="let row"><strong>{{ row.count }}</strong></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['rank','page','count']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['rank','page','count']"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>

        <!-- Croissance utilisateurs -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>trending_up</mat-icon>
            <mat-card-title>Nouveaux utilisateurs <span class="period-badge">(30j)</span></mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (stats()!.userGrowthLast30Days.length === 0) {
              <p class="empty">Aucune donnée encore collectée.</p>
            } @else {
              <div class="mini-chart">
                @for (d of stats()!.userGrowthLast30Days; track d.date) {
                  <div class="bar-item">
                    <div class="bar" [style.height.px]="barHeight(d.count, stats()!.userGrowthLast30Days)" title="{{ d.date }}: {{ d.count }}"></div>
                    <span class="bar-label">{{ d.count }}</span>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    h2 { margin: 0 0 24px; font-size: 24px; font-weight: 500; }
    .loading { display: flex; justify-content: center; margin-top: 80px; }
    .error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 80px; color: #c62828; }
    .error-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .error-state p { font-size: 15px; text-align: center; max-width: 400px; }
    .period-toggle { margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 28px; }
    .kpi-card { display: flex; flex-direction: row; align-items: center; padding: 20px; gap: 16px; }
    .kpi-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: white; }
    .kpi-icon.blue   { background: #1976d2; }
    .kpi-icon.green  { background: #388e3c; }
    .kpi-icon.orange { background: #f57c00; }
    .kpi-icon.purple { background: #7b1fa2; }
    .kpi-icon.teal   { background: #00695c; }
    .kpi-value { font-size: 32px; font-weight: 800; line-height: 1; color: #1a1a1a; }
    .kpi-label { font-size: 13px; color: #555; margin-top: 4px; font-weight: 500; }
    .kpi-sub { font-size: 12px; color: #999; margin-top: 2px; }
    .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .table-card { overflow: hidden; }
    mat-card-content { padding-top: 12px; }
    .full-width { width: 100%; }
    code { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .empty { color: #999; font-size: 14px; text-align: center; padding: 24px 0; }
    .period-badge { font-size: 12px; font-weight: 400; color: #999; margin-left: 6px; }
    .mini-chart { display: flex; align-items: flex-end; gap: 4px; height: 80px; padding: 8px 0; }
    .bar-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .bar { width: 100%; background: #1976d2; border-radius: 3px 3px 0 0; min-height: 2px; }
    .bar-label { font-size: 10px; color: #666; margin-top: 2px; }
    @media (max-width: 768px) { .section-row { grid-template-columns: 1fr; } }
  `]
})
export class SuperadminDashboardComponent implements OnInit {
  stats = signal<Stats | null>(null);
  error = signal(false);
  period = '30';

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  onPeriodChange(): void {}

  private load(): void {
    this.http.get<Stats>(`${environment.apiUrl}/superadmin/stats`).subscribe({
      next: s => this.stats.set(s),
      error: () => this.error.set(true)
    });
  }

  topPageName(): string {
    const page = this.stats()?.topPages[0]?.page;
    if (!page) return '—';
    const parts = page.split('/');
    return parts[parts.length - 1] || page;
  }

  barHeight(value: number, data: { count: number }[]): number {
    const max = Math.max(...data.map(d => d.count), 1);
    return Math.round((value / max) * 60) + 4;
  }
}
