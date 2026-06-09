import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language { code: string; label: string; flag: string; }

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly KEY = 'flowlyrent_lang';

  readonly languages: Language[] = [
    { code: 'fr', label: 'Français',  flag: '🇫🇷' },
    { code: 'en', label: 'English',   flag: '🇬🇧' },
    { code: 'es', label: 'Español',   flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
    { code: 'it', label: 'Italiano',  flag: '🇮🇹' },
  ];

  current = signal(localStorage.getItem(this.KEY) ?? 'fr');

  constructor(private translate: TranslateService) {}

  use(code: string): void {
    this.translate.use(code);
    localStorage.setItem(this.KEY, code);
    this.current.set(code);
  }

  currentFlag(): string {
    return this.languages.find(l => l.code === this.current())?.flag ?? '🇫🇷';
  }

  currentLabel(): string {
    return this.languages.find(l => l.code === this.current())?.label ?? 'Français';
  }
}
