import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { BookingSiteService } from '../booking-site.service';

@Component({
  selector: 'app-booking-site-property',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page">
      <!-- Barre de navigation -->
      <nav class="top-nav">
        <button mat-button (click)="goBack()">
          <span class="material-icons">arrow_back</span> Retour
        </button>
        @if (siteInfo()) {
          <span class="brand">{{ siteInfo().companyName || siteInfo().firstName }}</span>
        }
      </nav>

      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (error()) {
        <div class="error-box">{{ error() }}</div>
      } @else {
        <!-- Galerie photos -->
        <div class="gallery">
          @if (photos().length > 0) {
            <div class="main-photo">
              <img [src]="photos()[activePhoto()].url ?? photos()[activePhoto()].src ?? photos()[activePhoto()].fileName"
                   [alt]="property().name">
            </div>
            @if (photos().length > 1) {
              <div class="thumbs">
                @for (p of photos(); track $index) {
                  <img class="thumb"
                       [class.active]="$index === activePhoto()"
                       [src]="p.url ?? p.src ?? p.fileName"
                       (click)="activePhoto.set($index)"
                       [alt]="property().name + ' photo ' + ($index + 1)"
                       loading="lazy">
                }
              </div>
            }
          } @else {
            <div class="photo-placeholder-lg">
              <span class="material-icons">home</span>
            </div>
          }
        </div>

        <div class="content">
          <!-- Infos logement -->
          <div class="property-info">
            <h1>{{ property().name }}</h1>
            <p class="location">
              <span class="material-icons">place</span>
              {{ property().city || property().country || '—' }}
            </p>
            @if (property().maxGuestNumber || property().maxGuests) {
              <p class="feat">
                <span class="material-icons">people</span>
                Jusqu'à {{ property().maxGuestNumber || property().maxGuests }} voyageurs
              </p>
            }
            @if (property().description) {
              <p class="description">{{ property().description }}</p>
            }
          </div>

          <mat-divider></mat-divider>

          <!-- Formulaire de réservation -->
          <div class="booking-form">
            <h2>Réserver ce logement</h2>

            <!-- Dates -->
            <div class="dates-row">
              <mat-form-field>
                <mat-label>Arrivée</mat-label>
                <input matInput [matDatepicker]="checkInPicker" [(ngModel)]="checkInDate"
                       (ngModelChange)="onCheckInChange($event)" [min]="today" placeholder="jj/mm/aaaa">
                <mat-datepicker-toggle matIconSuffix [for]="checkInPicker"></mat-datepicker-toggle>
                <mat-datepicker #checkInPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Départ</mat-label>
                <input matInput [matDatepicker]="checkOutPicker" [(ngModel)]="checkOutDate"
                       (ngModelChange)="onCheckOutChange($event)" [min]="minCheckOut" placeholder="jj/mm/aaaa">
                <mat-datepicker-toggle matIconSuffix [for]="checkOutPicker"></mat-datepicker-toggle>
                <mat-datepicker #checkOutPicker></mat-datepicker>
              </mat-form-field>

              <div class="field-wrap">
                <label class="select-label">Voyageurs</label>
                <select [(ngModel)]="guestCount" class="native-select">
                  @for (n of guestOptions(); track n) {
                    <option [value]="n">{{ n }} voyageur{{ n > 1 ? 's' : '' }}</option>
                  }
                </select>
              </div>
            </div>

            <button mat-flat-button color="primary" (click)="checkAvailability()"
                    [disabled]="!checkInDate || !checkOutDate || checking()">
              @if (checking()) { <mat-spinner diameter="20"></mat-spinner> }
              @else { Vérifier la disponibilité }
            </button>

            <!-- Résultat disponibilité -->
            @if (availabilityChecked()) {
              @if (!available()) {
                <div class="unavailable-box">
                  <span class="material-icons">event_busy</span>
                  Ce logement n'est pas disponible sur ces dates. Veuillez choisir d'autres dates.
                </div>
              } @else {
                <!-- Prix -->
                <div class="price-summary">
                  <div class="price-row">
                    <span>{{ nights() }} nuit{{ nights() > 1 ? 's' : '' }}</span>
                    <span>{{ formatPrice(basePrice()) }}</span>
                  </div>
                  @if (cleaningFee() > 0) {
                    <div class="price-row">
                      <span>Frais de ménage</span>
                      <span>{{ formatPrice(cleaningFee()) }}</span>
                    </div>
                  }
                  <mat-divider></mat-divider>
                  <div class="price-row total">
                    <span>Total</span>
                    <span>{{ formatPrice(totalPrice()) }}</span>
                  </div>
                </div>

                <!-- Coordonnées voyageur -->
                <h3>Vos coordonnées</h3>
                <div class="guest-form">
                  <div class="name-row">
                    <mat-form-field style="width:100%">
                      <mat-label>Prénom</mat-label>
                      <input matInput [(ngModel)]="guest.firstName" required>
                    </mat-form-field>
                    <mat-form-field style="width:100%">
                      <mat-label>Nom</mat-label>
                      <input matInput [(ngModel)]="guest.lastName" required>
                    </mat-form-field>
                  </div>
                  <mat-form-field style="width:100%">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" [(ngModel)]="guest.email" required>
                  </mat-form-field>
                  <mat-form-field style="width:100%">
                    <mat-label>Téléphone</mat-label>
                    <input matInput type="tel" [(ngModel)]="guest.phone">
                  </mat-form-field>
                </div>

                @if (bookingError()) {
                  <div class="error-box">{{ bookingError() }}</div>
                }

                <button mat-flat-button color="primary" class="submit-btn"
                        (click)="submitBooking()"
                        [disabled]="submitting() || !guest.firstName || !guest.lastName || !guest.email">
                  @if (submitting()) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { Confirmer la réservation }
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f7fa; font-family: Roboto, sans-serif; }

    .top-nav {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: white; box-shadow: 0 1px 4px rgba(0,0,0,.08); position: sticky; top: 0; z-index: 10;
    }
    .brand { font-weight: 600; color: #0288d1; font-size: 1rem; }
    .center { display: flex; justify-content: center; padding: 80px; }
    .error-box { background: #fce4ec; color: #c62828; border-radius: 8px; padding: 20px; margin: 24px; }

    .gallery { background: #111; }
    .main-photo { max-height: 480px; overflow: hidden; display: flex; justify-content: center; }
    .main-photo img { width: 100%; max-height: 480px; object-fit: cover; display: block; }
    .thumbs { display: flex; gap: 6px; padding: 8px; overflow-x: auto; background: #222; }
    .thumb { height: 72px; width: 100px; object-fit: cover; border-radius: 4px; cursor: pointer; opacity: .6; flex-shrink: 0; transition: opacity .2s; }
    .thumb.active, .thumb:hover { opacity: 1; }
    .photo-placeholder-lg {
      height: 320px; display: flex; align-items: center; justify-content: center; background: #e3f2fd;
    }
    .photo-placeholder-lg .material-icons { font-size: 96px; color: #90caf9; }

    .content { max-width: 800px; margin: 0 auto; padding: 32px 16px; }

    .property-info h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 12px; color: #1a1a2e; }
    .location, .feat { display: flex; align-items: center; gap: 6px; color: #555; font-size: .95rem; margin: 6px 0; }
    .location .material-icons, .feat .material-icons { font-size: 18px; color: #0288d1; }
    .description { color: #444; line-height: 1.7; margin-top: 16px; white-space: pre-wrap; }

    mat-divider { margin: 24px 0 !important; }

    .booking-form h2 { font-size: 1.3rem; font-weight: 600; margin: 0 0 20px; }
    .booking-form h3 { font-size: 1.1rem; font-weight: 600; margin: 24px 0 12px; }

    .dates-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: flex-end; }
    .dates-row mat-form-field { flex: 1; min-width: 160px; }

    .field-wrap { display: flex; flex-direction: column; gap: 4px; }
    .select-label { font-size: .85rem; color: rgba(0,0,0,.6); margin-bottom: 2px; }
    .native-select {
      height: 56px; padding: 0 12px; border: 1px solid rgba(0,0,0,.38); border-radius: 4px;
      font-size: 1rem; background: white; min-width: 140px; cursor: pointer;
    }
    .native-select:focus { outline: 2px solid #0288d1; }

    .unavailable-box {
      display: flex; align-items: center; gap: 8px;
      background: #fff8e1; color: #f57c00; border-radius: 8px; padding: 16px; margin-top: 16px;
    }
    .unavailable-box .material-icons { font-size: 22px; }

    .price-summary { background: #f5f7fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .price-row { display: flex; justify-content: space-between; padding: 6px 0; color: #333; }
    .price-row.total { font-weight: 700; font-size: 1.1rem; padding-top: 12px; }

    .guest-form { display: flex; flex-direction: column; gap: 4px; }
    .name-row { display: flex; gap: 12px; }
    .name-row mat-form-field { flex: 1; }

    .submit-btn { width: 100%; margin-top: 16px; height: 48px; font-size: 1rem; }

    @media (max-width: 600px) {
      .property-info h1 { font-size: 1.4rem; }
      .dates-row { flex-direction: column; }
      .dates-row mat-form-field { width: 100%; }
      .name-row { flex-direction: column; }
    }
  `]
})
export class BookingSitePropertyComponent implements OnInit {
  slug = '';
  propId = '';
  today = new Date();

  siteInfo = signal<any>(null);
  property = signal<any>({});
  photos = signal<any[]>([]);
  activePhoto = signal(0);
  loading = signal(true);
  error = signal('');

  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  guestCount = 2;
  minCheckOut: Date | null = null;

  checking = signal(false);
  availabilityChecked = signal(false);
  available = signal(false);

  nights = signal(0);
  basePrice = signal(0);
  cleaningFee = signal(0);
  totalPrice = signal(0);
  currency = signal('EUR');

  guest = { firstName: '', lastName: '', email: '', phone: '' };

  submitting = signal(false);
  bookingError = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService
  ) {}

  ngOnInit() {
    this.slug = this.route.snapshot.params['slug'];
    this.propId = this.route.snapshot.params['propId'];
    this.svc.getSiteInfo(this.slug).subscribe({ next: v => this.siteInfo.set(v) });
    this.svc.getProperty(this.slug, this.propId).subscribe({
      next: prop => {
        this.property.set(prop);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Logement introuvable');
      }
    });
    this.svc.getPropertyPhotos(this.slug, this.propId).subscribe({
      next: photos => this.photos.set(photos ?? []),
      error: () => {}
    });
  }

  guestOptions(): number[] {
    const max = this.property().maxGuestNumber ?? this.property().maxGuests ?? 10;
    return Array.from({ length: Number(max) }, (_, i) => i + 1);
  }

  onCheckInChange(date: Date) {
    if (!date) return;
    this.checkInDate = date;
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    this.minCheckOut = next;
    if (this.checkOutDate && this.checkOutDate <= date) {
      this.checkOutDate = null;
    }
    this.availabilityChecked.set(false);
  }

  onCheckOutChange(date: Date) {
    this.checkOutDate = date;
    this.availabilityChecked.set(false);
  }

  checkAvailability() {
    if (!this.checkInDate || !this.checkOutDate) return;
    this.checking.set(true);
    this.availabilityChecked.set(false);
    const ci = this.localDate(this.checkInDate);
    const co = this.localDate(this.checkOutDate);
    this.svc.getOffers(this.slug, this.propId, ci, co).subscribe({
      next: offers => {
        this.checking.set(false);
        this.availabilityChecked.set(true);
        if (!offers || offers.length === 0) {
          this.available.set(false);
          return;
        }
        this.available.set(true);
        this.buildPriceSummary(offers, ci, co);
      },
      error: () => {
        this.checking.set(false);
        this.availabilityChecked.set(true);
        this.available.set(false);
      }
    });
  }

  buildPriceSummary(offers: any[], checkIn: string, checkOut: string) {
    const offer = offers[0];
    const nightCount = this.daysBetween(checkIn, checkOut);
    this.nights.set(nightCount);

    const price = offer.price ?? offer.totalPrice ?? offer.total ?? 0;
    const cleaning = offer.cleaningFee ?? offer.extraFee ?? 0;
    const currency = offer.currency ?? 'EUR';

    this.basePrice.set(Number(price));
    this.cleaningFee.set(Number(cleaning));
    this.totalPrice.set(Number(price) + Number(cleaning));
    this.currency.set(currency);
  }

  submitBooking() {
    if (!this.checkInDate || !this.checkOutDate) return;
    this.submitting.set(true);
    this.bookingError.set('');
    const payload = [{
      propertyId: this.propId,
      checkIn: this.localDate(this.checkInDate),
      checkOut: this.localDate(this.checkOutDate),
      numAdult: this.guestCount,
      numChild: 0,
      guestFirstName: this.guest.firstName,
      guestName: this.guest.lastName,
      guestEmail: this.guest.email,
      guestPhone: this.guest.phone,
      status: 'new',
      price: [{ price: this.totalPrice() }]
    }];
    this.svc.createBooking(this.slug, payload).subscribe({
      next: result => {
        this.submitting.set(false);
        const booking = Array.isArray(result) ? result[0] : result;
        const bookingId = booking?.bookingId ?? booking?.id;
        if (bookingId) {
          this.router.navigate(['/', this.slug, 'booking', bookingId]);
        } else {
          this.bookingError.set('Réservation créée mais identifiant manquant. Contactez l\'hôte.');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.bookingError.set(err?.error?.error ?? 'Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: this.currency() }).format(amount);
  }

  goBack() {
    this.router.navigate(['/', this.slug]);
  }

  private localDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private daysBetween(from: string, to: string): number {
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  }
}
