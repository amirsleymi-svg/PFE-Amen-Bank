import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, User } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'https://localhost:8443/api/auth';
  private currentUser = signal<User | null>(null);

  user = this.currentUser.asReadonly();
  isLoggedIn = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  login(login: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/login`, { login, password });
  }

  verify2fa(email: string, code: string, purpose = 'LOGIN'): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/verify-2fa`, { email, code, purpose }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = sessionStorage.getItem('refreshToken');
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/refresh`, { refreshToken }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  activateAccount(token: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/activate-account`, { token, password });
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/reset-password`, { token, newPassword });
  }

  getToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }

  setSession(auth: AuthResponse): void {
    sessionStorage.setItem('accessToken', auth.accessToken);
    sessionStorage.setItem('refreshToken', auth.refreshToken);
    sessionStorage.setItem('user', JSON.stringify(auth.user));
    this.currentUser.set(auth.user);
  }

  clearSession(): void {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    this.currentUser.set(null);
  }

  private loadStoredUser(): void {
    // One-time migration from legacy localStorage (pre-per-tab sessions).
    // If localStorage has leftovers, drop them — each tab now starts fresh in sessionStorage.
    if (localStorage.getItem('accessToken') || localStorage.getItem('refreshToken') || localStorage.getItem('user')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }

    const token = sessionStorage.getItem('accessToken');
    const refreshToken = sessionStorage.getItem('refreshToken');
    const userStr = sessionStorage.getItem('user');

    if (!userStr) {
      this.clearSession();
      return;
    }

    const accessValid = !!token && !this.isTokenExpired(token);
    if (!accessValid && !refreshToken) {
      this.clearSession();
      return;
    }

    try {
      const parsed = JSON.parse(userStr) as User;
      if (!parsed || !parsed.role) {
        this.clearSession();
        return;
      }
      this.currentUser.set(parsed);
    } catch {
      this.clearSession();
    }
  }
}
