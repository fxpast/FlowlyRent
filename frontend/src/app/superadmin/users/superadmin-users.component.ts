import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatTableModule, MatChipsModule,
    MatProgressSpinnerModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatTooltipModule
  ],
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
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let u">
                @if (editingId() === u.id) {
                  <div class="pwd-inline">
                    <mat-form-field appearance="outline" class="pwd-field">
                      <mat-label>Nouveau mot de passe</mat-label>
                      <input matInput [type]="showPwd() ? 'text' : 'password'"
                             [(ngModel)]="newPwd" autocomplete="new-password" />
                      <button mat-icon-button matSuffix (click)="showPwd.set(!showPwd())" type="button">
                        <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </mat-form-field>
                    <button mat-flat-button color="primary"
                      [disabled]="saving() || newPwd.length < 8"
                      (click)="savePassword(u.id)">
                      @if (saving()) { <mat-spinner diameter="16" /> } @else { Enregistrer }
                    </button>
                    <button mat-icon-button (click)="cancelEdit()" matTooltip="Annuler">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  @if (pwdMsg()) {
                    <p class="pwd-msg" [class.success]="!pwdError()">{{ pwdMsg() }}</p>
                  }
                } @else {
                  <div class="action-row">
                    <button mat-icon-button (click)="startEdit(u.id)" matTooltip="Changer le mot de passe">
                      <mat-icon>lock_reset</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteUser(u)" matTooltip="Supprimer le compte">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </td>
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
    .pwd-inline { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .pwd-field { width: 220px; }
    .pwd-msg { font-size: 12px; margin: 0 0 4px; color: #d32f2f; }
    .pwd-msg.success { color: #2e7d32; }
    .action-row { display: flex; align-items: center; gap: 4px; }
  `]
})
export class SuperadminUsersComponent implements OnInit {
  users = signal<UserRow[]>([]);
  loading = signal(true);
  columns = ['id', 'email', 'name', 'plan', 'role', 'createdAt', 'actions'];

  editingId = signal<number | null>(null);
  newPwd = '';
  saving = signal(false);
  pwdMsg = signal('');
  pwdError = signal(false);
  showPwd = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<UserRow[]>(`${environment.apiUrl}/superadmin/users`).subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  startEdit(id: number): void {
    this.editingId.set(id);
    this.newPwd = '';
    this.pwdMsg.set('');
    this.showPwd.set(false);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.newPwd = '';
    this.pwdMsg.set('');
  }

  deleteUser(u: UserRow): void {
    if (!confirm(`Supprimer définitivement le compte "${u.email}" ? Cette action est irréversible.`)) return;
    this.http.delete(`${environment.apiUrl}/superadmin/users/${u.id}`).subscribe({
      next: () => this.users.update(all => all.filter(x => x.id !== u.id)),
      error: err => alert('Erreur : ' + (err.error?.message ?? 'suppression impossible (contraintes FK)'))
    });
  }

  savePassword(id: number): void {
    this.saving.set(true);
    this.pwdMsg.set('');
    this.http.patch(`${environment.apiUrl}/superadmin/users/${id}/password`, { newPassword: this.newPwd }).subscribe({
      next: () => {
        this.saving.set(false);
        this.pwdMsg.set('Mot de passe mis à jour');
        this.pwdError.set(false);
        setTimeout(() => this.cancelEdit(), 1500);
      },
      error: err => {
        this.saving.set(false);
        this.pwdMsg.set(err.error?.error ?? 'Erreur lors de la mise à jour');
        this.pwdError.set(true);
      }
    });
  }
}
