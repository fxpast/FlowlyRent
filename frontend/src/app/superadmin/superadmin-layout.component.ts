import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <mat-icon>admin_panel_settings</mat-icon>
      <span class="title">FlowlyRent — Admin</span>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/superadmin/dashboard" matTooltip="Dashboard">
        <mat-icon>dashboard</mat-icon>
      </button>
      <button mat-icon-button routerLink="/superadmin/users" matTooltip="Utilisateurs">
        <mat-icon>group</mat-icon>
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
    .title { font-size: 18px; font-weight: 600; margin-left: 8px; }
    .spacer { flex: 1; }
    .content { padding: 32px; max-width: 1200px; margin: 0 auto; }
  `]
})
export class SuperadminLayoutComponent {
  constructor(private auth: AuthService) {}
  logout(): void { this.auth.logout(); }
}
