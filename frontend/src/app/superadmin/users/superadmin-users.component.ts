import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  role: string;
  active: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-superadmin-users',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <h2>Utilisateurs <span class="count">({{ users().length }})</span></h2>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="users()" class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let u">{{ u.id }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let u">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nom</th>
              <td mat-cell *matCellDef="let u">{{ u.firstName }} {{ u.lastName }}</td>
            </ng-container>
            <ng-container matColumnDef="plan">
              <th mat-header-cell *matHeaderCellDef>Plan</th>
              <td mat-cell *matCellDef="let u">
                <span class="chip chip-plan">{{ u.plan }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Rôle</th>
              <td mat-cell *matCellDef="let u">
                <span class="chip" [class.chip-admin]="u.role === 'ADMIN'" [class.chip-user]="u.role === 'USER'">
                  {{ u.role }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Inscrit le</th>
              <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    h2 { margin: 0 0 24px; font-size: 24px; font-weight: 500; }
    .count { font-size: 16px; color: #999; font-weight: 400; }
    .loading { display: flex; justify-content: center; margin-top: 80px; }
    .full-width { width: 100%; }
    mat-card-content { padding: 0; }
    .chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; display: inline-block; }
    .chip-admin { background: #e8f0fe; color: #1a73e8; }
    .chip-user  { background: #f1f3f4; color: #555; }
    .chip-plan  { background: #e6f4ea; color: #1e7e34; }
  `]
})
export class SuperadminUsersComponent implements OnInit {
  users = signal<UserRow[]>([]);
  loading = signal(true);
  columns = ['id', 'email', 'name', 'plan', 'role', 'createdAt'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<UserRow[]>(`${environment.apiUrl}/superadmin/users`).subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
