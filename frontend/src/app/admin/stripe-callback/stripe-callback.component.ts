import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-stripe-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="page">
      @if (loading()) {
        <mat-spinner></mat-spinner>
        <p>Connexion Stripe en cours…</p>
      } @else if (error()) {
        <span class="material-icons error-icon">error</span>
        <h2>Erreur de connexion Stripe</h2>
        <p class="error-msg">{{ error() }}</p>
        <button mat-flat-button color="primary" (click)="goSettings()">Retour aux paramètres</button>
      } @else {
        <span class="material-icons success-icon">check_circle</span>
        <h2>Stripe connecté !</h2>
        <p>Votre compte Stripe est maintenant lié à FlowlyRent.</p>
        <button mat-flat-button color="primary" (click)="goSettings()">Retour aux paramètres</button>
      }
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      font-family: Roboto, sans-serif; text-align: center; padding: 32px;
    }
    .success-icon { font-size: 72px; color: #43a047; }
    .error-icon   { font-size: 72px; color: #e53935; }
    h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    p  { color: #555; margin: 0; }
    .error-msg { color: #c62828; }
  `]
})
export class StripeCallbackComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const errorParam = this.route.snapshot.queryParamMap.get('error_description')
                    ?? this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      this.error.set(errorParam);
      this.loading.set(false);
      return;
    }
    if (!code) {
      this.error.set('Code OAuth manquant');
      this.loading.set(false);
      return;
    }

    this.userService.stripeConnectCallback(code).subscribe({
      next: () => this.loading.set(false),
      error: err => {
        this.error.set(err?.error?.error ?? 'Erreur lors de la connexion Stripe');
        this.loading.set(false);
      }
    });
  }

  goSettings() {
    this.router.navigate(['/admin/settings']);
  }
}
