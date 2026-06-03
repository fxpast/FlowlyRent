import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Location } from '@angular/common';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';

function requireContact(group: AbstractControl): ValidationErrors | null {
  const email = (group.get('guestEmail')?.value ?? '').trim();
  const phone = (group.get('guestPhone')?.value ?? '').trim();
  return email || phone ? null : { requireContact: true };
}

@Component({
  selector: 'app-booking-form',
  standalone: true,
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="header">
      <h1>{{ isEdit() ? 'Modifier la réservation' : 'Nouvelle réservation directe' }}</h1>
      <button mat-button type="button" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon> Retour
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <h3>Voyageur</h3>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Prénom *</mat-label>
              <input matInput formControlName="guestFirstName">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="guestLastName">
            </mat-form-field>
            <mat-form-field appearance="outline"
              [class.contact-required]="submitted && form.hasError('requireContact')">
              <mat-label>Email <span class="contact-or">*</span></mat-label>
              <input matInput formControlName="guestEmail" type="email" autocomplete="off">
              @if (form.get('guestEmail')?.hasError('email') && form.get('guestEmail')?.touched) {
                <mat-error>Format d'email invalide</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline"
              [class.contact-required]="submitted && form.hasError('requireContact')">
              <mat-label>Téléphone <span class="contact-or">*</span></mat-label>
              <input matInput formControlName="guestPhone" autocomplete="off">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pays</mat-label>
              <input matInput formControlName="guestCountry">
            </mat-form-field>
          </div>

          @if (submitted && form.hasError('requireContact')) {
            <div class="contact-error">
              <mat-icon>error_outline</mat-icon>
              Email ou téléphone obligatoire — veuillez renseigner au moins un moyen de contact.
            </div>
          }

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
            <div class="datetime-pair">
              <mat-form-field appearance="outline" class="date-part">
                <mat-label>Arrivée</mat-label>
                <input matInput [matDatepicker]="arrivalPicker" formControlName="arrival" required [min]="isEdit() ? null : today">
                <mat-datepicker-toggle matIconSuffix [for]="arrivalPicker"></mat-datepicker-toggle>
                <mat-datepicker #arrivalPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" class="time-part">
                <mat-label>Heure</mat-label>
                <input matInput type="time" [(ngModel)]="arrivalTime" [ngModelOptions]="{standalone: true}">
              </mat-form-field>
            </div>
            <div class="datetime-pair">
              <mat-form-field appearance="outline" class="date-part">
                <mat-label>Départ</mat-label>
                <input matInput [matDatepicker]="departurePicker" formControlName="departure"
                       required [min]="minDeparture">
                <mat-datepicker-toggle matIconSuffix [for]="departurePicker"></mat-datepicker-toggle>
                <mat-datepicker #departurePicker [startAt]="form.get('arrival')?.value"></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" class="time-part">
                <mat-label>Heure</mat-label>
                <input matInput type="time" [(ngModel)]="departureTime" [ngModelOptions]="{standalone: true}">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Adultes</mat-label>
              <input matInput formControlName="numAdult" type="number" min="1">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Enfants</mat-label>
              <input matInput formControlName="numChild" type="number" min="0">
            </mat-form-field>
          </div>

          <!-- Avertissement de chevauchement / date passée -->
          @if (overlapError()) {
            <div class="overlap-warning">
              <mat-icon>warning_amber</mat-icon>
              <span>{{ overlapError() }}</span>
            </div>
          }
          @if (checkingOverlap()) {
            <div class="checking-overlap">
              <mat-spinner diameter="16"></mat-spinner>
              <span>Vérification des disponibilités…</span>
            </div>
          }

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
            <button mat-button type="button" (click)="goBack()">Retour</button>
            @if (isEdit()) {
              <button mat-stroked-button color="warn" type="button" (click)="cancelBooking()" [disabled]="saving()">
                <mat-icon>cancel</mat-icon> Annuler la réservation
              </button>
            }
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="form.invalid || saving() || checkingOverlap() || !!overlapError()">
              @if (checkingOverlap()) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
                Vérification…
              } @else {
                {{ isEdit() ? 'Enregistrer' : 'Créer la réservation' }}
              }
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
    .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
    .datetime-pair { display: flex; gap: 8px; align-items: flex-start; }
    .date-part { flex: 1; }
    .time-part { width: 110px; flex-shrink: 0; }
    .pricing-row { grid-template-columns: 1fr 1fr auto 1fr; align-items: start; }
    .calc-col { display: flex; align-items: center; padding-top: 8px; }
    .calc-col button { height: 56px; }
    .total-field {}
    .full-width { width: 100%; margin-bottom: 16px; }
    .actions { display: flex; gap: 16px; justify-content: flex-end; margin-top: 16px; }
    h3 { color: #0288d1; margin: 16px 0 8px; }

    .contact-or { color: #e65100; font-weight: 700; }
    ::ng-deep .contact-required .mdc-notched-outline__leading,
    ::ng-deep .contact-required .mdc-notched-outline__notch,
    ::ng-deep .contact-required .mdc-notched-outline__trailing {
      border-color: #e65100 !important;
    }
    .contact-error {
      display: flex; align-items: center; gap: 8px;
      background: #fff3e0; border: 1px solid #f57c00;
      border-radius: 6px; padding: 10px 14px;
      margin-bottom: 16px; color: #e65100; font-size: 13px;
    }
    .contact-error mat-icon { color: #f57c00; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .overlap-warning {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fff3e0; border: 1px solid #f57c00;
      border-radius: 6px; padding: 12px 16px;
      margin-bottom: 16px; color: #e65100;
    }
    .overlap-warning mat-icon { color: #f57c00; flex-shrink: 0; margin-top: 2px; }
    .overlap-item { font-size: 13px; margin-top: 4px; }

    .checking-overlap {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: #888;
      margin-bottom: 16px;
    }

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
  checkingOverlap = signal(false);
  overlapError = signal<string | null>(null);
  readonly today = new Date();
  properties = signal<{ id: string; name: string }[]>([]);
  estimateResult = signal<{ nights: number; nightsPrice: number; taxeSejour: number } | null>(null);
  bookingId: string | null = null;
  submitted = false;
  arrivalTime   = '16:00';
  departureTime = '11:00';

  get canEstimate(): boolean {
    const arr = this.toDateStr(this.form?.value?.arrival);
    const dep = this.toDateStr(this.form?.value?.departure);
    return !!(this.form?.value?.propId && arr && dep && arr < dep);
  }

  get minDeparture(): Date | null {
    const a = this.form.get('arrival')?.value;
    if (!a) return null;
    const d = new Date(a instanceof Date ? a : new Date(a + 'T12:00:00'));
    d.setDate(d.getDate() + 1);
    return d;
  }

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      guestFirstName: ['', Validators.required],
      guestLastName:  [''],
      guestEmail:     ['', Validators.email],
      guestPhone:     [''],
      guestCountry:   [''],
      propId:         ['', Validators.required],
      arrival:        [null, Validators.required],
      departure:      [null, Validators.required],
      numAdult:       [1, Validators.min(1)],
      numChild:       [0],
      fraisMenage:    [0],
      taxeSejour:     [0],
      totalPrice:     [null, Validators.required],
      notes:          ['']
    }, { validators: requireContact });
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

    // Efface le message d'erreur dès que l'utilisateur modifie les dates
    this.form.get('propId')!.valueChanges.subscribe(() => this.overlapError.set(null));
    this.form.get('arrival')!.valueChanges.subscribe(() => {
      const arr = this.form.get('arrival')!.value;
      const dep = this.form.get('departure')!.value;
      if (arr && dep && dep <= arr) this.form.get('departure')!.setValue(null);
      this.overlapError.set(null);
    });
    this.form.get('departure')!.valueChanges.subscribe(() => this.overlapError.set(null));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.bookingId = id;
      const state = window.history.state;
      if (state?.booking) {
        this.patchBooking(state.booking);
      } else {
        this.bookingService.getById(id).subscribe({
          next: (b: any) => this.patchBooking(b),
          error: () => this.snackBar.open('Impossible de charger la réservation', 'Fermer', { duration: 4000 })
        });
      }
    }
  }

  private patchBooking(b: any): void {
    const rawArr = (b.arrival   || '').toString();
    const rawDep = (b.departure || '').toString();
    if (rawArr.includes('T')) this.arrivalTime   = rawArr.substring(11, 16) || '16:00';
    if (rawDep.includes('T')) this.departureTime = rawDep.substring(11, 16) || '11:00';
    this.form.patchValue({
      ...b,
      arrival:   this.parseDate(rawArr),
      departure: this.parseDate(rawDep)
    });
  }

  private parseDate(s: string | null | undefined): Date | null {
    if (!s) return null;
    return new Date(s.substring(0, 10) + 'T12:00:00');
  }

  private toDateStr(d: Date | string | null | undefined): string {
    if (!d) return '';
    if (typeof d === 'string') return d.substring(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  calculateEstimate(): void {
    const v = this.form.value;
    const arrival   = this.toDateStr(v.arrival);
    const departure = this.toDateStr(v.departure);
    this.calculating.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/bookings/estimate`, {
      params: { propId: v.propId, arrival, departure }
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

  goBack(): void { this.location.back(); }

  cancelBooking(): void {
    const name = `${this.form.value.guestFirstName} ${this.form.value.guestLastName}`.trim();
    if (!confirm(`Annuler la réservation de ${name || 'ce voyageur'} ?`)) return;
    this.saving.set(true);
    this.bookingService.cancel(this.bookingId!).subscribe({
      next: () => {
        this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 });
        this.goBack();
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur lors de l\'annulation', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    const v    = this.form.value;
    const arrival   = this.toDateStr(v.arrival);
    const departure = this.toDateStr(v.departure);

    if (!this.isEdit() && arrival < this.toDateStr(this.today)) {
      this.overlapError.set('La date d\'arrivée ne peut pas être dans le passé.');
      return;
    }

    this.checkingOverlap.set(true);
    this.overlapError.set(null);
    const params: any = { propId: String(v.propId), arrival, departure };
    if (this.bookingId) params['excludeId'] = this.bookingId;

    this.http.get<any[]>(`${environment.apiUrl}/admin/bookings/overlap`, { params }).subscribe({
      next: conflicts => {
        this.checkingOverlap.set(false);
        if (conflicts.length > 0) {
          this.overlapError.set('Période non disponible.');
          return;
        }
        this.doSave(v, arrival, departure);
      },
      error: () => {
        this.checkingOverlap.set(false);
        this.doSave(v, arrival, departure);
      }
    });
  }

  private doSave(v: any, arrival: string, departure: string): void {
    this.saving.set(true);
    const payload: any = {
      ...v,
      arrival:   arrival   + 'T' + this.arrivalTime,
      departure: departure + 'T' + this.departureTime
    };
    if (this.bookingId) payload['id'] = this.bookingId;

    this.bookingService.save([payload]).subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Réservation modifiée' : 'Réservation créée', 'OK', { duration: 3000 });
        this.goBack();
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.error || 'Erreur lors de la sauvegarde', 'OK', { duration: 5000 });
        this.saving.set(false);
      }
    });
  }
}
