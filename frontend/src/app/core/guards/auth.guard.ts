import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function dashboardPathFor(role: string | null | undefined): string | null {
  switch (role) {
    case 'CLIENT': return '/client/dashboard';
    case 'EMPLOYEE': return '/employee/dashboard';
    case 'ADMIN': return '/admin/dashboard';
    default: return null;
  }
}

function sendToOwnDashboard(auth: AuthService, router: Router): void {
  const path = dashboardPathFor(auth.userRole());
  if (path) {
    router.navigate([path]);
  } else {
    auth.clearSession();
    router.navigate(['/login']);
  }
}

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
    sendToOwnDashboard(auth, router);
    return false;
  };
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  sendToOwnDashboard(auth, router);
  return false;
};

export const landingGuard: CanActivateFn = guestGuard;
