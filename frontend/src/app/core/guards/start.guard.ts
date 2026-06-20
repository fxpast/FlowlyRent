import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const startGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  if (auth.isAdmin()) return router.createUrlTree(['/superadmin/dashboard']);
  if (auth.isHousekeeper()) return router.createUrlTree(['/housekeeper/tasks']);
  return router.createUrlTree(['/admin/dashboard']);
};
