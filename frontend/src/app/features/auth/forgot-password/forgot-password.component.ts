import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Mot de passe oublie</h1>
          <p>Entrez votre email. Un administrateur examinera votre demande.</p>
        </div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (!success()) {
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
              {{ loading() ? 'Envoi...' : 'Envoyer la demande' }}
            </button>
          </form>
        }
        <div class="auth-footer"><a routerLink="/login">Retour a la connexion</a></div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private auth: AuthService) {}

  onSubmit() {
    this.loading.set(true);
    this.auth.forgotPassword(this.email).subscribe({
      next: (res) => { this.loading.set(false); this.success.set(res.message); },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.message || 'Erreur'); }
    });
  }
}
