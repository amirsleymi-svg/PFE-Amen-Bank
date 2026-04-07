import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }
    const role = auth.userRole();
    if (role && allowedRoles.includes(role)) return true;
    router.navigate(['/login']);
    return false;
  };
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  const role = auth.userRole();
  if (role === 'CLIENT') router.navigate(['/client']);
  else if (role === 'EMPLOYEE') router.navigate(['/employee']);
  else if (role === 'ADMIN') router.navigate(['/admin']);
  else router.navigate(['/']);
  return false;
};
