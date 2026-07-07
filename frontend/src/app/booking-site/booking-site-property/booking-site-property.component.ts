import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookingSiteService } from '../booking-site.service';
import { catchError, of } from 'rxjs';

interface CalDay {
  day: number;
  date: string;
  past: boolean;
  isToday: boolean;
  blocked: boolean;
  available: boolean;
}

interface CalMonth {
  year: number;
  month: number;
  key: string;
  label: string;
  emptyBefore: number[];
  days: CalDay[];
}

@Component({
  selector: 'app-booking-site-property',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatProgressSpinnerModule, MatDividerModule, MatIconModule,
    TranslateModule
  ],
  template: `
    <div class="page">
      <!-- Barre de navigation -->
      <nav class="top-nav">
        <button mat-button (click)="goBack()">
          <span class="material-icons">arrow_back</span> {{ 'bs.back' | translate }}
        </button>
        @if (siteInfo()) {
          <span class="brand">{{ siteInfo().companyName || siteInfo().firstName }}</span>
        }
        <div class="spacer"></div>
        <div class="lang-bar">
          @for (l of langs; track l) {
            <button class="lang-btn" [class.active]="currentLang === l" (click)="switchLang(l)">{{ l.toUpperCase() }}</button>
          }
        </div>
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
          } @else if (property()?.coverPhotoUrl) {
            <div class="main-photo">
              <img [src]="property().coverPhotoUrl" [alt]="property().name">
            </div>
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
                {{ 'bs.guests_up_to' | translate: { n: property().maxGuestNumber || property().maxGuests } }}
              </p>
            }
            @if (property().description) {
              <p class="description">{{ property().description }}</p>
            }
          </div>

          @if (equipmentByCategory().length > 0) {
            <mat-divider></mat-divider>
            <div class="equipment-section">
              <h2>{{ 'bs.equipment_title' | translate }}</h2>
              <div class="equipment-grid">
                @for (cat of equipmentByCategory(); track cat.value) {
                  <div class="equipment-cat">
                    <div class="equipment-cat-header">
                      <span class="material-icons">{{ cat.icon }}</span>
                      <strong>{{ cat.labelKey | translate }}</strong>
                    </div>
                    <ul class="equipment-list">
                      @for (item of cat.items; track item.label + (item.details ?? '')) {
                        <li>
                          {{ item.label }}{{ item.details ? ' (' + item.details + ')' : '' }}
                          @if (item.quantity > 1) { <span class="equipment-qty">×{{ item.quantity }}</span> }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }

          <mat-divider></mat-divider>

          <!-- ── Calendrier de disponibilité ─────────────────────────── -->
          <div class="avail-section">
            <h2>{{ 'bs.availability' | translate }}</h2>

            @if (loadingCalendar()) {
              <div class="cal-loading"><mat-spinner diameter="32"></mat-spinner></div>
            } @else {
              <!-- Instruction contextuelle -->
              <div class="cal-hint">
                @if (!checkInStr) {
                  <span class="material-icons hint-icon">touch_app</span>
                  {{ 'bs.select_checkin' | translate }}
                } @else if (!checkOutStr) {
                  <span class="material-icons hint-icon">touch_app</span>
                  {{ 'bs.select_checkout' | translate }}
                } @else {
                  <span class="material-icons hint-icon" style="color:#388e3c">check_circle</span>
                  {{ nights() }} {{ (nights() > 1 ? 'bs.nights' : 'bs.night') | translate }} —
                  {{ formatDate(checkInStr) }} → {{ formatDate(checkOutStr) }}
                  <button mat-button (click)="resetDates()" style="font-size:.8rem;margin-left:4px">
                    <span class="material-icons" style="font-size:15px">close</span>
                  </button>
                }
              </div>

              <!-- Navigation mois -->
              <div class="cal-nav">
                <button mat-icon-button (click)="prevMonth()" [disabled]="!canGoPrev()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <div class="spacer"></div>
                <button mat-icon-button (click)="nextMonth()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>

              <!-- Grilles des mois -->
              <div class="months-wrap">
                @for (m of calMonths(); track m.key) {
                  <div class="month-block">
                    <div class="month-title">{{ m.label }}</div>
                    <div class="wdays">
                      @for (w of weekdays; track w) { <div class="wday">{{ w }}</div> }
                    </div>
                    <div class="days-grid">
                      @for (e of m.emptyBefore; track $index) {
                        <div class="day-cell empty"></div>
                      }
                      @for (d of m.days; track d.date) {
                        <div class="day-cell"
                             [class.past]="d.past"
                             [class.blocked]="d.blocked"
                             [class.available]="d.available"
                             [class.is-checkin]="d.date === checkInStr"
                             [class.is-checkout]="d.date === checkOutStr"
                             [class.in-range]="isInRange(d.date)"
                             [class.today]="d.isToday"
                             [class.hover-end]="hoverDate === d.date && !!checkInStr && !checkOutStr"
                             (click)="onDayClick(d)"
                             (mouseenter)="onDayHover(d)">
                          <span class="day-num">{{ d.day }}</span>
                          @if (!d.blocked && !d.past && calPrices()[d.date]) {
                            <span class="day-price">{{ calPrices()[d.date] }}€</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Légende -->
              <div class="cal-legend">
                <span class="leg-item"><span class="leg-sq available"></span> {{ 'bs.leg_available' | translate }}</span>
                <span class="leg-item"><span class="leg-sq blocked"></span> {{ 'bs.leg_unavailable' | translate }}</span>
                <span class="leg-item"><span class="leg-sq selected"></span> {{ 'bs.leg_selected' | translate }}</span>
              </div>
            }
          </div>

          <mat-divider></mat-divider>

          <!-- ── Formulaire de réservation ───────────────────────────── -->
          <div class="booking-form">
            <h2>{{ 'bs.book_property' | translate }}</h2>

            <!-- Récap dates sélectionnées dans le calendrier -->
            @if (checkInStr && checkOutStr) {
              <div class="dates-recap">
                <div class="date-chip">
                  <span class="material-icons">login</span>
                  <div>
                    <div class="dc-label">{{ 'bs.check_in' | translate }}</div>
                    <div class="dc-value">{{ formatDate(checkInStr) }}</div>
                  </div>
                </div>
                <div class="date-arrow">→</div>
                <div class="date-chip">
                  <span class="material-icons">logout</span>
                  <div>
                    <div class="dc-label">{{ 'bs.check_out' | translate }}</div>
                    <div class="dc-value">{{ formatDate(checkOutStr) }}</div>
                  </div>
                </div>
                <button mat-button (click)="resetDates()" class="change-btn">
                  {{ 'bs.change_dates' | translate }}
                </button>
              </div>
            } @else {
              <p class="no-dates-hint">{{ 'bs.select_dates_first' | translate }}</p>
            }

            <!-- Voyageurs -->
            @if (checkInStr && checkOutStr) {
              <div class="guests-row">
                <div class="field-wrap">
                  <label class="select-label">{{ 'bs.guests' | translate }}</label>
                  <select [(ngModel)]="guestCount" class="native-select">
                    @for (n of guestOptions(); track n) {
                      <option [value]="n">{{ n }} {{ (n > 1 ? 'bs.travelers' : 'bs.traveler') | translate }}</option>
                    }
                  </select>
                </div>

                <button mat-flat-button color="primary" (click)="checkAvailability()"
                        [disabled]="checking()">
                  @if (checking()) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { {{ 'bs.check_availability' | translate }} }
                </button>
              </div>
            }

            <!-- Résultat disponibilité -->
            @if (availabilityChecked()) {
              @if (!available()) {
                <div class="unavailable-box">
                  <span class="material-icons">event_busy</span>
                  {{ 'bs.unavailable' | translate }}
                </div>
              } @else {
                <!-- Code promo -->
                <div class="promo-code-box">
                  <div class="field-wrap" style="flex:1">
                    <label class="select-label">{{ 'bs.promo_code' | translate }}</label>
                    <input class="text-input" [(ngModel)]="promoCode" (keydown.enter)="applyPromoCode()"
                           [placeholder]="'bs.promo_code_placeholder' | translate">
                  </div>
                  <button mat-stroked-button (click)="applyPromoCode()" [disabled]="!promoCode.trim() || applyingPromoCode()">
                    @if (applyingPromoCode()) { <mat-spinner diameter="18"></mat-spinner> }
                    @else { {{ 'bs.promo_apply' | translate }} }
                  </button>
                </div>
                @if (promoCodeApplied()) {
                  <div class="promo-feedback valid">
                    <span class="material-icons">check_circle</span>
                    {{ 'bs.promo_valid' | translate: { percent: promoDiscountPercent() } }}
                  </div>
                } @else if (promoCodeInvalid()) {
                  <div class="promo-feedback invalid">
                    <span class="material-icons">error</span>
                    {{ 'bs.promo_invalid' | translate }}
                  </div>
                }

                <!-- Prix (masqué si Beds24 n'a pas de tarif configuré) -->
                @if (totalPrice() > 0) {
                  <div class="price-summary">
                    <div class="price-row">
                      <span>{{ nights() }} {{ (nights() > 1 ? 'bs.nights' : 'bs.night') | translate }}</span>
                      <span>{{ formatPrice(basePrice()) }}</span>
                    </div>
                    @if (promoCodeApplied()) {
                      <div class="price-row discount">
                        <span>{{ 'bs.promo_discount' | translate: { percent: promoDiscountPercent() } }}</span>
                        <span>−{{ promoDiscountPercent() }}%</span>
                      </div>
                    }
                    @if (taxeSejour() > 0) {
                      <div class="price-row">
                        <span>{{ 'bs.taxe_sejour' | translate }}</span>
                        <span>{{ formatPrice(taxeSejour()) }}</span>
                      </div>
                    }
                    @if (cleaningFee() > 0) {
                      <div class="price-row">
                        <span>{{ 'bs.cleaning_fee' | translate }}</span>
                        <span>{{ formatPrice(cleaningFee()) }}</span>
                      </div>
                    }
                    <mat-divider></mat-divider>
                    <div class="price-row total">
                      <span>{{ 'bs.total' | translate }}</span>
                      <span>{{ formatPrice(totalPrice()) }}</span>
                    </div>
                  </div>
                } @else {
                  <div class="price-summary">
                    <div class="price-row">
                      <span class="material-icons" style="color:#43a047;font-size:18px;vertical-align:middle">check_circle</span>
                      &nbsp;{{ nights() }} {{ (nights() > 1 ? 'bs.nights' : 'bs.night') | translate }} — {{ 'bs.leg_available' | translate }}
                    </div>
                  </div>
                }

                <!-- Coordonnées voyageur -->
                <h3>{{ 'bs.your_info' | translate }}</h3>
                <div class="guest-form">
                  <div class="name-row">
                    <div class="field-wrap" style="flex:1">
                      <label class="select-label">{{ 'bs.first_name' | translate }}</label>
                      <input class="text-input" [(ngModel)]="guest.firstName" required>
                    </div>
                    <div class="field-wrap" style="flex:1">
                      <label class="select-label">{{ 'bs.last_name' | translate }}</label>
                      <input class="text-input" [(ngModel)]="guest.lastName" required>
                    </div>
                  </div>
                  <div class="field-wrap">
                    <label class="select-label">{{ 'bs.email' | translate }}</label>
                    <input class="text-input" type="email" [(ngModel)]="guest.email" required>
                  </div>
                  <div class="field-wrap">
                    <label class="select-label">{{ 'bs.phone' | translate }}</label>
                    <input class="text-input" type="tel" [(ngModel)]="guest.phone">
                  </div>
                </div>

                @if (bookingError()) {
                  <div class="error-box">{{ bookingError() }}</div>
                }

                <button mat-flat-button color="primary" class="submit-btn"
                        (click)="submitBooking()"
                        [disabled]="submitting() || !guest.firstName || !guest.lastName || !guest.email">
                  @if (submitting()) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { {{ 'bs.confirm_booking' | translate }} }
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
    .spacer { flex: 1; }
    .lang-bar { display: flex; gap: 4px; }
    .lang-btn {
      background: #f5f7fa; color: #555; border: 1px solid #ddd;
      border-radius: 4px; padding: 3px 8px; font-size: .75rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .lang-btn:hover { background: #e3f2fd; color: #0288d1; }
    .lang-btn.active { background: #0288d1; color: white; border-color: #0288d1; }

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

    .content { max-width: 860px; margin: 0 auto; padding: 32px 16px; }

    .property-info h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 12px; color: #1a1a2e; }
    .location, .feat { display: flex; align-items: center; gap: 6px; color: #555; font-size: .95rem; margin: 6px 0; }
    .location .material-icons, .feat .material-icons { font-size: 18px; color: #0288d1; }
    .description { color: #444; line-height: 1.7; margin-top: 16px; white-space: pre-wrap; }

    .equipment-section h2 { font-size: 1.3rem; font-weight: 600; margin: 0 0 16px; }
    .equipment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
    .equipment-cat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #1a1a2e; }
    .equipment-cat-header .material-icons { font-size: 20px; color: #0288d1; }
    .equipment-list { list-style: none; margin: 0; padding: 0; }
    .equipment-list li { color: #555; font-size: .92rem; padding: 3px 0; }
    .equipment-qty { color: #999; font-size: .85rem; margin-left: 4px; }

    mat-divider { margin: 28px 0 !important; }

    /* ─── Calendrier ─────────────────────────────────────────────────── */
    .avail-section h2 { font-size: 1.3rem; font-weight: 600; margin: 0 0 16px; }
    .cal-loading { display: flex; justify-content: center; padding: 40px; }

    .cal-hint {
      display: flex; align-items: center; gap: 6px;
      font-size: .9rem; color: #555; margin-bottom: 8px; min-height: 28px;
    }
    .hint-icon { font-size: 18px; color: #0288d1; }

    .cal-nav {
      display: flex; align-items: center; margin-bottom: 8px;
    }

    .months-wrap {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }

    .month-block {}
    .month-title {
      text-align: center; font-weight: 700; font-size: .95rem; color: #1a1a2e;
      padding: 4px 0 10px; text-transform: capitalize;
    }
    .wdays {
      display: grid; grid-template-columns: repeat(7, 1fr);
      margin-bottom: 4px;
    }
    .wday {
      text-align: center; font-size: .72rem; font-weight: 700;
      color: #aaa; text-transform: uppercase; padding: 2px 0;
    }
    .days-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
    }
    .day-cell {
      aspect-ratio: 1; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      flex-direction: column; cursor: default; position: relative;
      transition: background .12s, color .12s;
    }
    .day-cell.empty {}
    .day-num { font-size: .82rem; line-height: 1; }
    .day-price { font-size: .55rem; color: #2e7d32; line-height: 1; margin-top: 1px; font-weight: 600; }

    /* États */
    .day-cell.past { opacity: .35; }
    .day-cell.today .day-num::after {
      content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
      width: 4px; height: 4px; border-radius: 50%; background: #0288d1;
    }
    .day-cell.blocked {
      background: repeating-linear-gradient(
        45deg, #f0f0f0, #f0f0f0 3px, #e0e0e0 3px, #e0e0e0 6px
      );
      color: #bbb;
    }
    .day-cell.available {
      cursor: pointer; background: white;
      box-shadow: 0 0 0 1px #e8e8e8 inset;
    }
    .day-cell.available:hover {
      background: #e3f2fd; color: #0288d1;
    }
    .day-cell.in-range {
      background: #e3f2fd; border-radius: 0; color: #0277bd;
    }
    .day-cell.is-checkin, .day-cell.is-checkout {
      background: #0288d1 !important; color: white !important;
      border-radius: 50% !important; font-weight: 700;
    }
    .day-cell.hover-end {
      background: #bbdefb; color: #0277bd;
    }

    /* Légende */
    .cal-legend {
      display: flex; gap: 16px; flex-wrap: wrap; margin-top: 14px; font-size: .8rem; color: #555;
    }
    .leg-item { display: flex; align-items: center; gap: 5px; }
    .leg-sq {
      width: 14px; height: 14px; border-radius: 3px; display: inline-block; border: 1px solid #ddd;
    }
    .leg-sq.available { background: white; }
    .leg-sq.blocked {
      background: repeating-linear-gradient(
        45deg, #f0f0f0, #f0f0f0 3px, #e0e0e0 3px, #e0e0e0 6px
      );
    }
    .leg-sq.selected { background: #0288d1; border-color: #0288d1; }

    /* ─── Formulaire ─────────────────────────────────────────────────── */
    .booking-form h2 { font-size: 1.3rem; font-weight: 600; margin: 0 0 20px; }
    .booking-form h3 { font-size: 1.1rem; font-weight: 600; margin: 24px 0 12px; }

    .dates-recap {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      background: #f0f9ff; border: 1px solid #b3e5fc; border-radius: 10px; padding: 12px 16px;
      margin-bottom: 20px;
    }
    .date-chip {
      display: flex; align-items: center; gap: 8px; color: #0277bd;
    }
    .date-chip .material-icons { font-size: 20px; }
    .dc-label { font-size: .7rem; color: #888; line-height: 1; }
    .dc-value { font-weight: 700; font-size: .95rem; }
    .date-arrow { font-size: 1.2rem; color: #90caf9; }
    .change-btn { font-size: .8rem; margin-left: auto; }

    .no-dates-hint { color: #888; font-size: .9rem; margin: 0 0 16px; }

    .guests-row {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
    }

    .field-wrap { display: flex; flex-direction: column; gap: 4px; }
    .select-label { font-size: .85rem; color: rgba(0,0,0,.6); margin-bottom: 2px; }
    .native-select {
      height: 48px; padding: 0 12px; border: 1px solid rgba(0,0,0,.38); border-radius: 4px;
      font-size: 1rem; background: white; min-width: 140px; cursor: pointer;
    }
    .native-select:focus { outline: 2px solid #0288d1; }
    .text-input {
      height: 48px; padding: 0 12px; border: 1px solid rgba(0,0,0,.38); border-radius: 4px;
      font-size: 1rem; background: white; width: 100%; box-sizing: border-box;
    }
    .text-input:focus { outline: 2px solid #0288d1; border-color: transparent; }

    .unavailable-box {
      display: flex; align-items: center; gap: 8px;
      background: #fff8e1; color: #f57c00; border-radius: 8px; padding: 16px; margin-top: 16px;
    }
    .unavailable-box .material-icons { font-size: 22px; }

    .price-summary { background: #f5f7fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .price-row { display: flex; justify-content: space-between; padding: 6px 0; color: #333; }
    .price-row.total { font-weight: 700; font-size: 1.1rem; padding-top: 12px; }
    .price-row.discount { color: #2e7d32; font-weight: 600; }

    .promo-code-box { display: flex; align-items: flex-end; gap: 8px; margin-top: 16px; }
    .promo-feedback {
      display: flex; align-items: center; gap: 6px; font-size: .85rem;
      margin-top: 6px; padding: 6px 0;
    }
    .promo-feedback .material-icons { font-size: 18px; }
    .promo-feedback.valid { color: #2e7d32; }
    .promo-feedback.invalid { color: #c62828; }

    .guest-form { display: flex; flex-direction: column; gap: 12px; }
    .name-row { display: flex; gap: 12px; }

    .submit-btn { width: 100%; margin-top: 16px; height: 48px; font-size: 1rem; }

    @media (max-width: 640px) {
      .months-wrap { grid-template-columns: 1fr; }
      .property-info h1 { font-size: 1.4rem; }
      .name-row { flex-direction: column; }
      .lang-bar { display: none; }
      .dates-recap { gap: 8px; }
    }
  `]
})
export class BookingSitePropertyComponent implements OnInit {
  slug = '';
  propId = '';

