import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, NavigationEnd, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../core/components/lang-switcher.component';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { filter } from 'rxjs';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatBadgeModule, TranslateModule, LangSwitcherComponent],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <img src="assets/logo.svg" alt="FlowlyRent" class="toolbar-logo" />
      <span class="admin-badge">Admin</span>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/superadmin/dashboard" matTooltip="Dashboard">
        <mat-icon>dashboard</mat-icon>
      </button>
      <button mat-icon-button routerLink="/superadmin/users" matTooltip="Utilisateurs">
        <mat-icon>group</mat-icon>
      </button>
      <button mat-icon-button routerLink="/superadmin/feedbacks" matTooltip="Feedbacks"
              [matBadge]="newFeedbackCount() || null" matBadgeColor="warn" matBadgeSize="small">
        <mat-icon>rate_review</mat-icon>
      </button>
      <button mat-icon-button routerLink="/superadmin/notifications" matTooltip="Notifications utilisateurs">
        <mat-icon>campaign</mat-icon>
      </button>
      <button mat-icon-button routerLink="/superadmin/faq" matTooltip="FAQ">
        <mat-icon>quiz</mat-icon>
      </button>
      <app-lang-switcher />
      <button mat-icon-button (click)="logout()" class="logout-icon-btn" [matTooltip]="'common.logout' | translate">
        <mat-icon>logout</mat-icon>
      </button>
      <button mat-stroked-button (click)="logout()" class="logout-text-btn">
        <mat-icon>logout</mat-icon> {{ 'common.logout' | translate }}
      </button>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .toolbar { gap: 8px; }
    .toolbar-logo { height: 36px; width: auto; filter: brightness(0) invert(1); }
    .admin-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
      background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;
      text-transform: uppercase;
    }
    .spacer { flex: 1; }
    .logout-icon-btn { display: none; color: white; }
    .logout-text-btn { margin-left: 8px; color: white; border-color: rgba(255,255,255,.5); }
    .content { padding: 32px; max-width: 1200px; margin: 0 auto; }
    @media (max-width: 700px) {
      .toolbar-logo { display: none; }
      .admin-badge { display: none; }
      .logout-text-btn { display: none; }
      .logout-icon-btn { display: inline-flex; }
    }
  `]
})
export class SuperadminLayoutComponent implements OnInit {
  newFeedbackCount = signal<number>(0);

  constructor(private auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadFeedbackCount();
    // Recharger le count quand on quitte la page feedbacks
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      if (!e.url.includes('/feedbacks')) this.loadFeedbackCount();
    });
  }

  private loadFeedbackCount(): void {
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/feedbacks`).subscribe({
      next: list => this.newFeedbackCount.set(list.filter(f => f.status === 'NEW').length),
      error: () => {}
    });
  }

  logout(): void { this.auth.logout(); }
}
