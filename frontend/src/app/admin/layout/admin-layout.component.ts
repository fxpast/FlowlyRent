import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from '../../core/services/message.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatButtonModule, MatListModule, MatBadgeModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="logo">
          <mat-icon>home</mat-icon>
          <span>FlowlyRent</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.route === 'messages' && unreadCount() > 0) {
                <span class="badge">{{ unreadCount() }}</span>
              }
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          <span class="toolbar-spacer"></span>
          <button mat-icon-button (click)="auth.logout()" title="Déconnexion">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100vh; }
    .sidenav { width: 220px; background: #1a237e; color: white; }
    .logo {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px; font-size: 20px; font-weight: bold;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo mat-icon { font-size: 28px; }
    mat-nav-list a { color: rgba(255,255,255,0.85); margin: 4px 8px; border-radius: 8px; }
    .active-link { background: rgba(255,255,255,0.15) !important; color: white !important; }
    .toolbar-spacer { flex: 1 1 auto; }
    .content { padding: 24px; }
    .badge {
      background: #f44336; color: white; border-radius: 10px;
      padding: 2px 6px; font-size: 11px; font-weight: bold;
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  unreadCount = signal(0);

  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Tableau de bord', route: 'dashboard' },
    { icon: 'event_available', label: 'Arrivées', route: 'arrivals' },
    { icon: 'flight_takeoff', label: 'Départs', route: 'departures' },
    { icon: 'book_online', label: 'Réservations', route: 'bookings' },
    { icon: 'chat', label: 'Messages', route: 'messages' },
    { icon: 'payment', label: 'Paiements', route: 'payments' },
    { icon: 'sync', label: 'Synchronisation', route: 'sync' }
  ];

  constructor(public auth: AuthService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    setInterval(() => this.loadUnreadCount(), 30000);
  }

  private loadUnreadCount(): void {
    this.messageService.getUnreadCount().subscribe(r => this.unreadCount.set(r.count));
  }
}
