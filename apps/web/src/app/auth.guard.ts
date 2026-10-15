import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => inject(AuthService).token() ? true : inject(Router).createUrlTree(['/login']);

export const doctorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) return router.createUrlTree(['/login']);
  return auth.isDoctor() ? true : router.createUrlTree(['/workspace/appointments']);
};
