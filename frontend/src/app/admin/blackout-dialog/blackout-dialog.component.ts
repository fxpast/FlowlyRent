import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

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
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule, TranslateModule
  ],
  template: `
    <div class="dialog-header">
      <mat-icon class="header-icon">block</mat-icon>
      <span>{{ 'calendar.block_dialog_title' | translate }}</span>
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
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'calendar.block_type' | translate }}</mat-label>
        <mat-select [(ngModel)]="override">
          <mat-option value="blackout">{{ 'calendar.block_blackout_option' | translate }}</mat-option>
          <mat-option value="none">{{ 'calendar.block_none_option' | translate }}</mat-option>
        </mat-select>
      </mat-form-field>
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
    .header-icon { color: #546e7a; }
    mat-dialog-content { min-width: 340px; padding-top: 8px; }
    .prop-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 16px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { width: 100%; }
  `]
})
export class BlackoutDialogComponent {
  from: string;
  to: string;
  fromDateVal: Date | null;
  toDateVal: Date | null;
  override = 'blackout';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BlackoutDialogData,
    private dialogRef: MatDialogRef<BlackoutDialogComponent>
  ) {
    this.from = data.startDate;
    this.to   = data.endDate;
    this.fromDateVal = this.toDate(data.startDate);
    this.toDateVal   = this.toDate(data.endDate);
  }

  save(): void {
    this.dialogRef.close({ from: this.from, to: this.to, override: this.override } as BlackoutDialogResult);
  }

  toDate(s: string): Date | null { return s ? new Date(s + 'T12:00:00') : null; }
  fromDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
