import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Serialize concurrent refresh attempts: only the first 401 triggers a refresh;
// the rest wait for the new access token and replay their request.
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
  originalError: HttpErrorResponse
): Observable<any> {
  const refreshToken = sessionStorage.getItem('refreshToken');
  if (!refreshToken) {
    auth.clearSession();
    router.navigate(['/login']);
    return throwError(() => originalError);
  }

  if (isRefreshing) {
    // A refresh is already in flight — wait for it, then replay this request.
    return refreshSubject.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap(token => next(addAuthHeader(req, token)))
    );
  }

  isRefreshing = true;
  refreshSubject.next(null);

  return auth.refreshToken().pipe(
    switchMap(res => {
      isRefreshing = false;
      if (res?.success && res.data?.accessToken) {
        refreshSubject.next(res.data.accessToken);
        return next(addAuthHeader(req, res.data.accessToken));
      }
      refreshSubject.next(null);
      auth.clearSession();
      router.navigate(['/login']);
      return throwError(() => originalError);
    }),
    catchError(err => {
      isRefreshing = false;
      refreshSubject.next(null);
      auth.clearSession();
      router.navigate(['/login']);
      return throwError(() => err);
    })
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const authed = token ? addAuthHeader(req, token) : req;

  return next(authed).pipe(
    catchError((error: HttpErrorResponse) => {
      // Never intercept errors from auth endpoints themselves — avoids refresh loops.
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return handle401(req, next, auth, router, error);
      }
      return throwError(() => error);
    })
  );
};
