import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-2fa',
  imports: [FormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">Amen Bank</div>
          <h1>Verification 2FA</h1>
          <p>Un code a 6 chiffres a ete envoye a votre email</p>
        </div>

        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Code OTP</label>
            <input type="text" [(ngModel)]="code" name="code" placeholder="000000" maxlength="6"
                   style="text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem;" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            {{ loading() ? 'Verification...' : 'Verifier' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class Verify2faComponent implements OnInit {
  code = '';
  email = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.verify2fa(this.email, this.code).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          const role = res.data.user.role;
          if (role === 'CLIENT') this.router.navigate(['/client']);
          else if (role === 'EMPLOYEE') this.router.navigate(['/employee']);
          else if (role === 'ADMIN') this.router.navigate(['/admin']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Code invalide');
      }
    });
  }
}