  siteInfo = signal<any>(null);
  property = signal<any>({});
  photos = signal<any[]>([]);

  private readonly EQUIPMENT_CATEGORIES = [
    { value: 'BEDS',       icon: 'bed',          labelKey: 'bs.equipment_cat_BEDS' },
    { value: 'APPLIANCES', icon: 'kitchen',      labelKey: 'bs.equipment_cat_APPLIANCES' },
    { value: 'TECH',       icon: 'devices',      labelKey: 'bs.equipment_cat_TECH' },
    { value: 'KITCHEN',    icon: 'coffee_maker', labelKey: 'bs.equipment_cat_KITCHEN' },
    { value: 'BATHROOM',   icon: 'bathtub',      labelKey: 'bs.equipment_cat_BATHROOM' },
    { value: 'OUTDOOR',    icon: 'deck',         labelKey: 'bs.equipment_cat_OUTDOOR' },
    { value: 'OTHER',      icon: 'category',     labelKey: 'bs.equipment_cat_OTHER' }
  ];

  equipmentByCategory = computed(() => {
    const items: any[] = this.property()?.equipment ?? [];
    return this.EQUIPMENT_CATEGORIES
      .map(cat => ({ ...cat, items: items.filter(i => i.category === cat.value) }))
      .filter(cat => cat.items.length > 0);
  });
  activePhoto = signal(0);
  loading = signal(true);
  error = signal('');

