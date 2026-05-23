import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/public/home',
    pathMatch: 'full'
  },
  {
    path: 'public',
    loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '**',
    redirectTo: '/public/home'
  }
];
