import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { routes } from '../../app.routes';
import { authGuard, guestGuard } from './auth-guard';

describe('authentication route guards', () => {
  let router: Router;

  const executeGuard = (guard: CanActivateFn): boolean | UrlTree =>
    TestBed.runInInjectionContext(
      () =>
        guard({} as ActivatedRouteSnapshot, { url: '/feed' } as RouterStateSnapshot) as
          | boolean
          | UrlTree,
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated users to login', () => {
    const result = executeGuard(authGuard);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('allows users with a valid unexpired JWT', () => {
    localStorage.setItem('token', createToken({ exp: futureTimestamp() }));

    expect(executeGuard(authGuard)).toBe(true);
  });

  it('removes expired tokens and redirects to login', () => {
    localStorage.setItem('token', createToken({ exp: pastTimestamp() }));

    const result = executeGuard(authGuard);

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('removes malformed tokens and redirects to login', () => {
    localStorage.setItem('token', 'not-a-valid-jwt');

    const result = executeGuard(authGuard);

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('allows guests to access login and register', () => {
    expect(executeGuard(guestGuard)).toBe(true);
  });

  it('redirects authenticated users away from guest pages', () => {
    localStorage.setItem('token', createToken({ exp: futureTimestamp() }));

    const result = executeGuard(guestGuard);

    expect(router.serializeUrl(result as UrlTree)).toBe('/feed');
  });

  it('guards both lazy layout route groups', () => {
    const authLayout = routes.find((route) =>
      route.children?.some((child) => child.path === 'login'),
    );
    const mainLayout = routes.find((route) =>
      route.children?.some((child) => child.path === 'feed'),
    );

    expect(authLayout?.canActivate).toContain(guestGuard);
    expect(mainLayout?.canActivate).toContain(authGuard);
  });
});

function createToken(payload: Record<string, unknown>): string {
  return `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart(payload)}.signature`;
}

function encodeJwtPart(value: object): string {
  return btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function futureTimestamp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function pastTimestamp(): number {
  return Math.floor(Date.now() / 1000) - 3600;
}
