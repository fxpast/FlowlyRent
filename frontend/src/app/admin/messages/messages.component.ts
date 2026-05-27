import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { BookingService } from '../../core/services/booking.service';
import { Message } from '../../core/models/message.model';
import { Booking } from '../../core/models/booking.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatListModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule
  ],
  template: `
    <h1>Messages</h1>
    <div class="messages-layout">
      <mat-card class="conversations-panel">
        <mat-card-header><mat-card-title>Réservations</mat-card-title></mat-card-header>
        <mat-nav-list>
          @for (b of bookings(); track b.id) {
            <a mat-list-item (click)="selectBooking(b)"
               [class.selected]="selectedBooking()?.id === b.id">
              <span matListItemTitle>{{ b.guest?.firstName }} {{ b.guest?.lastName }}</span>
              <span matListItemLine>{{ b.confirmationCode }} · {{ b.checkIn | date:'dd/MM' }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-card>

      @if (selectedBooking()) {
        <mat-card class="chat-panel">
          <mat-card-header>
            <mat-card-title>{{ selectedBooking()?.guest?.firstName }} {{ selectedBooking()?.guest?.lastName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedBooking()?.confirmationCode }} · {{ selectedBooking()?.property?.name }}</mat-card-subtitle>
          </mat-card-header>
          <mat-divider></mat-divider>
          <div class="messages-container" #messagesContainer>
            @for (m of messages(); track m.id) {
              <div class="message" [class.host-message]="m.sender === 'HOST'" [class.guest-message]="m.sender === 'GUEST'">
                <div class="bubble">
                  <p>{{ m.content }}</p>
                  <small>{{ m.sender === 'HOST' ? 'Vous' : selectedBooking()?.guest?.firstName }} · {{ m.createdAt | date:'dd/MM HH:mm' }}</small>
                </div>
              </div>
            }
          </div>
          <mat-divider></mat-divider>
          <div class="reply-box">
            <mat-form-field appearance="outline" class="reply-input">
              <textarea matInput [(ngModel)]="newMessage" placeholder="Écrire un message..."
                        rows="2" (keydown.enter)="sendMessage($event)"></textarea>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="sendMessage(null)" [disabled]="!newMessage.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </mat-card>
      } @else {
        <mat-card class="chat-panel empty-state">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>Sélectionnez une réservation pour voir les messages</p>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    h1 { margin-bottom: 16px; }
    .messages-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; height: calc(100vh - 160px); }
    .conversations-panel { overflow-y: auto; }
    .selected { background: #e3f2fd !important; }
    .chat-panel { display: flex; flex-direction: column; }
    .messages-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .message { display: flex; }
    .host-message { justify-content: flex-end; }
    .guest-message { justify-content: flex-start; }
    .bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; }
    .host-message .bubble { background: #0288d1; color: white; border-bottom-right-radius: 4px; }
    .guest-message .bubble { background: #f5f5f5; border-bottom-left-radius: 4px; }
    .bubble p { margin: 0 0 4px; }
    .bubble small { opacity: 0.7; font-size: 11px; }
    .reply-box { display: flex; gap: 8px; align-items: flex-end; padding: 12px; }
    .reply-input { flex: 1; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  bookings = signal<Booking[]>([]);
  messages = signal<Message[]>([]);
  selectedBooking = signal<Booking | null>(null);
  newMessage = '';
  private wsSubscription?: Subscription;

  constructor(
    private messageService: MessageService,
    private bookingService: BookingService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.bookingService.getAll().subscribe(data => {
      this.bookings.set(data);
      const bookingId = this.route.snapshot.queryParamMap.get('bookingId');
      if (bookingId) {
        const b = data.find(b => b.id === +bookingId);
        if (b) this.selectBooking(b);
      }
    });
  }

  selectBooking(booking: Booking): void {
    this.wsSubscription?.unsubscribe();
    this.selectedBooking.set(booking);
    if (booking.id) {
      this.messageService.getMessages(booking.id).subscribe(msgs => this.messages.set(msgs));
      this.wsSubscription = this.messageService.watchMessages(booking.id).subscribe(msg => {
        this.messages.update(list => [...list, msg]);
      });
    }
  }

  sendMessage(event: Event | null): void {
    if (event) {
      const ke = event as KeyboardEvent;
      if (!ke.shiftKey) ke.preventDefault();
      else return;
    }
    const booking = this.selectedBooking();
    if (!booking?.id || !this.newMessage.trim()) return;
    this.messageService.sendMessage(booking.id, this.newMessage.trim()).subscribe(msg => {
      this.messages.update(list => [...list, msg]);
      this.newMessage = '';
    });
  }

  ngAfterViewChecked(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }
}
