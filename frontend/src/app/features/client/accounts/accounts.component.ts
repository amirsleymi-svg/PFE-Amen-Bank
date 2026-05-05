import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { BankAccount } from '../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-accounts',
  imports: [SidebarComponent, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Mes Comptes</h1>
          <p class="subtitle outfit">Vue d'ensemble de vos avoirs et liquidités.</p>
        </div>

        <div class="accounts-grid">
          @for (a of accounts(); track a.id) {
            <div class="card premium-account-card">
              <div class="card-glow"></div>
              <div class="card-top relative">
                <div class="acc-type outfit">Compte Courant</div>
                <div class="acc-number outfit">{{ a.accountNumber }}</div>
              </div>
              <div class="card-middle relative mt-2">
                <div class="balance-label outfit">Solde Disponible</div>
                <div class="amount-large outfit">{{ a.balance | number:'1.3-3' }} <span class="currency">TND</span></div>
              </div>
              <div class="card-bottom relative mt-2">
                <div class="iban-box">
                  <span class="iban-label outfit">IBAN</span>
                  <code class="iban-value outfit">{{ a.iban }}</code>
                </div>
                <div class="status-box mt-1">
                  <span class="badge" [class.badge-success]="a.status==='ACTIVE'" [class.badge-danger]="a.status!=='ACTIVE'">
                    {{ statusFr(a.status) }}
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .accounts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    
    .premium-account-card {
      background: var(--primary); color: white; border: none; padding: 2rem;
      border-radius: var(--radius-lg); position: relative; overflow: hidden;
      min-height: 240px; display: flex; flex-direction: column; justify-content: space-between;
      transition: transform 0.05s ease, box-shadow 0.3s ease;
    }
    .premium-account-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
    .card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(197,165,114,0.15) 0%, transparent 70%); pointer-events: none; }

    .acc-type { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); font-weight: 800; }
    .acc-number { font-size: 0.85rem; opacity: 0.6; font-weight: 600; }

    .balance-label { font-size: 0.75rem; opacity: 0.7; font-weight: 600; }
    .amount-large { font-size: 2.25rem; font-weight: 800; }
    .currency { font-size: 1rem; opacity: 0.6; font-weight: 600; }

    .iban-box { display: flex; flex-direction: column; gap: 0.25rem; }
    .iban-label { font-size: 0.6rem; text-transform: uppercase; opacity: 0.5; font-weight: 800; }
    .iban-value { font-size: 0.8rem; letter-spacing: 1px; color: var(--accent); font-weight: 600; }

    .badge-success { background: var(--success); color: white; border: none; }
    .badge-danger { background: var(--danger); color: white; border: none; }
    .badge { padding: 0.3rem 0.75rem; border-radius: 12px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  `]
})
export class AccountsComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  navItems = CLIENT_NAV;
  statusFr = statusFr;
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getAccounts().subscribe({ next: r => { if (r.data) this.accounts.set(r.data); }, error: () => {} }); }
}
