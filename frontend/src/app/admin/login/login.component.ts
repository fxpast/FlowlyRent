import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
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
              <mat-label>Utilisateur</mat-label>
              <input matInput [(ngModel)]="username" name="username" required autocomplete="username">
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
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
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
    .login-card { width: 380px; padding: 24px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .error { color: #f44336; margin-bottom: 12px; }
    mat-card-header { margin-bottom: 24px; }
    mat-icon[mat-card-avatar] { font-size: 40px; width: 40px; height: 40px; color: #1a237e; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/admin/dashboard']),
      error: () => {
        this.error.set('Identifiants incorrects');
        this.loading.set(false);
      }
    });
  }
}
