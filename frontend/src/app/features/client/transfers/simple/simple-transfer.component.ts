import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../../shared/nav-items';
import { ApiService } from '../../../../core/services/api.service';
import { BankAccount } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-simple-transfer',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Virement simple</h1>
          <p>Transférez des fonds en toute sécurité.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <div class="card premium-card" style="max-width:550px; margin: 0 auto;">
          @if (step() === 'form') {
            <div class="card-header outfit">
              <h2>Détails du virement</h2>
            </div>
            <form (ngSubmit)="requestOtp()">
              <div class="form-group">
                <label>Compte de prélèvement</label>
                <div class="select-wrapper">
                  <select [(ngModel)]="form.sourceAccountId" name="source" required>
                    @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }} — {{ a.balance | number:'1.3-3' }} TND</option> }
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>IBAN du bénéficiaire</label>
                <input type="text" [(ngModel)]="form.destinationIban" name="iban" placeholder="TN00 0000 0000 0000 0000 0000" class="iban-input" required>
              </div>
              <div class="form-group">
                <label>Montant à transférer (TND)</label>
                <div class="amount-input-wrapper">
                  <input type="number" [(ngModel)]="form.amount" name="amount" step="0.001" min="0.001" placeholder="0.000" class="amount-field outfit" required>
                  <span class="currency-tag">TND</span>
                </div>
              </div>
              <div class="form-group">
                <label>Motif / Référence</label>
                <input type="text" [(ngModel)]="form.description" name="desc" placeholder="Ex: Cadeau, Loyer, etc.">
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-accent" [disabled]="loading()">
                {{ loading() ? 'Préparation...' : 'Continuer vers la vérification' }}
              </button>
            </form>
          } @else if (step() === 'otp') {
            <div class="text-center">
              <div class="secure-icon mb-2">🔒</div>
              <h2 class="outfit mb-1">Validation de sécurité</h2>
              <p class="mb-3" style="color: var(--gray-500); font-size:0.95rem;">
                Un code à 6 chiffres a été envoyé par email. <br>
                Confirmation du virement de <strong class="outfit" style="color: var(--primary);">{{ form.amount | number:'1.3-3' }} TND</strong>.
              </p>
            </div>
            <form (ngSubmit)="confirmTransfer()">
              <div class="form-group">
                <label class="text-center">Saisissez votre code OTP</label>
                <input type="text" [(ngModel)]="otpCode" name="otp" maxlength="6" pattern="[0-9]{6}" class="otp-input text-center outfit" placeholder="000 000" required autofocus>
              </div>
              <div class="flex-column gap-2">
                <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
                  {{ loading() ? 'Vérification...' : 'Confirmer le virement' }}
                </button>
                <button type="button" class="btn btn-ghost btn-block" (click)="backToForm()" [disabled]="loading()">Annuler et modifier</button>
              </div>
              <div class="text-center mt-2">
                <button type="button" class="btn btn-link btn-sm" (click)="requestOtp()" [disabled]="loading()">
                  Je n'ai pas reçu le code
                </button>
              </div>
            </form>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .premium-card {
      border: 1px solid var(--gray-100);
      box-shadow: var(--shadow-lg);
      padding: 2.5rem;
    }

    .select-wrapper select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
    }

    .iban-input { font-family: monospace; letter-spacing: 0.1em; }

    .amount-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .amount-field {
      padding-right: 4rem !important;
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: var(--primary) !important;
    }

    .currency-tag {
      position: absolute;
      right: 1rem;
      font-weight: 700;
      color: var(--gray-400);
      font-size: 0.8rem;
    }

    .secure-icon {
      font-size: 2.5rem;
      background: var(--gray-50);
      width: 64px; height: 64px;
      margin: 0 auto;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--gray-100);
    }

    .otp-input {
      font-size: 2rem !important;
      letter-spacing: 0.5rem;
      height: 64px !important;
      border-color: var(--accent) !important;
      background: var(--gray-50) !important;
    }

    .flex-column { display: flex; flex-direction: column; }
    .btn-link { color: var(--accent); font-weight: 600; text-decoration: none; border: none; background: transparent; cursor: pointer; }
    .btn-link:hover { text-decoration: underline; }
  `]
})
export class SimpleTransferComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  form: any = { sourceAccountId: null, destinationIban: '', amount: null, description: '' };
  otpCode = '';
  step = signal<'form' | 'otp'>('form');
  loading = signal(false);
  success = signal('');
  error = signal('');

  navItems = CLIENT_NAV;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getAccounts().subscribe({
      next: r => { if (r.data) { this.accounts.set(r.data); if (r.data.length) this.form.sourceAccountId = r.data[0].id; } },
      error: () => {}
    });
  }

  requestOtp() {
    if (!this.form.sourceAccountId || !this.form.destinationIban || !this.form.amount) return;
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.requestTransfer2fa().subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('otp');
        this.otpCode = '';
        this.success.set('Code OTP envoye par email.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Impossible d\'envoyer le code OTP'); }
    });
  }

  confirmTransfer() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.error.set('Le code OTP doit contenir 6 chiffres');
      return;
    }
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.simpleTransfer({ ...this.form, otpCode: this.otpCode }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Virement initie avec succes. En attente d\'approbation.');
        this.step.set('form');
        this.form.destinationIban = ''; this.form.amount = null; this.form.description = '';
        this.otpCode = '';
      },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }

  backToForm() {
    this.step.set('form');
    this.otpCode = '';
    this.error.set('');
  }
}
