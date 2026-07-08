import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HousekeeperPortalService, HousekeeperRewards } from '../../core/services/housekeeper-portal.service';

const BADGE_ICONS: Record<string, string> = {
  first_missions:     'military_tech',
  regular:             'workspace_premium',
  veteran:             'emoji_events',
  zero_incident:       'verified',
  reliable_reporter:   'photo_camera'
};

const LEVEL_ICONS: Record<string, string> = {
  BRONZE:   'workspace_premium',
  SILVER:   'military_tech',
  GOLD:     'emoji_events',
  PLATINUM: 'diamond'
};

const LEVEL_COLORS: Record<string, string> = {
  BRONZE:   '#a1662f',
  SILVER:   '#9e9e9e',
  GOLD:     '#f9a825',
  PLATINUM: '#42a5f5'
};

@Component({
  selector: 'app-housekeeper-rewards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40"/></div>
    }
    @if (!loading() && rewards(); as r) {
      <mat-card class="points-card" [style.border-left-color]="levelColor(r.levelKey)">
        <mat-icon class="level-icon" [style.color]="levelColor(r.levelKey)">{{ levelIcon(r.levelKey) }}</mat-icon>
        <div class="points-info">
          <div class="points-value">{{ r.points }} {{ 'housekeeper.points_unit' | translate }}</div>
          <div class="level-label">{{ ('housekeeper.level_' + r.levelKey) | translate }}</div>
          @if (r.nextLevelThreshold > 0) {
            <div class="level-progress">
              <div class="level-progress-bar" [style.width.%]="levelProgressPct(r)"></div>
            </div>
            <div class="level-next">
              {{ 'housekeeper.points_to_next_level' | translate: { n: r.nextLevelThreshold - r.points } }}
            </div>
          } @else {
            <div class="level-next">{{ 'housekeeper.max_level' | translate }}</div>
          }
        </div>
      </mat-card>

      <div class="section-title">
        <mat-icon>military_tech</mat-icon> {{ 'housekeeper.badges_title' | translate }}
      </div>
      <div class="badge-grid">
        @for (b of r.badges; track b.key) {
          <div class="badge-tile" [class.locked]="!b.unlocked">
            <mat-icon>{{ badgeIcon(b.key) }}</mat-icon>
            <span>{{ ('housekeeper.badge_' + b.key) | translate }}</span>
          </div>
        }
      </div>

      <div class="section-title">
        <mat-icon>leaderboard</mat-icon> {{ 'housekeeper.leaderboard_title' | translate }}
      </div>
      @if (r.leaderboard.length <= 1) {
        <p class="empty-hint">{{ 'housekeeper.no_colleagues' | translate }}</p>
      } @else {
        <mat-card class="leaderboard-card">
          @for (entry of r.leaderboard; track entry.housekeeperId; let i = $index) {
            <div class="leaderboard-row" [class.is-me]="entry.isMe">
              <span class="rank">{{ i + 1 }}</span>
              <span class="lb-name">{{ entry.name }}{{ entry.isMe ? (' — ' + ('housekeeper.you' | translate)) : '' }}</span>
              <span class="lb-points">{{ entry.points }} {{ 'housekeeper.points_unit' | translate }}</span>
            </div>
          }
        </mat-card>
      }
    }
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 40px; }
    .points-card {
      display: flex; align-items: center; gap: 16px; padding: 18px 16px;
      border-radius: 12px !important; border-left: 5px solid #ccc; margin-bottom: 20px;
    }
    .level-icon { font-size: 40px; width: 40px; height: 40px; flex-shrink: 0; }
    .points-info { flex: 1; }
    .points-value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
    .level-label { font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .level-progress { height: 6px; background: #eee; border-radius: 3px; margin-top: 10px; overflow: hidden; }
    .level-progress-bar { height: 100%; background: #0288d1; border-radius: 3px; transition: width .3s; }
    .level-next { font-size: 11px; color: #999; margin-top: 6px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #333; margin: 20px 0 12px; }
    .section-title mat-icon { color: #0288d1; }

    .badge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    .badge-tile {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 14px 8px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1);
      text-align: center; font-size: 11px; font-weight: 500; color: #333;
    }
    .badge-tile mat-icon { font-size: 28px; width: 28px; height: 28px; color: #f9a825; }
    .badge-tile.locked { opacity: .35; }
    .badge-tile.locked mat-icon { color: #999; }

    .empty-hint { text-align: center; color: #999; font-size: 13px; padding: 16px; }
    .leaderboard-card { padding: 4px 0; border-radius: 12px !important; }
    .leaderboard-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; }
    .leaderboard-row:last-child { border-bottom: none; }
    .leaderboard-row.is-me { background: #e3f2fd; }
    .rank { font-weight: 700; color: #888; width: 20px; }
    .lb-name { flex: 1; font-size: 13px; color: #333; }
    .lb-points { font-size: 13px; font-weight: 600; color: #0288d1; }
  `]
})
export class HousekeeperRewardsComponent implements OnInit {
  loading = signal(true);
  rewards = signal<HousekeeperRewards | null>(null);

  constructor(private svc: HousekeeperPortalService, private t: TranslateService) {}

  ngOnInit(): void {
    this.svc.getRewards().subscribe({
      next: r => { this.rewards.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  badgeIcon(key: string): string { return BADGE_ICONS[key] ?? 'star'; }
  levelIcon(key: string): string { return LEVEL_ICONS[key] ?? 'star'; }
  levelColor(key: string): string { return LEVEL_COLORS[key] ?? '#999'; }

  levelProgressPct(r: HousekeeperRewards): number {
    const prevThresholds: Record<string, number> = { BRONZE: 0, SILVER: 100, GOLD: 300, PLATINUM: 700 };
    const prev = prevThresholds[r.levelKey] ?? 0;
    if (r.nextLevelThreshold <= 0) return 100;
    const span = r.nextLevelThreshold - prev;
    if (span <= 0) return 100;
    return Math.max(0, Math.min(100, ((r.points - prev) / span) * 100));
  }
}
