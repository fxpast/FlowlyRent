import { Component, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatbotService } from '../services/chatbot.service';
import { LanguageService } from '../services/language.service';

interface ChatMessage { role: 'user' | 'assistant'; text: string; }

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="widget-host">
      @if (isOpen()) {
        <div class="chat-panel">
          <div class="chat-header">
            <mat-icon>smart_toy</mat-icon>
            <span>{{ 'chat_widget.title' | translate }}</span>
            <button mat-icon-button class="close-btn" (click)="toggle()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="chat-messages" #messagesEl>
            @if (messages().length === 0) {
              <p class="empty-hint">{{ 'chat_widget.hint' | translate }}</p>
            }
            @for (msg of messages(); track $index) {
              <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                {{ msg.text }}
              </div>
            }
            @if (loading()) {
              <div class="msg assistant loading-msg">
                <mat-spinner diameter="16" />
              </div>
            }
          </div>
          <div class="chat-input-row">
            <input class="chat-input" [(ngModel)]="inputText"
                   [placeholder]="'chat_widget.placeholder' | translate"
                   (keydown.enter)="send()" [disabled]="loading()" />
            <button mat-icon-button color="primary" (click)="send()" [disabled]="!inputText.trim() || loading()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>
      }
      <button mat-fab color="primary" class="chat-fab" (click)="toggle()"
              [title]="'chat_widget.title' | translate">
        <mat-icon>{{ isOpen() ? 'close' : 'smart_toy' }}</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .widget-host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
    }
    .chat-fab {
      box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
    }
    .chat-panel {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 340px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 4px 12px 16px;
      background: #0288d1;
      color: white;
      font-weight: 600;
      font-size: 15px;
    }
    .chat-header mat-icon { color: white; }
    .chat-header span { flex: 1; }
    .close-btn { color: white !important; }
    .chat-messages {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      max-height: 340px;
      min-height: 80px;
      overflow-y: auto;
    }
    .empty-hint {
      font-size: 13px;
      color: #888;
      margin: 0;
      line-height: 1.5;
    }
    .msg {
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .msg.user { align-self: flex-end; background: #0288d1; color: #fff; }
    .msg.assistant { align-self: flex-start; background: #f1f3f4; color: #333; }
    .loading-msg { padding: 10px 14px; }
    .chat-input-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 4px 8px 12px;
      border-top: 1px solid #eee;
    }
    .chat-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      background: transparent;
      padding: 4px 0;
    }

    @media (max-width: 768px) {
      .widget-host {
        bottom: calc(96px + env(safe-area-inset-bottom, 0px));
        right: 20px;
      }
      .chat-panel {
        width: calc(100vw - 40px);
        right: 0;
      }
    }
  `]
})
export class ChatWidgetComponent implements AfterViewChecked {
  @ViewChild('messagesEl') messagesEl?: ElementRef<HTMLDivElement>;

  isOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  inputText = '';

  private shouldScroll = false;

  constructor(
    private chatbot: ChatbotService,
    private lang: LanguageService,
    private t: TranslateService
  ) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messagesEl) {
      const el = this.messagesEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  toggle(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) this.shouldScroll = true;
  }

  send(): void {
    const question = this.inputText.trim();
    if (!question || this.loading()) return;
    const history = this.messages();
    this.messages.update(msgs => [...msgs, { role: 'user', text: question }]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScroll = true;
    this.chatbot.ask(question, this.lang.current(), history).subscribe({
      next: res => {
        this.messages.update(msgs => [...msgs, { role: 'assistant', text: res.answer }]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.update(msgs => [...msgs, { role: 'assistant', text: this.t.instant('chat_widget.error') }]);
        this.loading.set(false);
        this.shouldScroll = true;
      }
    });
  }
}
