import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { HousekeeperPortalService } from '../../core/services/housekeeper-portal.service';

@Component({
  selector: 'app-housekeeper-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="portal-toolbar">
      <mat-icon style="margin-right:10px">cleaning_services</mat-icon>
      <span class="toolbar-title">{{ name() || 'Mon espace' }}</span>
      <span style="flex:1"></span>
      <button mat-icon-button (click)="logout()" title="Déconnexion">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="portal-body">
      <router-outlet />
    </div>

    <nav class="bottom-nav">
      <a routerLink="tasks" routerLinkActive="active">
        <mat-icon>cleaning_services</mat-icon>
        <span>Missions</span>
      </a>
      <a routerLink="reports" routerLinkActive="active">
        <mat-icon>warning</mat-icon>
        <span>Signalements</span>
      </a>
    </nav>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .portal-toolbar { position: sticky; top: 0; z-index: 100; flex-shrink: 0; }
    .toolbar-title { font-size: 18px; font-weight: 600; }
    .portal-body { flex: 1; max-width: 640px; width: 100%; margin: 0 auto; padding: 16px 16px 80px; box-sizing: border-box; }
    @media (max-width: 680px) { .portal-body { padding: 8px 8px 80px; } }
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
      display: flex; background: white;
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -2px 8px rgba(0,0,0,.08);
    }
    .bottom-nav a {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 8px 0 6px; text-decoration: none; color: #888;
      font-size: 11px; font-weight: 500; gap: 2px; transition: color .15s;
    }
    .bottom-nav a mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .bottom-nav a.active { color: #0288d1; }
    .bottom-nav a.active mat-icon { color: #0288d1; }
  `]
})
export class HousekeeperLayoutComponent implements OnInit {
  name = signal('');

  constructor(private auth: AuthService, private portalService: HousekeeperPortalService) {}

  ngOnInit(): void {
    this.portalService.getMe().subscribe(p => this.name.set(p.name));
  }

  logout(): void {
    this.auth.logout();
  }
}
