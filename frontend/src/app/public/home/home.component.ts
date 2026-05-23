import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PublicService } from '../../core/services/public.service';
import { Property } from '../../core/models/booking.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="hero">
      <div class="hero-content">
        <h1>Trouvez votre logement idéal</h1>
        <p>Réservez directement, sans commission</p>
      </div>
    </div>

    <div class="container">
      <h2>Nos logements</h2>
      <div class="properties-grid">
        @for (p of properties(); track p.id) {
          <mat-card class="property-card">
            @if (p.images && p.images.length > 0) {
              <img mat-card-image [src]="p.images[0]" [alt]="p.name">
            } @else {
              <div class="placeholder-img"><mat-icon>home</mat-icon></div>
            }
            <mat-card-header>
              <mat-card-title>{{ p.name }}</mat-card-title>
              <mat-card-subtitle>{{ p.city }}, {{ p.country }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>{{ p.description | slice:0:120 }}{{ p.description && p.description.length > 120 ? '...' : '' }}</p>
              <div class="property-info">
                <span><mat-icon>people</mat-icon> {{ p.maxGuests }} pers.</span>
                <span class="price">{{ p.pricePerNight | currency:'EUR':'symbol':'1.0-0' }} / nuit</span>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <a mat-raised-button color="primary" [routerLink]="['/public/property', p.id]">
                Voir et réserver
              </a>
            </mat-card-actions>
          </mat-card>
        }
      </div>
      @if (properties().length === 0) {
        <p class="empty">Aucun logement disponible pour le moment.</p>
      }
    </div>

    <div class="admin-link">
      <a mat-button routerLink="/admin/login">Administration</a>
    </div>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: white; padding: 80px 24px; text-align: center;
    }
    .hero h1 { font-size: 48px; margin: 0 0 16px; }
    .hero p { font-size: 20px; opacity: 0.8; margin: 0; }
    .container { max-width: 1200px; margin: 40px auto; padding: 0 24px; }
    h2 { font-size: 28px; margin-bottom: 24px; }
    .properties-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .property-card { cursor: pointer; transition: box-shadow 0.2s; }
    .property-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .placeholder-img {
      height: 200px; background: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
    }
    .placeholder-img mat-icon { font-size: 64px; width: 64px; height: 64px; color: #9e9e9e; }
    img[mat-card-image] { height: 200px; object-fit: cover; }
    .property-info { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
    .property-info mat-icon { font-size: 18px; vertical-align: middle; margin-right: 4px; }
    .price { font-size: 20px; font-weight: bold; color: #1a237e; }
    .empty { text-align: center; color: #999; padding: 40px; }
    .admin-link { text-align: center; padding: 24px; }
    @media (max-width: 900px) { .properties-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .properties-grid { grid-template-columns: 1fr; } .hero h1 { font-size: 28px; } }
  `]
})
export class HomeComponent implements OnInit {
  properties = signal<Property[]>([]);

  constructor(private publicService: PublicService) {}

  ngOnInit(): void {
    this.publicService.getProperties().subscribe(data => this.properties.set(data));
  }
}
