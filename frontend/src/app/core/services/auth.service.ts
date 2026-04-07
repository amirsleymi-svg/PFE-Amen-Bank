import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, User } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:8080/api/auth';
  private currentUser = signal<User | null>(null);

  user = this.currentUser.asReadonly();
  isLoggedIn = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
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
    const refreshToken = localStorage.getItem('refreshToken');
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
    return localStorage.getItem('accessToken');
  }

  setSession(auth: AuthResponse): void {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('user', JSON.stringify(auth.user));
    this.currentUser.set(auth.user);
  }

  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  private loadStoredUser(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
      } catch {
        this.clearSession();
      }
    }
  }
}