  // Calendrier
  loadingCalendar = signal(false);
  blockedDates = signal<Set<string>>(new Set());
  calPrices = signal<Record<string, number>>({});
  calStart = signal({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  hoverDate = '';

  weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Sélection de dates
  checkInStr = '';
  checkOutStr = '';

  // Disponibilité / prix
  guestCount = 2;
  checking = signal(false);
  availabilityChecked = signal(false);
  available = signal(false);
  nights = signal(0);
  basePrice = signal(0);
  cleaningFee = signal(0);
  taxeSejour = signal(0);
  totalPrice = signal(0);
  currency = signal('EUR');
  promoCode = '';
  promoCodeApplied = signal(false);
  promoCodeInvalid = signal(false);
  promoDiscountPercent = signal(0);
  applyingPromoCode = signal(false);

  guest = { firstName: '', lastName: '', email: '', phone: '' };
  submitting = signal(false);
  bookingError = signal('');

  langs = ['fr', 'en', 'es', 'de', 'it'];
  currentLang = 'fr';

  private todayStr = this.toDateStr(new Date());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: BookingSiteService,
    private translate: TranslateService
  ) {}

  get locale(): string {
    const map: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT' };
    return map[this.currentLang] ?? 'fr-FR';
  }

  // ── Mois calculés ──────────────────────────────────────────────────

  calMonths(): CalMonth[] {
    const months: CalMonth[] = [];
    let { year, month } = this.calStart();
    for (let i = 0; i < 2; i++) {
      let y = year, m = month + i;
      if (m > 12) { m -= 12; y += 1; }
      months.push(this.buildMonth(y, m));
    }
    return months;
  }

  private buildMonth(year: number, month: number): CalMonth {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = new Date(year, month - 1, 1).getDay();
    const emptyBefore = (firstDow + 6) % 7; // 0=Lun

    const dateObj = new Date(year, month - 1, 1);
    const label = dateObj.toLocaleDateString(this.locale, { month: 'long', year: 'numeric' });

    const days: CalDay[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const past = date < this.todayStr;
      return {
        day, date, past,
        isToday: date === this.todayStr,
        blocked: !past && this.blockedDates().has(date),
        available: !past && !this.blockedDates().has(date)
      };
    });

    return {
      year, month,
      key: `${year}-${month}`,
      label,
      emptyBefore: Array(emptyBefore).fill(0),
      days
    };
  }

