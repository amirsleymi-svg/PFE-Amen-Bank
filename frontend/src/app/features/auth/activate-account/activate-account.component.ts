import { Component, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-activate-account',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Activation du compte</h1>
          <p>Choisissez votre mot de passe pour activer votre compte</p>
        </div>

        @if (success()) {
          <div class="alert alert-success">{{ success() }}</div>
          <div class="auth-footer">
            <a routerLink="/login">Se connecter</a>
          </div>
        } @else if (tokenError()) {
          <div class="alert alert-error">{{ tokenError() }}</div>
          <div class="auth-footer">
            <a routerLink="/login">Retour a la connexion</a>
          </div>
        } @else {
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Nouveau mot de passe</label>
              <input type="password" [(ngModel)]="password" name="password"
                     placeholder="Minimum 8 caracteres" required minlength="8">
            </div>
            <div class="form-group">
              <label>Confirmer le mot de passe</label>
              <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword"
                     placeholder="Retapez votre mot de passe" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
              {{ loading() ? 'Activation...' : 'Activer mon compte' }}
            </button>
          </form>

          <div class="auth-footer">
            <a routerLink="/login">Retour a la connexion</a>
          </div>
        }
      </div>
    </div>
  `
})
export class ActivateAccountComponent implements OnInit {
  password = '';
  confirmPassword = '';
  loading = signal(false);
  success = signal('');
  error = signal('');
  tokenError = signal('');
  private token = '';

  constructor(private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenError.set('Token d\'activation manquant ou invalide.');
    }
  }

  onSubmit() {
    this.error.set('');

    if (this.password.length < 8) {
      this.error.set('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    this.auth.activateAccount(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Compte active avec succes ! Vous pouvez maintenant vous connecter.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur lors de l\'activation.');
      }
    });
  }
}
