import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaymentService } from '../../core/services/payment.service';
import { Payment } from '../../core/models/payment.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatInputModule, MatSnackBarModule, MatDialogModule,
    TranslateModule
  ],
  template: `
    <h1>{{ 'payments.page_title' | translate }}</h1>

    <div class="create-payment">
      <mat-card>
        <mat-card-header><mat-card-title>{{ 'payments.create_title' | translate }}</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'payments.booking_id' | translate }}</mat-label>
              <input matInput [(ngModel)]="selectedBookingId" type="number" placeholder="Ex: 42">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="createCheckout()" [disabled]="!selectedBookingId">
              <mat-icon>link</mat-icon> {{ 'payments.create_link_btn' | translate }}
            </button>
          </div>
          @if (checkoutUrl()) {
            <div class="checkout-url">
              <a [href]="checkoutUrl()" target="_blank" mat-raised-button color="accent">
                <mat-icon>open_in_new</mat-icon> {{ 'payments.open_link' | translate }}
              </a>
              <span class="url-text">{{ checkoutUrl() }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>

    <mat-card>
      <mat-card-header><mat-card-title>{{ 'payments.history' | translate }}</mat-card-title></mat-card-header>
      <mat-card-content>
        <table mat-table [dataSource]="payments()" class="full-width">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let p">{{ p.id }}</td>
          </ng-container>
          <ng-container matColumnDef="booking">
            <th mat-header-cell *matHeaderCellDef>{{ 'payments.booking_ref' | translate }}</th>
            <td mat-cell *matCellDef="let p">{{ p.booking?.confirmationCode || 'N/A' }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.amount' | translate }}</th>
            <td mat-cell *matCellDef="let p">{{ p.amount | currency:'EUR':'symbol':'1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let p">
              <mat-chip [class]="'status-' + p.status?.toLowerCase()">{{ 'payments.status_' + p.status?.toLowerCase() | translate }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="stripeId">
            <th mat-header-cell *matHeaderCellDef>Stripe ID</th>
            <td mat-cell *matCellDef="let p">
              <small>{{ p.stripePaymentIntentId || p.stripeCheckoutSessionId || '-' }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="paidAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'payments.paid_at' | translate }}</th>
            <td mat-cell *matCellDef="let p">{{ p.paidAt ? (p.paidAt | date:'dd/MM/yyyy HH:mm') : '-' }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'payments.created_at' | translate }}</th>
            <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'dd/MM/yyyy' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        @if (payments().length === 0) {
          <p class="empty">{{ 'payments.no_payments' | translate }}</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }
    .create-payment { margin-bottom: 16px; }
    .form-row { display: flex; gap: 16px; align-items: center; }
    .checkout-url { margin-top: 12px; display: flex; align-items: center; gap: 12px; }
    .url-text { font-size: 12px; color: #666; word-break: break-all; }
    .full-width { width: 100%; }
    .empty { text-align: center; padding: 24px; color: #999; }
    .status-completed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background: #fff3e0 !important; color: #e65100 !important; }
    .status-failed { background: #ffebee !important; color: #c62828 !important; }
    .status-refunded { background: #e3f2fd !important; color: #1565c0 !important; }
    small { font-size: 11px; color: #666; }
  `]
})
export class PaymentsComponent implements OnInit {
  payments = signal<Payment[]>([]);
  selectedBookingId: number | null = null;
  checkoutUrl = signal('');
  columns = ['id', 'booking', 'amount', 'status', 'stripeId', 'paidAt', 'createdAt'];

  constructor(private paymentService: PaymentService, private snackBar: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void {
    this.paymentService.getAll().subscribe(data => this.payments.set(data));
  }

  createCheckout(): void {
    if (!this.selectedBookingId) return;
    this.paymentService.createCheckoutSession(this.selectedBookingId).subscribe({
      next: (res) => {
        this.checkoutUrl.set(res.url);
        this.snackBar.open(this.t.instant('payments.link_created'), this.t.instant('common.ok'), { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.t.instant('payments.stripe_error'), this.t.instant('common.ok'), { duration: 5000 });
      }
    });
  }
}
