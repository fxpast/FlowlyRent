import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MessageReminderService {
  private readonly KEY = 'flowly_msg_sent';

  private load(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(this.KEY) || '[]')); }
    catch { return new Set(); }
  }

  markSent(bookingId: string | number): void {
    const data = this.load();
    data.add(String(bookingId));
    localStorage.setItem(this.KEY, JSON.stringify([...data]));
  }

  hasSent(bookingId: string | number): boolean {
    return this.load().has(String(bookingId));
  }
}
