import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="hero">
      <div class="hero-content">
        <h1>Gérez vos locations en toute simplicité</h1>
        <p>Centralisez vos propriétés, réservations et équipes depuis un seul espace.</p>
        <div class="hero-actions">
          <a mat-raised-button routerLink="/admin/login" class="btn-login">
            <mat-icon>login</mat-icon> Accès admin
          </a>
        </div>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <mat-icon>sync</mat-icon>
        <h3>Synchronisation Beds24</h3>
        <p>Connectez votre compte Beds24 pour accéder à vos propriétés et réservations en temps réel, sans stockage de données.</p>
      </div>
      <div class="feature">
        <mat-icon>cleaning_services</mat-icon>
        <h3>Gestion du ménage</h3>
        <p>Planifiez et suivez les tâches de ménage par propriété et par agent.</p>
      </div>
      <div class="feature">
        <mat-icon>assessment</mat-icon>
        <h3>Rapports & exports</h3>
        <p>Générez vos rapports à la volée depuis vos données Beds24, sans qu'elles transitent par nos serveurs. Export PDF, Excel ou CSV.</p>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
      color: white;
      padding: 100px 24px;
      text-align: center;
    }
    .hero h1 { font-size: 44px; margin: 0 0 16px; font-weight: 700; }
    .hero p { font-size: 20px; opacity: 0.85; margin: 0 0 40px; }
    .hero-actions { display: flex; gap: 16px; justify-content: center; }
    .btn-login {
      background: white !important;
      color: #0288d1 !important;
      font-weight: 600;
      font-size: 15px;
      padding: 8px 28px;
    }
    .btn-login mat-icon { margin-right: 6px; }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      max-width: 960px;
      margin: 64px auto;
      padding: 0 24px;
    }
    .feature {
      text-align: center;
      padding: 32px 16px;
      border-radius: 12px;
      background: #f8f9ff;
    }
    .feature mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #0288d1;
      margin-bottom: 16px;
    }
    .feature h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .feature p { margin: 0; color: #555; line-height: 1.6; }

    @media (max-width: 700px) {
      .features { grid-template-columns: 1fr; }
      .hero h1 { font-size: 28px; }
    }
  `]
})
export class HomeComponent {}
