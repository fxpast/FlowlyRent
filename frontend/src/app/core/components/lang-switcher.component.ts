import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  template: `
    <button mat-button [matMenuTriggerFor]="langMenu" class="lang-btn">
      {{ langService.currentFlag() }} {{ langService.current().toUpperCase() }}
    </button>
    <mat-menu #langMenu="matMenu">
      @for (lang of langService.languages; track lang.code) {
        <button mat-menu-item (click)="langService.use(lang.code)"
                [style.font-weight]="lang.code === langService.current() ? '700' : '400'">
          {{ lang.flag }} {{ lang.label }}
        </button>
      }
    </mat-menu>
  `,
  styles: [`
    .lang-btn {
      color: inherit;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      min-width: 64px;
      opacity: 0.9;
    }
    .lang-btn:hover { opacity: 1; }
  `]
})
export class LangSwitcherComponent {
  constructor(readonly langService: LanguageService) {}
}
