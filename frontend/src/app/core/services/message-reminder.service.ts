import { Injectable } from '@angular/core';
import { localDateStr } from '../utils/date.utils';

@Injectable({ providedIn: 'root' })
export class MessageReminderService {
  private readonly KEY = 'flowly_msg_sent';

  private load(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch { return {}; }
  }

  markSent(bookingId: string | number): void {
    const data = this.load();
    data[String(bookingId)] = localDateStr();
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  hasSentToday(bookingId: string | number): boolean {
    return this.load()[String(bookingId)] === localDateStr();
  }
}
