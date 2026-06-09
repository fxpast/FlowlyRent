import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

export interface PriceDialogData {
  propertyName: string;
  date: string;
  field: 'price' | 'minStay';
  price?: number;
  minStay?: number;
}

export interface PriceDialogResult {
  from: string;
  to: string;
  price: number | null;
  minStay: number | null;
}

@Component({
  selector: 'app-price-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule, TranslateModule
  ],
  template: `
    <div class="dialog-header">
      <mat-icon class="header-icon" [style.color]="data.field === 'price' ? '#2e7d32' : '#0288d1'">
        {{ data.field === 'price' ? 'euro' : 'schedule' }}
      </mat-icon>
      <span>{{ (data.field === 'price' ? 'calendar.price_title' : 'calendar.minstay_title') | translate }}</span>
    </div>

    <mat-dialog-content>
      <div class="prop-label">{{ data.propertyName }}</div>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'calendar.date_start' | translate }}</mat-label>
          <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDateVal" (ngModelChange)="from = fromDate($event)">
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'calendar.date_end' | translate }}</mat-label>
          <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDateVal" (ngModelChange)="to = fromDate($event)">
          <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>
      </div>
      @if (data.field === 'price') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'calendar.price_label' | translate }}</mat-label>
          <input matInput type="number" min="0" step="0.01" [(ngModel)]="price" placeholder="—">
          <mat-icon matSuffix>euro</mat-icon>
        </mat-form-field>
      } @else {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'calendar.minstay_label' | translate }}</mat-label>
          <input matInput type="number" min="1" step="1" [(ngModel)]="minStay" placeholder="—">
          <mat-icon matSuffix>schedule</mat-icon>
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!from || !to">
        <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 24px 8px; font-size: 18px; font-weight: 600;
    }
    .header-icon { color: #2e7d32; }
    mat-dialog-content { min-width: 360px; padding-top: 8px; }
    .prop-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 16px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { width: 100%; }
  `]
})
export class PriceDialogComponent {
  from: string;
  to: string;
  fromDateVal: Date | null;
  toDateVal: Date | null;
  price: number | null;
  minStay: number | null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PriceDialogData,
    private dialogRef: MatDialogRef<PriceDialogComponent>
  ) {
    this.from    = data.date;
    this.to      = data.date;
    this.fromDateVal = this.toDate(data.date);
    this.toDateVal   = this.toDate(data.date);
    this.price   = data.price   ?? null;
    this.minStay = data.minStay ?? null;
  }

  save(): void {
    this.dialogRef.close({
      from: this.from, to: this.to,
      price: this.price, minStay: this.minStay
    } as PriceDialogResult);
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
