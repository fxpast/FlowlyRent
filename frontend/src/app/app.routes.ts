import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superadminGuard } from './core/guards/superadmin.guard';
import { startGuard } from './core/guards/start.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [startGuard],
    loadComponent: () => import('./public/home/home.component').then(m => m.HomeComponent)
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
    path: 'admin/register',
    loadComponent: () => import('./admin/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'superadmin',
    canActivate: [superadminGuard],
    loadChildren: () => import('./superadmin/superadmin.routes').then(m => m.superadminRoutes)
  },
  {
    path: 'housekeeper',
    loadChildren: () => import('./housekeeper/housekeeper.routes').then(m => m.housekeeperRoutes)
  },
  {
    path: 'paiement/:token',
    loadComponent: () => import('./public/payment-redirect/payment-redirect.component').then(m => m.PaymentRedirectComponent)
  },
  {
    path: 'caution/:token',
    loadComponent: () => import('./public/payment-redirect/payment-redirect.component').then(m => m.PaymentRedirectComponent)
  },
  {
    path: ':userSlug/:pageSlug',
    loadComponent: () => import('./public/page-resolver/page-resolver.component').then(m => m.PageResolverComponent)
  },
  {
    path: '**',
    redirectTo: '/public/home'
  }
];
