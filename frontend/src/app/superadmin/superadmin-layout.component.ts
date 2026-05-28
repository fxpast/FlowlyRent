import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule],
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
      <button mat-icon-button routerLink="/superadmin/feedbacks" matTooltip="Feedbacks">
        <mat-icon>rate_review</mat-icon>
      </button>
      <button mat-stroked-button (click)="logout()" style="margin-left:16px;color:white;border-color:rgba(255,255,255,.5)">
        <mat-icon>logout</mat-icon> Déconnexion
      </button>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .toolbar { gap: 12px; }
    .toolbar-logo { height: 36px; width: auto; filter: brightness(0) invert(1); }
    .admin-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
      background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;
      text-transform: uppercase;
    }
    .spacer { flex: 1; }
    .content { padding: 32px; max-width: 1200px; margin: 0 auto; }
  `]
})
export class SuperadminLayoutComponent {
  constructor(private auth: AuthService) {}
  logout(): void { this.auth.logout(); }
}
