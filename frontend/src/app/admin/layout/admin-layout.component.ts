import { Component, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../../core/components/lang-switcher.component';
import { ChatWidgetComponent } from '../../core/components/chat-widget.component';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from '../../core/services/message.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { environment } from '../../../environments/environment';

interface NavItem { icon: string; label: string; route: string; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatButtonModule, MatListModule, MatBadgeModule,
    TranslateModule, LangSwitcherComponent, ChatWidgetComponent
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="sidenav">
        <div class="logo">
          <img src="assets/logo.svg" alt="FlowlyRent" class="logo-img" />
          @if (isMobile()) {
            <button mat-icon-button class="close-btn" (click)="sidenav.close()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link"
               (click)="isMobile() && sidenav.close()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label | translate }}</span>
              @if (item.route === 'messages' && unreadCount() > 0) {
                <span class="badge">{{ unreadCount() }}</span>
              }
              @if (item.route === 'notifications' && unreadNotifCount() > 0) {
                <span class="badge">{{ unreadNotifCount() }}</span>
              }
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          @if (isMobile()) {
            <img src="assets/logo.svg" alt="FlowlyRent" class="toolbar-logo" />
          }
          <span class="toolbar-spacer"></span>
          <app-lang-switcher />
          <button mat-icon-button (click)="auth.logout()" [title]="'common.logout' | translate">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
        @if (isMobile()) {
          <button mat-fab color="primary" class="nav-fab"
                  (click)="sidenav.toggle()"
                  [title]="sidenav.opened ? 'Fermer le menu' : 'Menu'"
                  [matBadge]="unreadCount() > 0 ? unreadCount().toString() : null"
                  matBadgeColor="warn" matBadgeSize="small">
            <mat-icon>{{ sidenav.opened ? 'close' : 'menu' }}</mat-icon>
          </button>
        }
      </mat-sidenav-content>
    </mat-sidenav-container>
    <app-chat-widget />
  `,
  styles: [`
    .sidenav-container { height: 100vh; }
    .sidenav { width: 220px; background: #0288d1; color: white; }
    .logo {
      display: flex; align-items: center; gap: 10px;
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo-img { width: 160px; height: auto; filter: brightness(0) invert(1); }
    .close-btn { margin-left: auto; color: white; }
    mat-nav-list { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important; }
    mat-nav-list a { color: rgba(255,255,255,0.85); margin: 4px 8px; border-radius: 8px; }
    .active-link { background: rgba(255,255,255,0.15) !important; color: white !important; }
    .toolbar-logo { height: 32px; width: auto; filter: brightness(0) invert(1); }
    .toolbar-spacer { flex: 1 1 auto; }
    .content { padding: 24px; }
    .badge {
      background: #f44336; color: white; border-radius: 10px;
      padding: 2px 6px; font-size: 11px; font-weight: bold;
    }
    .nav-fab {
      position: fixed !important;
      bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      right: 20px;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    }
    @media (max-width: 768px) {
      .content { padding: 16px 12px; }
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  unreadCount = signal(0);
  unreadNotifCount = signal(0);
  isMobile = signal(false);

  private mq = window.matchMedia('(max-width: 768px)');
  private mqListener = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);

  navItems: NavItem[] = [
    { icon: 'dashboard',          label: 'nav.dashboard',   route: 'dashboard' },
    { icon: 'today',              label: 'nav.today',       route: 'today' },
    { icon: 'event_available',   label: 'nav.arrivals',    route: 'arrivals' },
    { icon: 'flight_takeoff',    label: 'nav.departures',  route: 'departures' },
    { icon: 'home_work',          label: 'nav.properties',  route: 'properties' },
    { icon: 'calendar_month',    label: 'nav.calendar',    route: 'calendar' },
    { icon: 'book_online',       label: 'nav.bookings',    route: 'bookings' },
    { icon: 'chat',              label: 'nav.messages',    route: 'messages' },
    { icon: 'smart_toy',        label: 'nav.auto_responder', route: 'auto-responder' },
    { icon: 'home_repair_service', label: 'nav.housekeeping', route: 'housekeeping' },
    { icon: 'notifications',     label: 'nav.notifications', route: 'notifications' },
    { icon: 'receipt_long',       label: 'nav.invoices',    route: 'invoices' },
    { icon: 'account_balance',   label: 'nav.expenses',    route: 'expenses' },
    { icon: 'bar_chart',         label: 'nav.stats',       route: 'stats' },
    { icon: 'trending_up',       label: 'nav.dynamic_pricing', route: 'dynamic-pricing' },
    { icon: 'rate_review',       label: 'nav.feedback',    route: 'feedback' },
    { icon: 'quiz',              label: 'nav.faq',         route: 'faq' },
    { icon: 'settings',          label: 'nav.settings',    route: 'settings' }
  ];

  private msgInterval?: ReturnType<typeof setInterval>;
  private notifInterval?: ReturnType<typeof setInterval>;

  constructor(public auth: AuthService, private messageService: MessageService, private http: HttpClient, private push: PushNotificationService) {}

  ngOnInit(): void {
    this.isMobile.set(this.mq.matches);
    this.mq.addEventListener('change', this.mqListener);
    this.push.init();
    this.loadUnreadCount();
    this.loadUnreadNotifCount();
    this.msgInterval   = setInterval(() => this.loadUnreadCount(), 30000);
    this.notifInterval = setInterval(() => this.loadUnreadNotifCount(), 60000);
  }

  ngOnDestroy(): void {
    this.mq.removeEventListener('change', this.mqListener);
    clearInterval(this.msgInterval);
    clearInterval(this.notifInterval);
  }

  private loadUnreadCount(): void {
    this.messageService.getUnreadCount().subscribe({ next: r => this.unreadCount.set(r.count), error: () => {} });
  }

  private loadUnreadNotifCount(): void {
    this.http.get<{count: number}>(`${environment.apiUrl}/admin/notifications/unread-count`).subscribe({
      next: r => this.unreadNotifCount.set(r.count),
      error: () => {}
    });
  }
}
