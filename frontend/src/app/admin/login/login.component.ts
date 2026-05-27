import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>home</mat-icon>
          <mat-card-title>FlowlyRent</mat-card-title>
          <mat-card-subtitle>Administration</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email FlowlyRent</mat-label>
              <input matInput type="email" [(ngModel)]="username" name="email" required autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe FlowlyRent</mat-label>
              <input matInput [(ngModel)]="password" name="password" type="password" required autocomplete="current-password">
              <mat-icon matSuffix>lock</mat-icon>
            </mat-form-field>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="loading()">
              @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
              @else { Connexion }
            </button>
          </form>
        </mat-card-content>
        <mat-card-footer class="footer">
          Pas encore de compte ?
          <a routerLink="/admin/register">S'inscrire gratuitement</a>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex; justify-content: center; align-items: center; height: 100vh;
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
    }
    .login-card { width: 380px; padding: 24px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .error { color: #f44336; margin-bottom: 12px; }
    mat-card-header { margin-bottom: 24px; }
    mat-icon[mat-card-avatar] { font-size: 40px; width: 40px; height: 40px; color: #0288d1; }
    .footer { padding: 16px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
    .footer a { color: #0288d1; font-weight: 500; text-decoration: none; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private userService: UserService, private router: Router) {}

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
        this.userService.getBeds24Status().subscribe({
          next: status => this.router.navigate([status.connected ? '/admin/dashboard' : '/admin/settings']),
          error: () => this.router.navigate(['/admin/dashboard'])
        });
      },
      error: () => {
        this.error.set('Identifiants incorrects');
        this.loading.set(false);
      }
    });
  }
}
