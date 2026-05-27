import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule
  ],
  template: `
    <div class="dialog-header">
      <div class="guest-name">{{ guestName() }}</div>
      <span class="booking-id">#{{ draft['id'] }}</span>
    </div>

    <mat-dialog-content>
      <div class="edit-grid">
        <div class="prop-row">
          <mat-icon>home</mat-icon>
          <span>{{ draft['propName'] || draft['propertyName'] || ('Propriété ' + (draft['propId'] || draft['propertyId'] || '—')) }}</span>
        </div>
        <mat-divider/>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput [(ngModel)]="draft['guestFirstName']">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput [(ngModel)]="draft['guestLastName']">
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput [(ngModel)]="draft['guestEmail']" type="email">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput [(ngModel)]="draft['guestPhone']">
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Pays</mat-label>
            <input matInput [(ngModel)]="draft['guestCountry']">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="draft['status']">
              <mat-option value="new">New</mat-option>
              <mat-option value="confirmed">Confirmed</mat-option>
              <mat-option value="cancelled">Cancelled</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <mat-divider/>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Arrivée</mat-label>
            <input matInput type="date" [(ngModel)]="draft['arrival']">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Départ</mat-label>
            <input matInput type="date" [(ngModel)]="draft['departure']">
          </mat-form-field>
        </div>
        <div class="row-3">
          <mat-form-field appearance="outline">
            <mat-label>Adultes</mat-label>
            <input matInput type="number" min="0" [(ngModel)]="draft['numAdult']">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Enfants</mat-label>
            <input matInput type="number" min="0" [(ngModel)]="draft['numChild']">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Montant (€)</mat-label>
            <input matInput type="number" step="0.01" [(ngModel)]="draft['totalPrice']">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" [(ngModel)]="draft['notes']"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving()">Fermer</button>
      @if (draft['status'] !== 'cancelled') {
        <button mat-stroked-button color="warn" (click)="cancel()" [disabled]="saving()">
          <mat-icon>cancel</mat-icon> Annuler résa
        </button>
      }
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
        <mat-icon>save</mat-icon> {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header { display: flex; align-items: baseline; gap: 12px; padding: 20px 24px 8px; }
    .guest-name { font-size: 20px; font-weight: 600; flex: 1; }
    .booking-id { font-size: 12px; color: #aaa; }

    mat-dialog-content { min-width: 360px; max-width: 540px; padding-top: 8px; }
    .edit-grid { display: flex; flex-direction: column; gap: 0; }
    .prop-row { display: flex; align-items: center; gap: 8px; padding: 4px 0 8px; font-size: 15px; font-weight: 500; color: #333; }
    .prop-row mat-icon { color: #0288d1; font-size: 20px; width: 20px; height: 20px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .full { width: 100%; }
    mat-divider { margin: 4px 0 12px; }
  `]
})
export class BookingDetailDialogComponent {
  saving = signal(false);
  draft: Record<string, any>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BookingDetailDialogComponent>,
    private bookingService: BookingService,
    private snackBar: MatSnackBar
  ) {
    // Copie + normalisation des noms de champs Beds24 (variantes possibles)
    const d: Record<string, any> = { ...data };
    d['guestFirstName'] = d['guestFirstName'] || d['firstName'] || '';
    d['guestLastName']  = d['guestLastName']  || d['lastName']  || '';
    d['guestEmail']     = d['guestEmail']     || d['email']     || '';
    d['guestPhone']     = d['guestPhone']     || d['phone']     || d['guestMobile'] || '';
    d['guestCountry']   = d['guestCountry']   || '';
    d['propId']         = d['propId']         || d['propertyId'] || '';
    d['propName']       = d['propName']       || d['propertyName'] || '';
    d['totalPrice']     = d['totalPrice']     ?? d['price']     ?? null;
    d['notes']          = d['notes']          || d['internalNotes'] || '';
    d['arrival']        = (d['arrival']    || '').toString().substring(0, 10);
    d['departure']      = (d['departure']  || '').toString().substring(0, 10);
    // Si guestName seul (données calendrier avant fix backend), parse prénom/nom
    if (!d['guestFirstName'] && !d['guestLastName'] && d['guestName']) {
      const parts = (d['guestName'] as string).split(' ');
      d['guestFirstName'] = parts[0] || '';
      d['guestLastName']  = parts.slice(1).join(' ') || '';
    }
    this.draft = d;
  }

  guestName(): string {
    const first = this.draft['guestFirstName'] || '';
    const last  = this.draft['guestLastName']  || '';
    return (first + ' ' + last).trim() || this.data['guestName'] || 'Voyageur';
  }

  save(): void {
    this.saving.set(true);
    this.bookingService.save([this.draft]).subscribe({
      next: () => {
        this.snackBar.open('Réservation mise à jour', 'OK', { duration: 3000 });
        this.dialogRef.close({ updated: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }

  cancel(): void {
    if (!confirm(`Annuler la réservation de ${this.guestName()} ?`)) return;
    this.saving.set(true);
    this.bookingService.cancel(String(this.draft['id'])).subscribe({
      next: () => {
        this.snackBar.open('Réservation annulée', 'OK', { duration: 3000 });
        this.dialogRef.close({ cancelled: true });
      },
      error: err => {
        this.snackBar.open(err.error?.error ?? 'Erreur', 'Fermer', { duration: 4000 });
        this.saving.set(false);
      }
    });
  }
}
