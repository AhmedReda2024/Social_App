import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

interface JwtPayload {
  exp?: number;
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return hasValidToken() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return hasValidToken() ? router.createUrlTree(['/feed']) : true;
};

function hasValidToken(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed JWT');
    }

    const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const isValid = Number.isFinite(payload.exp) && payload.exp! > nowInSeconds;

    if (!isValid) {
      localStorage.removeItem('token');
    }

    return isValid;
  } catch {
    localStorage.removeItem('token');
    return false;
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return atob(paddedBase64);
}
