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
          <button mat-stroked-button (click)="retranslateAll()" [disabled]="retranslating()" [matTooltip]="'faq.retranslate_hint' | translate">
            @if (retranslating()) { <mat-spinner diameter="18" /> }
            @else { <mat-icon>translate</mat-icon> }
            {{ 'faq.retranslate' | translate }}
          </button>
          <button mat-raised-button color="primary" (click)="startAdd()">
            <mat-icon>add</mat-icon> {{ 'faq.add' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="center-spin"><mat-spinner diameter="40" /></div>
      } @else {

        <!-- Suggestions de l'assistant IA -->
        @if (suggestions().length > 0) {
          <mat-card class="suggestions-card">
            <mat-card-content>
              <h2 class="suggestions-title">
                <mat-icon>auto_awesome</mat-icon>
                {{ 'faq.suggestions_title' | translate }} ({{ suggestions().length }})
              </h2>
              <p class="suggestions-hint">{{ 'faq.suggestions_hint' | translate }}</p>
              @for (s of suggestions(); track s.id) {
                <div class="suggestion-item">
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ 'faq.question_label' | translate }}</mat-label>
                    <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1"
                              [(ngModel)]="s.question"></textarea>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ 'faq.answer_label' | translate }}</mat-label>
                    <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="3"
                              [placeholder]="'faq.suggestion_no_answer' | translate"
                              [(ngModel)]="s.answer"></textarea>
                  </mat-form-field>
                  <div class="suggestion-actions">
                    <button mat-button color="warn" (click)="rejectSuggestion(s.id)">
                      <mat-icon>close</mat-icon> {{ 'faq.reject' | translate }}
                    </button>
                    <button mat-raised-button color="primary" (click)="approveSuggestion(s)"
                            [disabled]="!s.question?.trim() || !s.answer?.trim()">
                      <mat-icon>check</mat-icon> {{ 'faq.approve' | translate }}
                    </button>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Feedbacks actions non gérées par le chatbot -->
        @if (actionFeedbacks().length > 0) {
          <mat-card class="actions-card">
            <mat-card-content>
              <h2 class="suggestions-title">
                <mat-icon>smart_toy</mat-icon>
                {{ 'faq.chatbot_actions_title' | translate }} ({{ actionFeedbacks().length }})
              </h2>
              <p class="suggestions-hint">{{ 'faq.chatbot_actions_hint' | translate }}</p>
              @for (fb of actionFeedbacks(); track fb.id) {
                <div class="suggestion-item">
                  <div class="action-row">
                    <div class="action-info">
                      <span class="action-lang mat-caption">{{ fb.lang?.toUpperCase() }}</span>
                      <span class="action-date mat-caption">{{ fb.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <button mat-icon-button color="warn" (click)="deleteActionFeedback(fb.id)"
                            [matTooltip]="'common.delete' | translate">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <p class="action-text"><strong>{{ 'faq.chatbot_action_label' | translate }} :</strong> {{ fb.action }}</p>
                  @if (fb.userMessage) {
                    <p class="action-msg">{{ fb.userMessage }}</p>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

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
    .suggestions-card { margin-bottom: 24px; border-left: 4px solid #f9a825; }
    .actions-card { margin-bottom: 24px; border-left: 4px solid #7b1fa2; }
    .action-row { display: flex; align-items: center; justify-content: space-between; }
    .action-info { display: flex; align-items: center; gap: 10px; }
    .action-lang { background: #ede7f6; color: #7b1fa2; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 700; }
    .action-date { font-size: 12px; color: #aaa; }
    .action-text { margin: 4px 0 2px; font-size: 14px; color: #333; }
    .action-msg { margin: 0; font-size: 13px; color: #777; font-style: italic; white-space: pre-wrap; }
    .suggestions-title { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 17px; font-weight: 700; }
    .suggestions-hint { margin: 0 0 16px; font-size: 13px; color: #777; }
    .suggestion-item { padding: 12px 0; border-top: 1px solid #eee; }
    .suggestion-item:first-of-type { border-top: none; padding-top: 0; }
    .suggestion-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
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
  items           = signal<any[]>([]);
  suggestions     = signal<any[]>([]);
  actionFeedbacks = signal<any[]>([]);
  loading         = signal(true);
  saving       = signal(false);
  editing      = signal(false);
  importing    = signal(false);
  retranslating = signal(false);

  form = { question: '', answer: '' };
  private editingId: number | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private t: TranslateService) {}

  ngOnInit(): void { this.load(); this.loadSuggestions(); this.loadActionFeedbacks(); }

  private load(): void {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/faq`).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private loadSuggestions(): void {
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/faq-suggestions`).subscribe({
      next: list => this.suggestions.set(list)
    });
  }

  private loadActionFeedbacks(): void {
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/chatbot-action-feedbacks`).subscribe({
      next: list => this.actionFeedbacks.set(list)
    });
  }

  deleteActionFeedback(id: number): void {
    this.http.delete(`${environment.apiUrl}/superadmin/chatbot-action-feedbacks/${id}`).subscribe({
      next: () => this.actionFeedbacks.update(list => list.filter(x => x.id !== id))
    });
  }

  approveSuggestion(s: any): void {
    const payload = { question: s.question, answer: s.answer };
    this.http.post<any>(`${environment.apiUrl}/superadmin/faq-suggestions/${s.id}/approve`, payload).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('faq.approved'), '', { duration: 2000 });
        this.suggestions.set(this.suggestions().filter(x => x.id !== s.id));
        this.load();
      }
    });
  }

  rejectSuggestion(id: number): void {
    if (!confirm(this.t.instant('faq.reject_confirm'))) return;
    this.http.delete(`${environment.apiUrl}/superadmin/faq-suggestions/${id}`).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('faq.rejected'), '', { duration: 2000 });
        this.suggestions.set(this.suggestions().filter(x => x.id !== id));
      }
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
    this.http.post<any>(`${environment.apiUrl}/superadmin/faq-import`, fd).subscribe({
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

  retranslateAll(): void {
    if (!confirm(this.t.instant('faq.retranslate_confirm'))) return;
    this.retranslating.set(true);
    this.http.post<any>(`${environment.apiUrl}/superadmin/faq/retranslate`, {}).subscribe({
      next: res => {
        this.retranslating.set(false);
        this.snackBar.open(this.t.instant('faq.retranslate_started', { count: res.count }), '', { duration: 3000 });
      },
      error: () => this.retranslating.set(false)
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
