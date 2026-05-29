import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { HousekeeperPortalService } from '../../core/services/housekeeper-portal.service';

@Component({
  selector: 'app-housekeeper-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="portal-toolbar">
      <mat-icon style="margin-right:10px">cleaning_services</mat-icon>
      <span class="toolbar-title">Mes missions</span>
      <span style="flex:1"></span>
      <span class="hk-name">{{ name() }}</span>
      <button mat-icon-button (click)="logout()" title="Déconnexion">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>
    <div class="portal-body">
      <router-outlet />
    </div>
  `,
  styles: [`
    .portal-toolbar { position: sticky; top: 0; z-index: 100; }
    .toolbar-title { font-size: 18px; font-weight: 600; }
    .hk-name { font-size: 14px; opacity: 0.85; margin-right: 8px; }
    .portal-body { max-width: 640px; margin: 0 auto; padding: 16px; }
    @media (max-width: 680px) { .portal-body { padding: 8px; } }
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
