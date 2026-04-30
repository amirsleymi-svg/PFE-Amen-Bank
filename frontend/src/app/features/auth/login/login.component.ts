import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="auth-page">
      <div class="auth-visual-side animate-in">
        <div class="visual-overlay"></div>
        <div class="visual-content">
          <div class="floating-elements">
            <div class="card glass-card mockup-1">
              <div class="mock-header">
                <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
              </div>
              <div class="mock-body">
                <div class="line" style="width: 80%"></div>
                <div class="line" style="width: 60%"></div>
                <div class="line-gold" style="width: 40%"></div>
              </div>
            </div>
            <div class="card glass-card mockup-2">
              <div class="mock-icon">💳</div>
              <div class="mock-title outfit">Premium Visa</div>
            </div>
          </div>
          <div class="visual-text animate-in" style="animation-delay: 0.2s">
            <h2 class="outfit">L'Excellence Bancaire.</h2>
            <p class="outfit">Accédez à vos actifs avec une sécurité institutionnelle de pointe.</p>
          </div>
        </div>
      </div>

      <div class="auth-form-side animate-in" style="animation-delay: 0.1s">
        <div class="form-container">
          <div class="auth-header text-center">
            <app-logo [size]="45" variant="dark" />
            <h1 class="outfit mt-2">Bienvenue</h1>
            <p class="outfit text-muted">Identifiez-vous pour continuer</p>
          </div>

          @if (error()) { 
            <div class="alert alert-error animate-in">
              <span class="icon">⚠️</span>
              {{ error() }}
            </div> 
          }

          <form class="auth-form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="outfit">Identifiant ou Email</label>
              <div class="input-wrapper">
                <span class="input-icon">👤</span>
                <input type="text" [(ngModel)]="login" name="login" placeholder="votre@email.com" required class="outfit">
              </div>
            </div>

            <div class="form-group">
              <div class="flex-between">
                <label class="outfit">Mot de passe</label>
                <a routerLink="/forgot-password" class="forgot-link outfit">Oublié ?</a>
              </div>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required class="outfit">
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg outfit" [disabled]="loading()">
              {{ loading() ? 'AUTHENTIFICATION...' : 'SE CONNECTER' }}
            </button>
          </form>

          <div class="auth-footer text-center mt-3">
            <p class="outfit text-muted">
              Pas encore de compte ? 
              <a routerLink="/register" class="accent-link">Demander une inscription</a>
            </p>
          </div>
          
          <div class="security-trust">
            <span class="trust-item outfit">🔐 Chiffrement AES-256</span>
            <span class="trust-item outfit">🛡️ Protection 2FA Active</span>
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
      background: radial-gradient(circle at 70% 30%, var(--primary-light), transparent);
      opacity: 0.6;
    }
    .visual-content { position: relative; z-index: 10; text-align: center; color: white; width: 100%; max-width: 500px; }
    .visual-text h2 { font-size: 3rem; font-weight: 900; margin-bottom: 1rem; }
    .visual-text p { font-size: 1.2rem; opacity: 0.8; line-height: 1.5; }

    .floating-elements { position: relative; height: 300px; margin-bottom: 4rem; }
    .glass-card { 
      position: absolute; background: rgba(255,255,255,0.05); 
      backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 1.5rem; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    .mockup-1 { width: 300px; top: 0; left: 10%; transform: rotate(-5deg); animation: float 6s infinite ease-in-out; }
    .mockup-2 { width: 220px; bottom: 10%; right: 10%; transform: rotate(10deg); animation: float 6s infinite ease-in-out reverse; }
    
    .mock-header { display: flex; gap: 6px; margin-bottom: 1.5rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }
    .mock-body { display: flex; flex-direction: column; gap: 12px; }
    .line { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; }
    .line-gold { height: 6px; background: var(--accent); border-radius: 3px; opacity: 0.6; }
    .mock-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .mock-title { font-weight: 700; letter-spacing: 1px; }

    .auth-form-side { display: flex; align-items: center; justify-content: center; padding: 4rem; background: white; }
    .form-container { width: 100%; max-width: 400px; }
    
    .form-group { margin-bottom: 1.75rem; }
    .form-group label { display: block; font-weight: 800; font-size: 0.85rem; color: var(--primary); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); font-size: 1.1rem; opacity: 0.5; }
    .input-wrapper input { 
      width: 100%; padding: 1rem 1rem 1rem 3.5rem; 
      border: 1.5px solid var(--gray-100); border-radius: 14px;
      font-size: 1rem; transition: all 0.2s; background: var(--gray-50);
    }
    .input-wrapper input:focus { border-color: var(--accent); background: white; box-shadow: 0 0 0 4px var(--accent-light); outline: none; }

    .forgot-link { font-size: 0.8rem; font-weight: 700; color: var(--accent); text-decoration: none; }
    .forgot-link:hover { text-decoration: underline; }
    
    .accent-link { color: var(--accent); font-weight: 800; text-decoration: none; }
    .accent-link:hover { text-decoration: underline; }

    .security-trust { 
      margin-top: 3rem; pt: 2rem; border-top: 1px solid var(--gray-100);
      display: flex; justify-content: space-between;
    }
    .trust-item { font-size: 0.65rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em; }

    @keyframes float { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-15px) rotate(-3deg); } }

    @media (max-width: 1024px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-visual-side { display: none; }
      .auth-form-side { padding: 2rem; }
    }
  `]
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
          return;
        }
        if (res.success && res.data?.accessToken && res.data.user?.role) {
          this.auth.setSession(res.data);
          this.redirectByRole(res.data.user.role);
          return;
        }
        this.error.set('Reponse de connexion invalide. Reessayez.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur de connexion');
      }
    });
  }

  private redirectByRole(role: string): void {
    switch (role) {
      case 'CLIENT': this.router.navigate(['/client/dashboard']); break;
      case 'EMPLOYEE': this.router.navigate(['/employee/dashboard']); break;
      case 'ADMIN': this.router.navigate(['/admin/dashboard']); break;
      default: this.error.set('Role utilisateur inconnu. Contactez le support.');
    }
  }
}
