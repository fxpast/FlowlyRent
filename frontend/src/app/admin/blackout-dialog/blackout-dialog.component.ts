import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

export interface BlackoutDialogData {
  propertyName: string;
  startDate: string;
  endDate: string;
}

export interface BlackoutDialogResult {
  from: string;
  to: string;
  override: string;
}

@Component({
  selector: 'app-blackout-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule
  ],
  template: `
    <div class="dialog-header">
      <mat-icon class="header-icon">block</mat-icon>
      <span>Blocage calendrier</span>
    </div>

    <mat-dialog-content>
      <div class="prop-label">{{ data.propertyName }}</div>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Date début</mat-label>
          <input matInput type="date" [(ngModel)]="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date fin</mat-label>
          <input matInput type="date" [(ngModel)]="to">
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Type de blocage</mat-label>
        <mat-select [(ngModel)]="override">
          <mat-option value="blackout">Blackout (bloquer les dates)</mat-option>
          <mat-option value="none">Aucun (supprimer le blocage)</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!from || !to">
        <mat-icon>save</mat-icon> Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 24px 8px; font-size: 18px; font-weight: 600;
    }
    .header-icon { color: #f57c00; }
    mat-dialog-content { min-width: 340px; padding-top: 8px; }
    .prop-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 16px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { width: 100%; }
  `]
})
export class BlackoutDialogComponent {
  from: string;
  to: string;
  override = 'blackout';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BlackoutDialogData,
    private dialogRef: MatDialogRef<BlackoutDialogComponent>
  ) {
    this.from = data.startDate;
    this.to   = data.endDate;
  }

  save(): void {
    this.dialogRef.close({ from: this.from, to: this.to, override: this.override } as BlackoutDialogResult);
  }
}
