import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../../shared/nav-items';
import { ApiService } from '../../../../core/services/api.service';
import { BankAccount } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-permanent-transfer',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Virement permanent</h1>
          <p>Automatisez vos paiements récurrents en toute simplicité.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <div class="card premium-card" style="max-width:550px; margin: 0 auto;">
          <div class="card-header outfit">
            <h2>Configuration de la récurrence</h2>
          </div>
          <form (ngSubmit)="onSubmit()">
            <div class="form-group mb-2">
              <label class="outfit">Compte de prélèvement</label>
              <div class="select-wrapper">
                <select [(ngModel)]="form.sourceAccountId" name="source" required>
                  @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }} — {{ a.balance | number:'1.3-3' }} TND</option> }
                </select>
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="outfit">IBAN destinataire</label>
              <input type="text" [(ngModel)]="form.destinationIban" name="iban" placeholder="TN00..." class="iban-font premium-input" required>
            </div>

            <div class="grid-2 mb-2">
              <div class="form-group">
                <label class="outfit">Montant (TND)</label>
                <input type="number" [(ngModel)]="form.amount" name="amount" step="0.001" placeholder="0.000" class="premium-input outfit" required>
              </div>
              <div class="form-group">
                <label class="outfit">Fréquence</label>
                <div class="select-wrapper">
                  <select [(ngModel)]="form.frequency" name="freq" required>
                    <option value="DAILY">Quotidien</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuel</option>
                    <option value="QUARTERLY">Trimestriel</option>
                    <option value="YEARLY">Annuel</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="grid-2 mb-3">
              <div class="form-group">
                <label class="outfit">Date de début</label>
                <input type="date" [(ngModel)]="form.startDate" name="start" class="premium-input" required>
              </div>
              <div class="form-group">
                <label class="outfit">Date de fin <small>(Optionnel)</small></label>
                <input type="date" [(ngModel)]="form.endDate" name="end" class="premium-input">
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-accent btn-lg" [disabled]="loading()">
              {{ loading() ? 'Planification...' : 'Planifier le virement' }}
            </button>
          </form>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .premium-card { padding: 2.5rem; border: 1px solid var(--gray-100); box-shadow: var(--shadow-lg); }
    .premium-input { 
      width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius); 
      border: 1px solid var(--gray-200); font-size: 0.9rem; transition: all 0.2s;
    }
    .premium-input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.1); }
    .iban-font { font-family: monospace; letter-spacing: 0.05em; }
    
    .select-wrapper select {
      appearance: none;
      width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius);
      border: 1px solid var(--gray-200); background: white;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 1rem center;
    }

    small { opacity: 0.6; font-weight: 500; font-size: 0.75rem; }
  `]
})
export class PermanentTransferComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  form: any = { sourceAccountId: null, destinationIban: '', amount: null, frequency: 'MONTHLY', startDate: '', endDate: '' };
  loading = signal(false); success = signal(''); error = signal('');

  navItems = CLIENT_NAV;
  constructor(private api: ApiService) { }
  ngOnInit() { this.api.getAccounts().subscribe({ next: r => { if (r.data?.length) { this.accounts.set(r.data); this.form.sourceAccountId = r.data[0].id; } }, error: () => { } }); }

  onSubmit() {
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.permanentTransfer(this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set('Virement permanent planifie.'); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
