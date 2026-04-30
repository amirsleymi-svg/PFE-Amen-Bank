import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="auth-page">
      <div class="auth-visual-side animate-in">
        <div class="visual-overlay"></div>
        <div class="visual-content">
          <div class="floating-elements">
            <div class="card glass-card step-mock">
              <div class="step-line active"></div>
              <div class="step-line"></div>
              <div class="step-line"></div>
              <p class="outfit size-xs mt-1">Étape 1: Demande d'adhésion</p>
            </div>
          </div>
          <div class="visual-text animate-in" style="animation-delay: 0.2s">
            <h2 class="outfit">Rejoignez l'Élite.</h2>
            <p class="outfit">Ouvrez votre compte en quelques minutes et profitez d'une gestion patrimoniale d'exception.</p>
          </div>
        </div>
      </div>

      <div class="auth-form-side animate-in" style="animation-delay: 0.1s">
        <div class="form-container">
          <div class="auth-header text-center">
            <app-logo [size]="45" variant="dark" />
            <h1 class="outfit mt-2">Nouveau Compte</h1>
            <p class="outfit text-muted">Soumettez votre demande d'inscription</p>
          </div>

          @if (success()) { 
            <div class="alert alert-success animate-in">
              <span class="icon">✅</span>
              {{ success() }}
              <div class="mt-2">
                <a routerLink="/login" class="btn btn-primary btn-sm outfit">RETOUR À LA CONNEXION</a>
              </div>
            </div> 
          }
          @if (error()) { 
            <div class="alert alert-error animate-in">
              <span class="icon">⚠️</span>
              {{ error() }}
            </div> 
          }

          @if (!success()) {
            <form class="auth-form" (ngSubmit)="onSubmit()">
              <div class="grid-2">
                <div class="form-group">
                  <label class="outfit">Prénom</label>
                  <input type="text" [(ngModel)]="form.firstName" name="firstName" required class="outfit">
                </div>
                <div class="form-group">
                  <label class="outfit">Nom</label>
                  <input type="text" [(ngModel)]="form.lastName" name="lastName" required class="outfit">
                </div>
              </div>

              <div class="form-group">
                <label class="outfit">Adresse Email</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input type="email" [(ngModel)]="form.email" name="email" placeholder="votre@email.com" required class="outfit">
                </div>
              </div>

              <div class="form-group">
                <label class="outfit">Téléphone</label>
                <div class="input-wrapper">
                  <span class="input-icon">📱</span>
                  <input type="text" [(ngModel)]="form.phone" name="phone" placeholder="+216 XX XXX XXX" class="outfit">
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg outfit" [disabled]="loading()">
                {{ loading() ? 'ENVOI EN COURS...' : 'SOUMETTRE MA DEMANDE' }}
              </button>
            </form>
          }

          <div class="auth-footer text-center mt-3">
            <p class="outfit text-muted">
              Déjà inscrit ? 
              <a routerLink="/login" class="accent-link">Se connecter</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: grid; grid-template-columns: 1.1fr 0.9fr; min-height: 100vh; background: white; }
    
    .auth-visual-side { 
      position: relative; background: var(--primary); overflow: hidden; 
      display: flex; align-items: center; justify-content: center; padding: 4rem;
    }
    .visual-overlay {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 30% 70%, var(--accent), transparent);
      opacity: 0.15;
    }
    .visual-content { position: relative; z-index: 10; text-align: center; color: white; width: 100%; max-width: 500px; }
    .visual-text h2 { font-size: 3rem; font-weight: 900; margin-bottom: 1rem; }
    .visual-text p { font-size: 1.2rem; opacity: 0.8; line-height: 1.5; }

    .floating-elements { position: relative; height: 200px; margin-bottom: 4rem; display: flex; justify-content: center; }
    .glass-card { 
      background: rgba(255,255,255,0.05); 
      backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 2rem; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    .step-mock { width: 280px; animation: float 6s infinite ease-in-out; }
    .step-line { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 12px; }
    .step-line.active { background: var(--accent); }

    .auth-form-side { display: flex; align-items: center; justify-content: center; padding: 4rem; background: white; }
    .form-container { width: 100%; max-width: 480px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; font-weight: 800; font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); font-size: 1.1rem; opacity: 0.5; }
    .input-wrapper input, .form-group input { 
      width: 100%; padding: 0.85rem 1rem; 
      border: 1.5px solid var(--gray-100); border-radius: 12px;
      font-size: 1rem; transition: all 0.2s; background: var(--gray-50);
    }
    .input-wrapper input { padding-left: 3.5rem; }
    .input-wrapper input:focus, .form-group input:focus { border-color: var(--accent); background: white; box-shadow: 0 0 0 4px var(--accent-light); outline: none; }

    .accent-link { color: var(--accent); font-weight: 800; text-decoration: none; }
    .accent-link:hover { text-decoration: underline; }

    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

    @media (max-width: 1024px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-visual-side { display: none; }
      .auth-form-side { padding: 2rem; }
      .grid-2 { grid-template-columns: 1fr; gap: 0; }
    }
  `]
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
