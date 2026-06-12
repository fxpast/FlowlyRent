import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'property/:id',
    loadComponent: () => import('./property-detail/property-detail.component').then(m => m.PropertyDetailComponent)
  },
  {
    path: 'booking/:id',
    loadComponent: () => import('./booking/booking.component').then(m => m.PublicBookingComponent)
  },
  {
    path: 'faq',
    loadComponent: () => import('./faq/faq.component').then(m => m.FaqComponent)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'delete-account',
    loadComponent: () => import('./delete-account/delete-account.component').then(m => m.DeleteAccountComponent)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];
