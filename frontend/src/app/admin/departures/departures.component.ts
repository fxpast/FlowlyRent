import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BookingService } from '../../core/services/booking.service';
import { Booking } from '../../core/models/booking.model';

@Component({
  selector: 'app-departures',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatChipsModule, MatButtonModule, MatIconModule],
  template: `
    <h1>Départs</h1>

    <div class="week-nav">
      <button mat-icon-button (click)="prevWeek()"><mat-icon>chevron_left</mat-icon></button>
      <span class="week-label">{{ weekLabel() }}</span>
      <button mat-icon-button (click)="nextWeek()"><mat-icon>chevron_right</mat-icon></button>
      <button mat-button (click)="goToCurrentWeek()">Cette semaine</button>
    </div>

    <mat-card>
      <mat-card-content>
        <table mat-table [dataSource]="departures()" class="full-width">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date de départ</th>
            <td mat-cell *matCellDef="let b">{{ b.checkOut | date:'EEEE dd/MM':'':'fr' }}</td>
          </ng-container>
          <ng-container matColumnDef="guest">
            <th mat-header-cell *matHeaderCellDef>Voyageur</th>
            <td mat-cell *matCellDef="let b">{{ b.guest?.firstName }} {{ b.guest?.lastName }}</td>
          </ng-container>
          <ng-container matColumnDef="property">
            <th mat-header-cell *matHeaderCellDef>Logement</th>
            <td mat-cell *matCellDef="let b">{{ b.property?.name }}</td>
          </ng-container>
          <ng-container matColumnDef="checkin">
            <th mat-header-cell *matHeaderCellDef>Arrivée</th>
            <td mat-cell *matCellDef="let b">{{ b.checkIn | date:'dd/MM/yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="nights">
            <th mat-header-cell *matHeaderCellDef>Nuits</th>
            <td mat-cell *matCellDef="let b">{{ b.nightsCount }}</td>
          </ng-container>
          <ng-container matColumnDef="source">
            <th mat-header-cell *matHeaderCellDef>Source</th>
            <td mat-cell *matCellDef="let b"><mat-chip>{{ b.source }}</mat-chip></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let b">
              <mat-chip [class]="'status-' + b.status?.toLowerCase()">{{ b.status }}</mat-chip>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
        @if (departures().length === 0) {
          <p class="empty">Aucun départ cette semaine</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }
    .week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .week-label { font-size: 16px; font-weight: 500; min-width: 200px; text-align: center; }
    .full-width { width: 100%; }
    .empty { text-align: center; padding: 24px; color: #999; }
    .status-confirmed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-completed { background: #e3f2fd !important; color: #1565c0 !important; }
  `]
})
export class DeparturesComponent implements OnInit {
  departures = signal<Booking[]>([]);
  weekStart = signal(this.getMonday(new Date()));
  columns = ['date', 'guest', 'property', 'checkin', 'nights', 'source', 'status'];

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const ws = this.weekStart().toISOString().split('T')[0];
    this.bookingService.getDepartures(ws).subscribe(data => this.departures.set(data));
  }

  prevWeek(): void {
    const d = new Date(this.weekStart()); d.setDate(d.getDate() - 7);
    this.weekStart.set(d); this.load();
  }
  nextWeek(): void {
    const d = new Date(this.weekStart()); d.setDate(d.getDate() + 7);
    this.weekStart.set(d); this.load();
  }
  goToCurrentWeek(): void {
    this.weekStart.set(this.getMonday(new Date())); this.load();
  }
  weekLabel(): string {
    const start = this.weekStart();
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  private getMonday(d: Date): Date {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}
