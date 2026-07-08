import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env/environment';

interface RewardBadge { key: string; unlocked: boolean; }

interface HostRewards {
  points: number;
  levelKey: string;
  nextLevelThreshold: number;
  badges: RewardBadge[];
}

const BADGE_ICONS: Record<string, string> = {
  beds24_connected:        'sync',
  first_property:          'home_work',
  stripe_connected:        'payments',
  first_promo_code:        'local_offer',
  auto_responder_enabled:  'smart_toy',
  team_built:               'groups',
  site_online:              'public',
  tenure_1m:                'looks_one',
  tenure_3m:                'looks_3',
  tenure_1y:                 'cake'
};

const LEVEL_ICONS: Record<string, string> = {
  BEGINNER:   'emoji_events',
  CONFIRMED:  'military_tech',
  EXPERT:     'workspace_premium',
  AMBASSADOR: 'diamond'
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:   '#a1662f',
  CONFIRMED:  '#9e9e9e',
  EXPERT:     '#f9a825',
  AMBASSADOR: '#42a5f5'
};

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="page-header">
      <mat-icon class="page-icon">emoji_events</mat-icon>
      <h1>{{ 'rewards.title' | translate }}</h1>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    }
    @if (!loading() && rewards(); as r) {
      <mat-card class="points-card" [style.border-left-color]="levelColor(r.levelKey)">
        <mat-icon class="level-icon" [style.color]="levelColor(r.levelKey)">{{ levelIcon(r.levelKey) }}</mat-icon>
        <div class="points-info">
          <div class="points-value">{{ r.points }} {{ 'rewards.points_unit' | translate }}</div>
          <div class="level-label">{{ ('rewards.level_' + r.levelKey) | translate }}</div>
          @if (r.nextLevelThreshold > 0) {
            <div class="level-progress">
              <div class="level-progress-bar" [style.width.%]="levelProgressPct(r)"></div>
            </div>
            <div class="level-next">
              {{ 'rewards.points_to_next_level' | translate: { n: r.nextLevelThreshold - r.points } }}
            </div>
          } @else {
            <div class="level-next">{{ 'rewards.max_level' | translate }}</div>
          }
        </div>
      </mat-card>

      <div class="section-title">
        <mat-icon>military_tech</mat-icon> {{ 'rewards.badges_title' | translate }}
      </div>
      <div class="badge-grid">
        @for (b of r.badges; track b.key) {
          <div class="badge-tile" [class.locked]="!b.unlocked">
            <mat-icon>{{ badgeIcon(b.key) }}</mat-icon>
            <span>{{ ('rewards.badge_' + b.key) | translate }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .page-icon { font-size: 28px; width: 28px; height: 28px; color: #0288d1; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .center { display: flex; justify-content: center; padding: 40px; }

    .points-card {
      display: flex; align-items: center; gap: 16px; padding: 20px 18px;
      border-radius: 12px !important; border-left: 5px solid #ccc; margin-bottom: 24px;
    }
    .level-icon { font-size: 42px; width: 42px; height: 42px; flex-shrink: 0; }
    .points-info { flex: 1; }
    .points-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .level-label { font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .level-progress { height: 6px; background: #eee; border-radius: 3px; margin-top: 10px; overflow: hidden; max-width: 320px; }
    .level-progress-bar { height: 100%; background: #0288d1; border-radius: 3px; transition: width .3s; }
    .level-next { font-size: 12px; color: #999; margin-top: 6px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #333; margin: 8px 0 16px; }
    .section-title mat-icon { color: #0288d1; }

    .badge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
    .badge-tile {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 18px 10px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1);
      text-align: center; font-size: 12px; font-weight: 500; color: #333;
    }
    .badge-tile mat-icon { font-size: 32px; width: 32px; height: 32px; color: #f9a825; }
    .badge-tile.locked { opacity: .35; }
    .badge-tile.locked mat-icon { color: #999; }
  `]
})
export class RewardsComponent implements OnInit {
  loading = signal(true);
  rewards = signal<HostRewards | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<HostRewards>(`${environment.apiUrl}/admin/rewards`).subscribe({
      next: r => { this.rewards.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  badgeIcon(key: string): string { return BADGE_ICONS[key] ?? 'star'; }
  levelIcon(key: string): string { return LEVEL_ICONS[key] ?? 'star'; }
  levelColor(key: string): string { return LEVEL_COLORS[key] ?? '#999'; }

  levelProgressPct(r: HostRewards): number {
    const prevThresholds: Record<string, number> = { BEGINNER: 0, CONFIRMED: 100, EXPERT: 250, AMBASSADOR: 400 };
    const prev = prevThresholds[r.levelKey] ?? 0;
    if (r.nextLevelThreshold <= 0) return 100;
    const span = r.nextLevelThreshold - prev;
    if (span <= 0) return 100;
    return Math.max(0, Math.min(100, ((r.points - prev) / span) * 100));
  }
}
