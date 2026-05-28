import { Routes } from '@angular/router';

export const superadminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./superadmin-layout.component').then(m => m.SuperadminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/superadmin-dashboard.component').then(m => m.SuperadminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/superadmin-users.component').then(m => m.SuperadminUsersComponent)
      },
      {
        path: 'feedbacks',
        loadComponent: () => import('./feedbacks/superadmin-feedbacks.component').then(m => m.SuperadminFeedbacksComponent)
      }
    ]
  }
];
