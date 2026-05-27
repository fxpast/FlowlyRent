import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="coming-soon-container">
      <mat-icon class="coming-soon-icon">construction</mat-icon>
      <h2>{{ title }}</h2>
      <p>Cette fonctionnalité est en cours de développement.</p>
    </div>
  `,
  styles: [`
    .coming-soon-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      gap: 16px;
      color: #666;
    }
    .coming-soon-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bbb;
    }
    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }
    p {
      margin: 0;
      font-size: 1rem;
    }
  `]
})
export class ComingSoonComponent {
  title = inject(ActivatedRoute).snapshot.data['title'] ?? 'En cours de construction';
}
