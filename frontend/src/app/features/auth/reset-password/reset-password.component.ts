import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Nouveau mot de passe</h1>
        </div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (!success()) {
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Nouveau mot de passe</label>
              <input type="password" [(ngModel)]="password" name="password" minlength="8" required>
            </div>
            <div class="form-group">
              <label>Confirmer</label>
              <input type="password" [(ngModel)]="confirm" name="confirm" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
              {{ loading() ? 'Envoi...' : 'Reinitialiser' }}
            </button>
          </form>
        }
        <div class="auth-footer"><a routerLink="/login">Retour a la connexion</a></div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  password = '';
  confirm = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private auth: AuthService, private route: ActivatedRoute) {}

  onSubmit() {
    if (this.password !== this.confirm) { this.error.set('Les mots de passe ne correspondent pas'); return; }
    this.loading.set(true);
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    this.auth.resetPassword(token, this.password).subscribe({
      next: () => { this.loading.set(false); this.success.set('Mot de passe reinitialise avec succes !'); },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.message || 'Erreur'); }
    });
  }
}
