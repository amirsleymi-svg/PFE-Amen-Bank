import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { BankAccount } from '../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-accounts',
  imports: [SidebarComponent, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Mes comptes</h1></div>
        <div class="stats-grid">
          @for (a of accounts(); track a.id) {
            <div class="card">
              <div style="font-size:0.8125rem; color: var(--gray-500);">Compte {{ a.accountNumber }}</div>
              <div class="amount" style="font-size:1.5rem; margin: 0.5rem 0;">{{ a.balance | number:'1.3-3' }} <span class="currency">TND</span></div>
              <div style="font-size:0.75rem; color: var(--gray-400);">IBAN: {{ a.iban }}</div>
              <span class="badge" [class.badge-success]="a.status==='ACTIVE'" [class.badge-danger]="a.status!=='ACTIVE'" style="margin-top:0.5rem;">{{ a.status }}</span>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class AccountsComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getAccounts().subscribe(r => { if (r.data) this.accounts.set(r.data); }); }
}
