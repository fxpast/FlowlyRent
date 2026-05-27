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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatTooltipModule
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
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Prénom</mat-label>
              <input matInput formControlName="guestFirstName" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="guestLastName">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="guestEmail" type="email">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="guestPhone">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pays</mat-label>
              <input matInput formControlName="guestCountry">
            </mat-form-field>
          </div>

          <h3>Réservation</h3>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Logement</mat-label>
              <mat-select formControlName="propId" required>
                @if (loadingProps()) {
                  <mat-option value="">Chargement…</mat-option>
                } @else {
                  @for (p of properties(); track p.id) {
                    <mat-option [value]="p.id">{{ p.name }}</mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Arrivée</mat-label>
              <input matInput formControlName="arrival" type="date" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Départ</mat-label>
              <input matInput formControlName="departure" type="date" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Adultes</mat-label>
              <input matInput formControlName="numAdult" type="number" min="1">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Enfants</mat-label>
              <input matInput formControlName="numChild" type="number" min="0">
            </mat-form-field>
          </div>

          <h3>Tarification</h3>
          <div class="form-row pricing-row">
            <mat-form-field appearance="outline">
              <mat-label>Frais de ménage (€)</mat-label>
              <input matInput formControlName="fraisMenage" type="number" min="0" step="0.01">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Taxe de séjour (€)</mat-label>
              <input matInput formControlName="taxeSejour" type="number" min="0" step="0.01">
              @if (estimateResult()) {
                <mat-hint>{{ estimateResult()!.nights }} nuit(s) · {{ estimateResult()!.nightsPrice | number:'1.2-2' }} € nuits</mat-hint>
              }
            </mat-form-field>
            <div class="calc-col">
              <button mat-stroked-button type="button"
                      [disabled]="!canEstimate || calculating()"
                      (click)="calculateEstimate()"
                      matTooltip="Calcule le prix à partir du calendrier Beds24">
                @if (calculating()) {
                  <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
                } @else {
                  <mat-icon>calculate</mat-icon>
                }
                Estimer
              </button>
            </div>
            <mat-form-field appearance="outline" class="total-field">
              <mat-label>Prix total (€)</mat-label>
              <input matInput formControlName="totalPrice" type="number" step="0.01" required>
              <mat-hint>Modifiable manuellement</mat-hint>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3"></textarea>
          </mat-form-field>

          <div class="actions">
            <button mat-button type="button" routerLink="/admin/bookings">Retour</button>
            @if (isEdit()) {
              <button mat-stroked-button color="warn" type="button" (click)="cancelBooking()" [disabled]="saving()">
                <mat-icon>cancel</mat-icon> Annuler la réservation
              </button>
            }
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ isEdit() ? 'Enregistrer' : 'Créer la réservation' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
    .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
    .pricing-row { grid-template-columns: 1fr 1fr auto 1fr; align-items: start; }
    .calc-col { display: flex; align-items: center; padding-top: 8px; }
    .calc-col button { height: 56px; }
    .total-field {}
    .full-width { width: 100%; margin-bottom: 16px; }
    .actions { display: flex; gap: 16px; justify-content: flex-end; margin-top: 16px; }
    h3 { color: #0288d1; margin: 16px 0 8px; }
    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; gap: 0; }
      .pricing-row { grid-template-columns: 1fr; }
      h1 { font-size: 20px; }
    }
  `]
})
export class BookingFormComponent implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  saving = signal(false);
  calculating = signal(false);
  loadingProps = signal(true);
  properties = signal<{ id: string; name: string }[]>([]);
  estimateResult = signal<{ nights: number; nightsPrice: number; taxeSejour: number } | null>(null);
  bookingId: string | null = null;

  get canEstimate(): boolean {
    const v = this.form?.value;
    return !!(v?.propId && v?.arrival && v?.departure && v.arrival < v.departure);
  }

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      guestFirstName: ['', Validators.required],
      guestLastName:  [''],
      guestEmail:     [''],
      guestPhone:     [''],
      guestCountry:   [''],
      propId:         ['', Validators.required],
      arrival:        ['', Validators.required],
      departure:      ['', Validators.required],
      numAdult:       [1, Validators.min(1)],
      numChild:       [0],
      fraisMenage:    [0],
      taxeSejour:     [0],
      totalPrice:     [null, Validators.required],
      notes:          ['']
    });
  }

  ngOnInit(): void {
    this.bookingService.getPropertyNames().subscribe({
      next: names => {
        this.properties.set(
          Object.entries(names).map(([id, name]) => ({ id, name: name || '#' + id }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        this.loadingProps.set(false);
      },
      error: () => this.loadingProps.set(false)
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.bookingId = id;
      const state = window.history.state;
      if (state?.booking) {
        this.form.patchValue(state.booking);
      } else {
        this.bookingService.getById(id).subscribe({
          next: (b: any) => this.form.patchValue(b),
          error: () => this.snackBar.open('Impossible de charger la réservation', 'Fermer', { duration: 4000 })
        });
      }
    }
  }

  calculateEstimate(): void {
    const v = this.form.value;
    this.calculating.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/bookings/estimate`, {
      params: { propId: v.propId, arrival: v.arrival, departure: v.departure }
    }).subscribe({
      next: (res) => {
        this.estimateResult.set(res);
        const menage = +(this.form.value.fraisMenage || 0);
        const total = (res.nightsPrice || 0) + menage + (res.taxeSejour || 0);
        this.form.patchValue({
          taxeSejour: res.taxeSejour,
          totalPrice: Math.round(total * 100) / 100
        });
        this.calculating.set(false);
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.detail || err.error?.title || err.statusText || 'Erreur lors du calcul';
        this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        this.calculating.set(false);
      }
    });
  }

  cancelBooking(): void {
    const name = `${this.form.value.guestFirstName} ${this.form.value.guestLastName}`.trim();
    if (!confirm(`Annuler la réservation de ${name || 'ce voyageur'} ?`)) return;
    this.saving.set(true);
    this.bookingService.cancel(this.bookingId!).subscribe({
      next: () => {
        this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 });
        this.router.navigate(['/admin/bookings']);
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur lors de l\'annulation', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload: any = { ...this.form.value };
    if (this.bookingId) payload['id'] = this.bookingId;

    this.bookingService.save([payload]).subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Réservation modifiée' : 'Réservation créée', 'OK', { duration: 3000 });
        this.router.navigate(['/admin/bookings']);
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.error || 'Erreur lors de la sauvegarde', 'OK', { duration: 5000 });
        this.saving.set(false);
      }
    });
  }
}
