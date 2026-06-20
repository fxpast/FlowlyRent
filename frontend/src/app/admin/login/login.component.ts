import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { LangSwitcherComponent } from '../../core/components/lang-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslateModule, LangSwitcherComponent],
  template: `
    <div class="login-container">
      <div class="top-bar">
        <a mat-button routerLink="/public/home" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
          <span class="back-label">{{ 'public.home_title_short' | translate }}</span>
        </a>
        <app-lang-switcher />
      </div>
      <mat-card class="login-card">
        <div class="login-logo">
          <img src="assets/logo.svg" alt="FlowlyRent" />
        </div>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'login.email' | translate }}</mat-label>
              <input matInput type="email" [(ngModel)]="username" name="email" required autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'login.password' | translate }}</mat-label>
              <input matInput [(ngModel)]="password" name="password" type="password" required autocomplete="current-password">
              <mat-icon matSuffix>lock</mat-icon>
            </mat-form-field>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="loading()">
              @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
              @else { {{ 'login.sign_in' | translate }} }
            </button>
          </form>
        </mat-card-content>
        @if (loginType !== 'housekeeper') {
          <mat-card-footer class="footer">
            {{ 'login.no_account' | translate }}
            <a routerLink="/admin/register">{{ 'login.sign_up' | translate }}</a>
          </mat-card-footer>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      position: relative;
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
      padding: 72px 16px 24px;
    }
    .top-bar {
      position: absolute; top: 0; left: 0; right: 0;
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 8px;
    }
    .back-btn { color: white; display: flex; align-items: center; gap: 2px; }
    .login-card { width: 380px; max-width: 100%; padding: 24px; }
    .login-logo { text-align: center; padding: 16px 0 24px; }
    .login-logo img { width: 200px; height: auto; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .error { color: #f44336; margin-bottom: 12px; }
    .footer { padding: 16px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
    .footer a { color: #0288d1; font-weight: 500; text-decoration: none; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
    @media (max-width: 480px) { .back-label { display: none; } }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  get loginType(): string {
    return this.route.snapshot.queryParamMap.get('type') ?? '';
  }

  constructor(
    private auth: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;
    if (this.auth.isAdmin()) { this.router.navigate(['/superadmin/dashboard']); return; }
    if (this.auth.isHousekeeper()) { this.router.navigate(['/housekeeper/tasks']); return; }
    this.redirectOwner();
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        if (this.auth.isAdmin()) {
          this.router.navigate(['/superadmin/dashboard']);
          return;
        }
        const type = this.loginType;
        if (type === 'housekeeper') {
          if (!this.auth.isHousekeeper()) {
            this.rejectLogin('login.error_not_housekeeper');
            return;
          }
          this.router.navigate(['/housekeeper/tasks']);
          return;
        }
        if (type === 'owner') {
          if (this.auth.isHousekeeper()) {
            this.rejectLogin('login.error_not_owner');
            return;
          }
          this.redirectOwner();
          return;
        }
        // Fallback sans paramètre type (accès direct à /admin/login)
        if (this.auth.isHousekeeper()) {
          this.router.navigate(['/housekeeper/tasks']);
          return;
        }
        this.redirectOwner();
      },
      error: () => {
        this.error.set(this.t.instant('login.error'));
        this.loading.set(false);
      }
    });
  }

  private redirectOwner(): void {
    if (!this.auth.getChannelType()) {
      this.router.navigate(['/admin/onboarding']);
      return;
    }
    if (this.auth.isIcal()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.userService.getBeds24Status().subscribe({
      next: status => this.router.navigate([status.connected ? '/admin/dashboard' : '/admin/settings']),
      error: () => this.router.navigate(['/admin/settings'])
    });
  }

  private rejectLogin(errorKey: string): void {
    localStorage.removeItem('flr_token');
    localStorage.removeItem('flr_user');
    this.auth.isLoggedIn.set(false);
    this.error.set(this.t.instant(errorKey));
    this.loading.set(false);
  }
}