  ngOnInit() {
    this.initLang();
    this.slug = this.route.snapshot.params['slug'];
    this.propId = this.route.snapshot.params['propId'];
    // Pré-remplir les dates depuis la recherche homepage
    const qp = this.route.snapshot.queryParamMap;
    const qFrom = qp.get('from');
    const qTo = qp.get('to');
    const qGuests = qp.get('guests');
    if (qFrom) this.checkInStr = qFrom;
    if (qTo) this.checkOutStr = qTo;
    if (qGuests) this.guestCount = Number(qGuests);
    this.svc.getSiteInfo(this.slug).subscribe({ next: v => this.siteInfo.set(v) });
    this.svc.getProperty(this.slug, this.propId).subscribe({
      next: prop => {
        this.property.set(prop);
        const urls: string[] = prop.photoUrls ?? [];
        if (urls.length > 0) {
          this.photos.set(urls.map((url: string) => ({ url })));
        }
        this.loading.set(false);
        this.loadCalendar();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.translate.instant('bs.error_property'));
      }
    });
  }

  private loadCalendar() {
    const start = this.todayStr;
    const end = this.toDateStr(new Date(Date.now() + 90 * 86400000));
    this.loadingCalendar.set(true);
    this.svc.getBlockedDates(this.slug, this.propId, start, end)
      .pipe(catchError(() => of({ blockedDates: [] as string[], prices: {} as Record<string, number> })))
      .subscribe(res => {
        this.loadingCalendar.set(false);
        this.blockedDates.set(new Set(res.blockedDates ?? []));
        this.calPrices.set(res.prices ?? {});
      });
  }

  // ── Navigation calendrier ──────────────────────────────────────────

  canGoPrev(): boolean {
    const { year, month } = this.calStart();
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  }

  prevMonth() {
    if (!this.canGoPrev()) return;
    const { year, month } = this.calStart();
    if (month === 1) this.calStart.set({ year: year - 1, month: 12 });
    else this.calStart.set({ year, month: month - 1 });
  }

  nextMonth() {
    const { year, month } = this.calStart();
    if (month === 12) this.calStart.set({ year: year + 1, month: 1 });
    else this.calStart.set({ year, month: month + 1 });
  }

  // ── Sélection de dates ─────────────────────────────────────────────

  onDayClick(d: CalDay) {
    if (d.past || d.blocked) return;
    if (!this.checkInStr || (this.checkInStr && this.checkOutStr)) {
      // Premier clic ou reset : sélectionner check-in
      this.checkInStr = d.date;
      this.checkOutStr = '';
      this.availabilityChecked.set(false);
      this.available.set(false);
    } else {
      // Deuxième clic : check-out
      if (d.date <= this.checkInStr) {
        this.checkInStr = d.date;
        this.checkOutStr = '';
      } else {
        this.checkOutStr = d.date;
        this.hoverDate = '';
        this.checkAvailability();
      }
    }
  }

  onDayHover(d: CalDay) {
    if (this.checkInStr && !this.checkOutStr) {
      this.hoverDate = d.date;
    }
  }

  isInRange(date: string): boolean {
    const end = this.checkOutStr || this.hoverDate;
    if (!this.checkInStr || !end) return false;
    return date > this.checkInStr && date < end;
  }

  resetDates() {
    this.checkInStr = '';
    this.checkOutStr = '';
    this.availabilityChecked.set(false);
    this.available.set(false);
  }

  // ── Disponibilité & réservation ────────────────────────────────────

  guestOptions(): number[] {
    const p = this.property();
    const max = p?.maxPeople ?? p?.maxGuestNumber ?? p?.maxGuests ?? 10;
    return Array.from({ length: Math.max(1, Number(max)) }, (_, i) => i + 1);
  }

  checkAvailability() {
    if (!this.checkInStr || !this.checkOutStr) return;
    this.checking.set(true);
    this.availabilityChecked.set(false);

    // Vérification locale : y a-t-il une date bloquée dans la plage [checkIn, checkOut) ?
    const blocked = this.blockedDates();
    let cur = this.checkInStr;
    while (cur < this.checkOutStr) {
      if (blocked.has(cur)) {
        this.checking.set(false);
        this.availabilityChecked.set(true);
        this.available.set(false);
        return;
      }
      const d = new Date(cur + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      cur = this.toDateStr(d);
    }

    // Dates libres localement — calculer l'estimation de prix
    this.svc.getEstimate(this.slug, this.propId, this.checkInStr, this.checkOutStr, this.guestCount, this.promoCode).subscribe({
      next: est => {
        this.checking.set(false);
        this.availabilityChecked.set(true);
        this.available.set(true);
        this.nights.set(est.nights);
        this.basePrice.set(est.nightsPrice);
        this.cleaningFee.set(est.cleaningFee);
        this.taxeSejour.set(est.taxeSejour);
        this.totalPrice.set(Math.round((est.nightsPrice + est.cleaningFee + est.taxeSejour) * 100) / 100);
        this.currency.set('EUR');
        this.applyingPromoCode.set(false);
        if (this.promoCode.trim()) {
          this.promoCodeApplied.set(est.promoCodeValid === true);
          this.promoCodeInvalid.set(est.promoCodeValid === false);
          this.promoDiscountPercent.set(est.promoCodeDiscountPercent ?? 0);
        } else {
          this.promoCodeApplied.set(false);
          this.promoCodeInvalid.set(false);
          this.promoDiscountPercent.set(0);
        }
      },
      error: () => {
        // Pas de tarif disponible — on confirme disponible sans prix
        this.checking.set(false);
        this.availabilityChecked.set(true);
        this.available.set(true);
        this.applyingPromoCode.set(false);
        const nights = this.daysBetween(this.checkInStr, this.checkOutStr);
        this.nights.set(nights);
        this.basePrice.set(0);
        this.cleaningFee.set(0);
        this.taxeSejour.set(0);
        this.totalPrice.set(0);
        this.currency.set('EUR');
        this.promoCodeApplied.set(false);
        this.promoCodeInvalid.set(false);
        this.promoDiscountPercent.set(0);
      }
    });
  }

  applyPromoCode(): void {
    if (!this.promoCode.trim() || this.applyingPromoCode()) return;
    this.applyingPromoCode.set(true);
    this.checkAvailability();
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
    if (!this.checkInStr || !this.checkOutStr) return;
    this.submitting.set(true);
    this.bookingError.set('');
    const p: any = {
      propId:         this.propId,
      arrival:        this.checkInStr + 'T16:00',
      departure:      this.checkOutStr + 'T11:00',
      numAdult:       this.guestCount,
      numChild:       0,
      guestFirstName: this.guest.firstName,
      guestName:      this.guest.lastName,
      guestEmail:     this.guest.email,
      guestPhone:     this.guest.phone,
      status:         'confirmed'
    };
    if (this.totalPrice() > 0) p.totalPrice = this.totalPrice();
    if (this.promoCodeApplied() && this.promoCode.trim()) p.promoCode = this.promoCode.trim();
    const payload = [p];
    this.svc.createBooking(this.slug, payload).subscribe({
      next: result => {
        this.submitting.set(false);
        const booking = Array.isArray(result) ? result[0] : result;
        const bookingId = booking?.bookingId ?? booking?.id;
        if (bookingId) {
          this.router.navigate(['/', this.slug, 'booking', bookingId]);
        } else {
          this.bookingError.set(this.translate.instant('bs.error_booking_id'));
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.bookingError.set(err?.error?.error ?? this.translate.instant('bs.error_booking'));
      }
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────

  formatPrice(amount: number): string {
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency: this.currency() }).format(amount);
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString(this.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  goBack() {
    this.router.navigate(['/', this.slug]);
  }

  initLang() {
    const saved = localStorage.getItem('bs_lang');
    const browser = navigator.language.slice(0, 2);
    const lang = this.langs.includes(saved ?? '') ? saved! : this.langs.includes(browser) ? browser : 'fr';
    this.currentLang = lang;
    this.translate.use(lang);
  }

  switchLang(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('bs_lang', lang);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private daysBetween(from: string, to: string): number {
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  }
}
