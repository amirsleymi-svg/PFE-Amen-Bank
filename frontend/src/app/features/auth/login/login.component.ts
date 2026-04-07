import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Connexion</h1>
          <p>Entrez vos identifiants pour acceder a votre espace</p>
        </div>

        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Email ou Identifiant</label>
            <input type="text" [(ngModel)]="login" name="login" placeholder="Entrez votre email ou identifiant" required>
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Entrez votre mot de passe" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            {{ loading() ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <div class="auth-footer">
          <a routerLink="/forgot-password">Mot de passe oublie ?</a>
          <br><br>
          Pas encore de compte ? <a routerLink="/register">Demander une inscription</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  login = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.login, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data?.status === '2FA_REQUIRED') {
          this.router.navigate(['/verify-2fa'], { queryParams: { email: res.data.email } });
        } else if (res.success && res.data?.accessToken) {
          // 2FA disabled — direct login with tokens
          this.auth.setSession(res.data);
          const role = res.data.user?.role?.toLowerCase();
          this.router.navigate([`/${role}/dashboard`]);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur de connexion');
      }
    });
  }
}
