import { Routes } from '@angular/router';
import { ComingSoonComponent } from './coming-soon/coming-soon.component';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'today',
        loadComponent: () => import('./today/today.component').then(m => m.TodayComponent)
      },
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
        component: ComingSoonComponent,
        data: { title: 'Synchronisation' }
      },
      {
        path: 'housekeeping',
        loadComponent: () => import('./housekeeping/housekeeping.component').then(m => m.HousekeepingComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./calendar/calendar.component').then(m => m.CalendarComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'stats',
        component: ComingSoonComponent,
        data: { title: 'Revenus' }
      },
      {
        path: 'reports',
        component: ComingSoonComponent,
        data: { title: 'Rapports' }
      },
      {
        path: 'feedback',
        loadComponent: () => import('./feedback/feedback.component').then(m => m.FeedbackComponent)
      }
    ]
  }
];
