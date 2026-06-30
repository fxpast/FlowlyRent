import { Component, OnInit } from '@angular/core';
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

    // Résoudre /{slug}/{shortNameSlug} → /{slug}/property/{propId} via endpoint dédié
    this.http.get<{ propId: string }>(`${environment.apiUrl}/public/${userSlug}/resolve/${pageSlug}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res?.propId) {
          this.router.navigate(['/', userSlug, 'property', res.propId], { replaceUrl: true });
        } else {
          this.router.navigate(['/', userSlug], { replaceUrl: true });
        }
      });
  }
}
