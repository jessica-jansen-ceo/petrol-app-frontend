import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/roles';

/**
 * Restricts a route to specific roles. Attach via route `data.roles`:
 *   { path: 'reports', canActivate: [roleGuard], data: { roles: [UserRole.Admin] } }
 * Unauthorised users are redirected to the dashboard.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data?.['roles'] as UserRole[] | undefined) ?? [];
  if (allowed.length === 0 || auth.hasRole(allowed)) {
    return true;
  }
  return router.createUrlTree(['/app/dashboard']);
};
