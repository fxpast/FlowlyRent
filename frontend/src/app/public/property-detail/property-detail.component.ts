import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PublicService } from '../../core/services/public.service';
import { Property } from '../../core/models/booking.model';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="navbar">
      <a mat-button routerLink="/public/home"><mat-icon>arrow_back</mat-icon> Retour</a>
    </div>

    @if (property()) {
      <div class="container">
        <div class="property-header">
          @if (property()!.images && property()!.images!.length > 0) {
            <img [src]="property()!.images![0]" [alt]="property()!.name" class="main-image">
          } @else {
            <div class="placeholder-img"><mat-icon>home</mat-icon></div>
          }
          <div class="property-info">
            <h1>{{ property()!.name }}</h1>
            <p class="location"><mat-icon>place</mat-icon> {{ property()!.city }}, {{ property()!.country }}</p>
            <p class="description">{{ property()!.description }}</p>
            <div class="details">
              <span><mat-icon>people</mat-icon> {{ property()!.maxGuests }} personnes max</span>
              <span class="price">{{ property()!.pricePerNight | currency:'EUR':'symbol':'1.0-0' }} / nuit</span>
              @if (property()!.cleaningFee && property()!.cleaningFee! > 0) {
                <span>Frais de ménage : {{ property()!.cleaningFee | currency:'EUR':'symbol':'1.0-0' }}</span>
              }
            </div>
          </div>
        </div>

        <mat-card class="booking-card">
          <mat-card-header><mat-card-title>Réserver ce logement</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Arrivée</mat-label>
                <input matInput [matDatepicker]="checkInPicker" [(ngModel)]="checkInDate" (ngModelChange)="checkIn = fromDate($event); checkAvailability()">
                <mat-datepicker-toggle matIconSuffix [for]="checkInPicker"></mat-datepicker-toggle>
                <mat-datepicker #checkInPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Départ</mat-label>
                <input matInput [matDatepicker]="checkOutPicker" [(ngModel)]="checkOutDate" (ngModelChange)="checkOut = fromDate($event); checkAvailability()">
                <mat-datepicker-toggle matIconSuffix [for]="checkOutPicker"></mat-datepicker-toggle>
                <mat-datepicker #checkOutPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Voyageurs</mat-label>
                <input matInput type="number" [(ngModel)]="guestCount" min="1" [max]="property()!.maxGuests ?? null">
              </mat-form-field>
            </div>

            @if (checkIn && checkOut && availabilityChecked()) {
              @if (isAvailable()) {
                <div class="availability ok">
                  <mat-icon>check_circle</mat-icon>
                  Disponible ! Total estimé : {{ estimatedTotal() | currency:'EUR':'symbol':'1.0-0' }}
                  ({{ nightsCount() }} nuit(s))
                </div>
              } @else {
                <div class="availability error">
                  <mat-icon>cancel</mat-icon> Ces dates ne sont pas disponibles
                </div>
              }
            }

            <h3>Vos coordonnées</h3>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Prénom</mat-label>
                <input matInput [(ngModel)]="guest.firstName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput [(ngModel)]="guest.lastName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="guest.email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Téléphone</mat-label>
                <input matInput [(ngModel)]="guest.phone">
              </mat-form-field>
            </div>

            <button mat-raised-button color="primary" (click)="book()"
                    [disabled]="!canBook() || booking()">
              @if (booking()) { <mat-spinner diameter="20"></mat-spinner> }
              @else { Réserver et payer }
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .navbar { padding: 8px 24px; background: #0288d1; }
    .navbar a { color: white; }
    .container { max-width: 1000px; margin: 32px auto; padding: 0 24px; }
    .property-header { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .main-image { width: 100%; height: 350px; object-fit: cover; border-radius: 12px; }
    .placeholder-img { height: 350px; background: #e0e0e0; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
    .placeholder-img mat-icon { font-size: 80px; width: 80px; height: 80px; color: #9e9e9e; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    .location { color: #666; display: flex; align-items: center; gap: 4px; }
    .description { color: #444; line-height: 1.6; margin: 16px 0; }
    .details { display: flex; flex-direction: column; gap: 8px; font-size: 16px; }
    .details mat-icon { font-size: 18px; vertical-align: middle; }
    .price { font-size: 28px; font-weight: bold; color: #0288d1; }
    .booking-card { margin-top: 8px; }
    .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
    .availability { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .availability.ok { background: #e8f5e9; color: #2e7d32; }
    .availability.error { background: #ffebee; color: #c62828; }
    h3 { color: #0288d1; margin: 16px 0 8px; }
    @media (max-width: 768px) { .property-header { grid-template-columns: 1fr; } }
  `]
})
export class PropertyDetailComponent implements OnInit {
  property = signal<Property | null>(null);
  checkIn = '';
  checkOut = '';
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  guestCount = 1;
  isAvailable = signal(false);
  availabilityChecked = signal(false);
  booking = signal(false);
  guest = { firstName: '', lastName: '', email: '', phone: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicService: PublicService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.publicService.getProperty(id).subscribe(p => this.property.set(p));
  }

  checkAvailability(): void {
    if (!this.checkIn || !this.checkOut) return;
    const id = this.property()?.id;
    if (!id) return;
    this.publicService.checkAvailability(id, this.checkIn, this.checkOut).subscribe(r => {
      this.isAvailable.set(r.available);
      this.availabilityChecked.set(true);
    });
  }

  nightsCount(): number {
    if (!this.checkIn || !this.checkOut) return 0;
    const diff = new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  estimatedTotal(): number {
    const p = this.property();
    if (!p) return 0;
    return (p.pricePerNight || 0) * this.nightsCount() + (p.cleaningFee || 0);
  }

  canBook(): boolean {
    return !!(this.checkIn && this.checkOut && this.isAvailable() &&
              this.guest.firstName && this.guest.lastName && this.guest.email);
  }

  book(): void {
    const p = this.property();
    if (!p?.id || !this.canBook()) return;
    this.booking.set(true);

    this.publicService.createBooking({
      propertyId: p.id,
      guest: this.guest,
      checkIn: this.checkIn,
      checkOut: this.checkOut,
      guestCount: this.guestCount
    }).subscribe({
      next: (booking) => {
        if (booking.id) {
          this.publicService.checkout(
            booking.id,
            `${window.location.origin}/public/booking/${booking.id}?success=true`,
            `${window.location.origin}/public/property/${p.id}?cancelled=true`
          ).subscribe({
            next: (res) => { window.location.href = res.url; },
            error: () => { this.router.navigate(['/public/booking', booking.id]); }
          });
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur lors de la réservation', 'OK', { duration: 5000 });
        this.booking.set(false);
      }
    });
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
