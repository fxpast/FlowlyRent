import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatSnackBarModule
  ],
  template: `
    <div class="header">
      <h1>{{ isEdit() ? 'Modifier la réservation' : 'Nouvelle réservation directe' }}</h1>
      <a mat-button routerLink="/admin/bookings">
        <mat-icon>arrow_back</mat-icon> Retour
      </a>
    </div>

    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <h3>Voyageur</h3>
          <div class="form-row" formGroupName="guest">
            <mat-form-field appearance="outline">
              <mat-label>Prénom</mat-label>
              <input matInput formControlName="firstName" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="lastName" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="phone">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pays</mat-label>
              <input matInput formControlName="country">
            </mat-form-field>
          </div>

          <h3>Réservation</h3>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>ID Logement</mat-label>
              <input matInput formControlName="propertyId" type="number" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Arrivée</mat-label>
              <input matInput formControlName="checkIn" type="date" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Départ</mat-label>
              <input matInput formControlName="checkOut" type="date" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nombre de voyageurs</mat-label>
              <input matInput formControlName="guestCount" type="number" min="1">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Montant total (€)</mat-label>
              <input matInput formControlName="totalAmount" type="number" step="0.01">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Source</mat-label>
              <mat-select formControlName="source">
                <mat-option value="DIRECT">Direct</mat-option>
                <mat-option value="BOOKING_COM">Booking.com</mat-option>
                <mat-option value="AIRBNB">Airbnb</mat-option>
                <mat-option value="ABRITEL">Abritel</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3"></textarea>
          </mat-form-field>

          <div class="actions">
            <button mat-button type="button" routerLink="/admin/bookings">Annuler</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ isEdit() ? 'Enregistrer' : 'Créer la réservation' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .actions { display: flex; gap: 16px; justify-content: flex-end; margin-top: 16px; }
    h3 { color: #1a237e; margin: 16px 0 8px; }
  `]
})
export class BookingFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  saving = signal(false);
  bookingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      guest: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        country: ['']
      }),
      propertyId: [null, Validators.required],
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      guestCount: [1, Validators.min(1)],
      totalAmount: [null],
      source: ['DIRECT'],
      notes: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.bookingId = +id;
      this.bookingService.getById(+id).subscribe(b => {
        this.form.patchValue({
          guest: b.guest,
          propertyId: b.property?.id,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guestCount: b.guestCount,
          totalAmount: b.totalAmount,
          source: b.source,
          notes: b.notes
        });
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;

    const obs = this.isEdit() && this.bookingId
      ? this.bookingService.update(this.bookingId, val)
      : this.bookingService.create(val);

    obs.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Réservation modifiée' : 'Réservation créée', 'OK', { duration: 3000 });
        this.router.navigate(['/admin/bookings']);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur lors de la sauvegarde', 'OK', { duration: 5000 });
        this.saving.set(false);
      }
    });
  }
}
