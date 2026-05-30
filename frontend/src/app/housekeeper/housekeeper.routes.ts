import { Routes } from '@angular/router';
import { housekeeperGuard } from '../core/guards/housekeeper.guard';

export const housekeeperRoutes: Routes = [
  {
    path: '',
    canActivate: [housekeeperGuard],
    loadComponent: () => import('./layout/housekeeper-layout.component').then(m => m.HousekeeperLayoutComponent),
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      {
        path: 'tasks',
        loadComponent: () => import('./tasks/housekeeper-tasks.component').then(m => m.HousekeeperTasksComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports/housekeeper-reports.component').then(m => m.HousekeeperReportsComponent)
      }
    ]
  }
];
