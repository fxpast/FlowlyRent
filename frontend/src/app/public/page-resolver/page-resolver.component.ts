import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-page-resolver',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="center"><mat-spinner diameter="48" /></div>
  `,
  styles: [`
    :host { display: block; }
    .center { display: flex; justify-content: center; align-items: center; height: 100vh; }
  `]
})
export class PageResolverComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const userSlug = this.route.snapshot.paramMap.get('userSlug')!;
    const pageSlug = this.route.snapshot.paramMap.get('pageSlug')!;

    // Résoudre /{slug}/{shortNameSlug} → /{slug}/property/{propId}
    this.http.get<any[]>(`${environment.apiUrl}/public/${userSlug}/properties`)
      .pipe(catchError(() => of([])))
      .subscribe(props => {
        const match = (props ?? []).find(p => this.slugify(p.shortName || '') === pageSlug);
        if (match) {
          this.router.navigate(['/', userSlug, 'property', match.id], { replaceUrl: true });
        } else {
          // Slug inconnu → accueil du site de réservation
          this.router.navigate(['/', userSlug], { replaceUrl: true });
        }
      });
  }

  private slugify(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
