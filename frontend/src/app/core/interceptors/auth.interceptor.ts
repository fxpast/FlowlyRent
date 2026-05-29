import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token && (req.url.includes('/admin') || req.url.includes('/sync') || req.url.includes('/user') || req.url.includes('/superadmin') || req.url.includes('/analytics') || req.url.includes('/housekeeper'))) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
