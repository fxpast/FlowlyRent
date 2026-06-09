import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule, MatIconModule],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="langMenu"
            style="font-size:18px; line-height:1" [title]="langService.currentLabel()">
      {{ langService.currentLabel() }}
    </button>
    <mat-menu #langMenu="matMenu">
      @for (lang of langService.languages; track lang.code) {
        <button mat-menu-item (click)="langService.use(lang.code)"
                [style.font-weight]="lang.code === langService.current() ? '700' : '400'">
          {{ lang.flag }} {{ lang.label }}
        </button>
      }
    </mat-menu>
  `
})
export class LangSwitcherComponent {
  constructor(readonly langService: LanguageService) {}
}
