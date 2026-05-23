import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./bookings/bookings.component').then(m => m.BookingsComponent)
      },
      {
        path: 'bookings/new',
        loadComponent: () => import('./booking-form/booking-form.component').then(m => m.BookingFormComponent)
      },
      {
        path: 'bookings/:id/edit',
        loadComponent: () => import('./booking-form/booking-form.component').then(m => m.BookingFormComponent)
      },
      {
        path: 'arrivals',
        loadComponent: () => import('./arrivals/arrivals.component').then(m => m.ArrivalsComponent)
      },
      {
        path: 'departures',
        loadComponent: () => import('./departures/departures.component').then(m => m.DeparturesComponent)
      },
      {
        path: 'messages',
        loadComponent: () => import('./messages/messages.component').then(m => m.MessagesComponent)
      },
      {
        path: 'payments',
        loadComponent: () => import('./payments/payments.component').then(m => m.PaymentsComponent)
      },
      {
        path: 'sync',
        loadComponent: () => import('./sync/sync.component').then(m => m.SyncComponent)
      }
    ]
  }
];
