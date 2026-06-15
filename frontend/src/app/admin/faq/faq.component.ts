import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { ChatbotService } from '../../core/services/chatbot.service';
import { LanguageService } from '../../core/services/language.service';

interface ChatMessage { role: 'user' | 'assistant'; text: string; }

@Component({
  selector: 'app-admin-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule, MatIconModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="page-header">
      <mat-icon class="header-icon">quiz</mat-icon>
      <div>
        <h2>{{ 'faq.title' | translate }}</h2>
        <p class="subtitle">{{ 'faq.subtitle' | translate }}</p>
      </div>
    </div>

    <div class="chat-card">
      <div class="chat-header">
        <mat-icon>smart_toy</mat-icon>
        <span>{{ 'faq.chat_title' | translate }}</span>
      </div>
      <p class="subtitle chat-subtitle">{{ 'faq.chat_subtitle' | translate }}</p>

      @if (chatMessages().length > 0) {
        <div class="chat-messages">
          @for (msg of chatMessages(); track $index) {
            <div class="chat-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              {{ msg.text }}
            </div>
          }
          @if (chatLoading()) {
            <div class="chat-msg assistant">
              <mat-spinner diameter="18" style="display:inline-block" />
            </div>
          }
        </div>
      }

      <div class="chat-input-row">
        <mat-form-field appearance="outline" class="chat-field">
          <input matInput [(ngModel)]="chatInput" [placeholder]="'faq.chat_placeholder' | translate"
                 (keydown.enter)="sendChatMessage()" [disabled]="chatLoading()">
        </mat-form-field>
        <button mat-icon-button color="primary" (click)="sendChatMessage()" [disabled]="!chatInput.trim() || chatLoading()">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>

    @if (!loading()) {
      <mat-form-field appearance="outline" class="search-field">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [ngModel]="query()" (ngModelChange)="query.set($event)" [placeholder]="'faq.search' | translate" />
        @if (query()) {
          <button matSuffix mat-icon-button (click)="query.set('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
    }

    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="40" /></div>
    } @else if (filtered().length === 0) {
      <p class="empty">{{ query() ? ('faq.no_results' | translate) : ('faq.no_items' | translate) }}</p>
    } @else {
      <mat-accordion class="faq-accordion">
        @for (item of filtered(); track item.id) {
          <mat-expansion-panel class="faq-panel">
            <mat-expansion-panel-header>
              <mat-panel-title class="faq-question">{{ item.question }}</mat-panel-title>
            </mat-expansion-panel-header>
            <p class="faq-answer">{{ item.answer }}</p>
          </mat-expansion-panel>
        }
      </mat-accordion>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
    .header-icon { font-size: 36px; width: 36px; height: 36px; color: #0288d1; margin-top: 2px; }
    .page-header h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .subtitle { margin: 0; color: #666; font-size: 14px; }
    .search-field { width: 100%; margin-bottom: 16px; }
    .faq-accordion { border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .faq-panel { border-radius: 0 !important; }
    .faq-question { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .faq-answer { font-size: 14px; color: #444; line-height: 1.7; margin: 0; white-space: pre-wrap; }
    .center-spin { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; color: #999; padding: 40px 0; font-size: 15px; }

    .chat-card {
      background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      padding: 16px; margin-bottom: 20px;
    }
    .chat-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .chat-header mat-icon { color: #0288d1; }
    .chat-subtitle { margin: 4px 0 12px; }
    .chat-messages {
      display: flex; flex-direction: column; gap: 8px;
      max-height: 320px; overflow-y: auto; margin-bottom: 12px; padding-right: 4px;
    }
    .chat-msg {
      max-width: 85%; padding: 8px 12px; border-radius: 10px;
      font-size: 14px; line-height: 1.5; white-space: pre-wrap;
    }
    .chat-msg.user { align-self: flex-end; background: #0288d1; color: #fff; }
    .chat-msg.assistant { align-self: flex-start; background: #f1f3f4; color: #333; }
    .chat-input-row { display: flex; align-items: center; gap: 8px; }
    .chat-field { flex: 1; margin-bottom: -1.25em; }
  `]
})
export class AdminFaqComponent implements OnInit {
  allItems = signal<any[]>([]);
  loading  = signal(true);
  query    = signal('');

  chatMessages = signal<ChatMessage[]>([]);
  chatLoading  = signal(false);
  chatInput    = '';

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter(i =>
      i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)
    );
  });

  constructor(
    private http: HttpClient,
    private chatbotService: ChatbotService,
    private lang: LanguageService,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/public/faq`).subscribe({
      next: list => { this.allItems.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  sendChatMessage(): void {
    const question = this.chatInput.trim();
    if (!question || this.chatLoading()) return;
    const history = this.chatMessages();
    this.chatMessages.update(msgs => [...msgs, { role: 'user', text: question }]);
    this.chatInput = '';
    this.chatLoading.set(true);
    this.chatbotService.ask(question, this.lang.current(), history).subscribe({
      next: res => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant', text: res.answer }]);
        this.chatLoading.set(false);
      },
      error: () => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant', text: this.t.instant('faq.chat_error') }]);
        this.chatLoading.set(false);
      }
    });
  }
}
