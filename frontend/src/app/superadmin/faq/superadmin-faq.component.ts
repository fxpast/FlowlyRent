import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-superadmin-faq',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatDividerModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, CdkTextareaAutosize, TranslateModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>{{ 'faq.title' | translate }}</h1>
        <div class="header-actions">
          <button mat-stroked-button (click)="downloadTemplate()" [matTooltip]="'faq.template_hint' | translate">
            <mat-icon>download</mat-icon> {{ 'faq.template' | translate }}
          </button>
          <button mat-stroked-button (click)="fileInput.click()" [disabled]="importing()">
            @if (importing()) { <mat-spinner diameter="18" /> }
            @else { <mat-icon>upload_file</mat-icon> }
            {{ 'faq.import' | translate }}
          </button>
          <input #fileInput type="file" accept=".csv" style="display:none" (change)="onFileSelected($event)" />
          <button mat-raised-button color="primary" (click)="startAdd()">
            <mat-icon>add</mat-icon> {{ 'faq.add' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="center-spin"><mat-spinner diameter="40" /></div>
      } @else {

        <!-- Formulaire ajout / édition -->
        @if (editing()) {
          <mat-card class="edit-card">
            <mat-card-content>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'faq.question_label' | translate }}</mat-label>
                <input matInput [(ngModel)]="form.question" [placeholder]="'faq.question_label' | translate" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'faq.answer_label' | translate }}</mat-label>
                <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="4"
                          [(ngModel)]="form.answer" [placeholder]="'faq.answer_label' | translate"></textarea>
              </mat-form-field>
              <div class="edit-actions">
                <button mat-button (click)="cancelEdit()">{{ 'common.cancel' | translate }}</button>
                <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
                  @if (saving()) { <mat-spinner diameter="18" /> } @else { {{ 'faq.save' | translate }} }
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Liste des questions -->
        @if (items().length === 0 && !editing()) {
          <p class="empty">{{ 'faq.no_items' | translate }}</p>
        } @else {
          <div class="faq-list">
            @for (item of items(); track item.id; let i = $index) {
              <mat-card class="faq-card">
                <mat-card-content>
                  <div class="faq-header">
                    <span class="faq-num">{{ i + 1 }}</span>
                    <div class="faq-body">
                      <p class="faq-q">{{ item.question }}</p>
                      <p class="faq-a">{{ item.answer }}</p>
                    </div>
                    <div class="faq-actions">
                      <button mat-icon-button (click)="moveUp(i)" [disabled]="i === 0"
                              [matTooltip]="'faq.move_up' | translate">
                        <mat-icon>arrow_upward</mat-icon>
                      </button>
                      <button mat-icon-button (click)="moveDown(i)" [disabled]="i === items().length - 1"
                              [matTooltip]="'faq.move_down' | translate">
                        <mat-icon>arrow_downward</mat-icon>
                      </button>
                      <button mat-icon-button color="primary" (click)="startEdit(item)"
                              [matTooltip]="'common.edit' | translate">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="delete(item.id)"
                              [matTooltip]="'common.delete' | translate">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .edit-card { margin-bottom: 24px; border-left: 4px solid #0288d1; }
    .full { width: 100%; }
    .edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .faq-list { display: flex; flex-direction: column; gap: 12px; }
    .faq-card { border-radius: 10px; }
    .faq-header { display: flex; align-items: flex-start; gap: 12px; }
    .faq-num {
      min-width: 28px; height: 28px; background: #0288d1; color: white;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
    }
    .faq-body { flex: 1; min-width: 0; }
    .faq-q { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #111; }
    .faq-a { margin: 0; font-size: 13px; color: #555; line-height: 1.6; white-space: pre-wrap; }
    .faq-actions { display: flex; flex-shrink: 0; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #999; padding: 40px 0; font-size: 15px; }
    @media (max-width: 600px) { .page { padding: 16px; } }
  `]
})
export class SuperadminFaqComponent implements OnInit {
  items     = signal<any[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  editing   = signal(false);
  importing = signal(false);

  form = { question: '', answer: '' };
  private editingId: number | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/faq`).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  startAdd(): void {
    this.editingId = null;
    this.form = { question: '', answer: '' };
    this.editing.set(true);
  }

  startEdit(item: any): void {
    this.editingId = item.id;
    this.form = { question: item.question, answer: item.answer };
    this.editing.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void { this.editing.set(false); this.editingId = null; }

  save(): void {
    if (!this.form.question.trim() || !this.form.answer.trim()) return;
    this.saving.set(true);
    const req = this.editingId
      ? this.http.put<any>(`${environment.apiUrl}/superadmin/faq/${this.editingId}`, this.form)
      : this.http.post<any>(`${environment.apiUrl}/superadmin/faq`, this.form);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.editingId = null;
        this.snackBar.open(this.t.instant('faq.saved'), '', { duration: 2000 });
        this.load();
      },
      error: () => this.saving.set(false)
    });
  }

  delete(id: number): void {
    if (!confirm(this.t.instant('faq.delete_confirm'))) return;
    this.http.delete(`${environment.apiUrl}/superadmin/faq/${id}`).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('faq.deleted'), '', { duration: 2000 });
        this.load();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.importing.set(true);
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<any>(`${environment.apiUrl}/superadmin/faq/import`, fd).subscribe({
      next: res => {
        this.importing.set(false);
        this.snackBar.open(
          this.t.instant('faq.imported', { count: res.imported, skipped: res.skipped }),
          '', { duration: 3500 }
        );
        this.load();
      },
      error: () => this.importing.set(false)
    });
  }

  downloadTemplate(): void {
    const csv = 'question,answer\n"Comment fonctionne FlowlyRent ?","FlowlyRent est une plateforme SaaS de gestion de location saisonnière."\n"Comment connecter Beds24 ?","Rendez-vous dans Paramètres > Beds24 et collez votre token API."';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'faq_modele.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  moveUp(i: number): void { this.swap(i, i - 1); }
  moveDown(i: number): void { this.swap(i, i + 1); }

  private swap(a: number, b: number): void {
    const list = [...this.items()];
    const orderA = list[a].displayOrder;
    const orderB = list[b].displayOrder;
    this.http.put(`${environment.apiUrl}/superadmin/faq/${list[a].id}`, { displayOrder: orderB }).subscribe();
    this.http.put(`${environment.apiUrl}/superadmin/faq/${list[b].id}`, { displayOrder: orderA }).subscribe({
      next: () => this.load()
    });
  }
}
