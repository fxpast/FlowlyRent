import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="container">
      <mat-card class="card">
        <mat-card-header>
          <mat-icon mat-card-avatar>home</mat-icon>
          <mat-card-title>FlowlyRent</mat-card-title>
          <mat-card-subtitle>{{ 'login.create_account' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onSubmit()">
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'public.first_name' | translate }}</mat-label>
                <input matInput [(ngModel)]="form.firstName" name="firstName" required autocomplete="given-name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ 'public.last_name' | translate }}</mat-label>
                <input matInput [(ngModel)]="form.lastName" name="lastName" autocomplete="family-name" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full">
              <mat-label>{{ 'common.email' | translate }}</mat-label>
              <input matInput type="email" [(ngModel)]="form.email" name="email" required autocomplete="email" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>{{ 'login.password' | translate }}</mat-label>
              <input matInput [type]="showPwd ? 'text' : 'password'"
                     [(ngModel)]="form.password" name="password" required minlength="8"
                     #pwd="ngModel" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>{{ 'settings.password_hint' | translate }}</mat-hint>
              @if (pwd.errors?.['minlength']) {
                <mat-error>{{ 'settings.password_hint' | translate }}</mat-error>
              }
            </mat-form-field>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }

            <button mat-raised-button color="primary" type="submit" class="full submit-btn"
                    [disabled]="loading() || !form.email || !form.password || !form.firstName || pwd.invalid">
              @if (loading()) { <mat-spinner diameter="20" /> }
              @else { {{ 'login.create_btn' | translate }} }
            </button>
          </form>
        </mat-card-content>

        <mat-card-footer class="footer">
          {{ 'login.have_account' | translate }}
          <a routerLink="/admin/login">{{ 'login.sign_in' | translate }}</a>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100vh; display: flex; justify-content: center; align-items: center;
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
      padding: 24px;
    }
    .card { width: 100%; max-width: 440px; padding: 24px; }
    mat-card-header { margin-bottom: 24px; }
    mat-icon[mat-card-avatar] { font-size: 40px; width: 40px; height: 40px; color: #0288d1; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; }
    .full { width: 100%; }
    .submit-btn { margin-top: 8px; height: 44px; font-size: 15px; }
    .error { color: #d32f2f; font-size: 13px; margin: 0 0 12px; }
    .footer { padding: 16px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
    .footer a { color: #0288d1; font-weight: 500; text-decoration: none; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
  `]
})
export class RegisterComponent {
  form = { firstName: '', lastName: '', email: '', password: '' };
  showPwd = false;
  loading = signal(false);
  error = signal('');

  constructor(private http: HttpClient, private auth: AuthService, private router: Router, private t: TranslateService) {}

  onSubmit(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.post<{ token: string; userId: number; email: string; firstName: string; lastName: string; plan: any; publicSiteSlug: string }>(
      `${environment.apiUrl}/auth/register`, this.form
    ).subscribe({
      next: resp => {
        localStorage.setItem('flr_token', resp.token);
        localStorage.setItem('flr_user', JSON.stringify({
          userId: resp.userId, email: resp.email,
          firstName: resp.firstName, lastName: resp.lastName,
          plan: resp.plan, publicSiteSlug: resp.publicSiteSlug
        }));
        this.auth.isLoggedIn.set(true);
        this.router.navigate(['/admin/dashboard']);
      },
      error: err => {
        this.error.set(err.error?.error ?? this.t.instant('login.register_error'));
        this.loading.set(false);
      }
    });
  }
}
