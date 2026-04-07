import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Demande d'inscription</h1>
          <p>Remplissez le formulaire. Un administrateur examinera votre demande.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        @if (!success()) {
          <form (ngSubmit)="onSubmit()">
            <div class="grid-2">
              <div class="form-group">
                <label>Prenom</label>
                <input type="text" [(ngModel)]="form.firstName" name="firstName" required>
              </div>
              <div class="form-group">
                <label>Nom</label>
                <input type="text" [(ngModel)]="form.lastName" name="lastName" required>
              </div>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="form.email" name="email" required>
            </div>
            <div class="form-group">
              <label>Telephone</label>
              <input type="text" [(ngModel)]="form.phone" name="phone" placeholder="+216 XX XXX XXX">
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
              {{ loading() ? 'Envoi...' : 'Soumettre la demande' }}
            </button>
          </form>
        }

        <div class="auth-footer">
          Deja inscrit ? <a routerLink="/login">Se connecter</a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form = { firstName: '', lastName: '', email: '', phone: '' };
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private api: ApiService) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.api.register(this.form).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur');
      }
    });
  }
}
