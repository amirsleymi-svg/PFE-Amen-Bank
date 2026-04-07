import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent, NavItem } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { BankAccount } from '../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-client-dashboard',
  imports: [SidebarComponent, RouterLink, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1>Tableau de bord</h1>
          <p>Bienvenue dans votre espace client</p>
        </div>

        <div class="stats-grid">
          @for (account of accounts(); track account.id) {
            <div class="stat-card stat-primary">
              <div class="stat-label">{{ account.accountNumber }}</div>
              <div class="stat-value">{{ account.balance | number:'1.3-3' }} <span class="currency">TND</span></div>
              <div style="font-size:0.75rem; color: var(--gray-500); margin-top: 0.25rem;">IBAN: {{ account.iban }}</div>
            </div>
          }
        </div>

        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <a routerLink="/client/transfers/simple" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">💸</div>
            <div style="font-weight:600;">Virement simple</div>
          </a>
          <a routerLink="/client/transfers/grouped" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">👥</div>
            <div style="font-weight:600;">Virement groupe</div>
          </a>
          <a routerLink="/client/transfers/permanent" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">🔄</div>
            <div style="font-weight:600;">Virement permanent</div>
          </a>
          <a routerLink="/client/credits/simulate" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">📊</div>
            <div style="font-weight:600;">Simuler un credit</div>
          </a>
          <a routerLink="/client/card-link" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">💳</div>
            <div style="font-weight:600;">Lier une carte</div>
          </a>
          <a routerLink="/chatbot" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">🤖</div>
            <div style="font-weight:600;">Chatbot</div>
          </a>
        </div>
      </main>
    </div>
  `
})
export class ClientDashboardComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/client/dashboard', icon: '📊' },
    { label: 'Mes comptes', route: '/client/accounts', icon: '🏦' },
    { label: 'Transactions', route: '/client/transactions', icon: '📋' },
    { label: 'Virement simple', route: '/client/transfers/simple', icon: '💸' },
    { label: 'Virement groupe', route: '/client/transfers/grouped', icon: '👥' },
    { label: 'Virement permanent', route: '/client/transfers/permanent', icon: '🔄' },
    { label: 'Simuler credit', route: '/client/credits/simulate', icon: '🧮' },
    { label: 'Demander credit', route: '/client/credits/request', icon: '📝' },
    { label: 'Mes credits', route: '/client/credits/list', icon: '💰' },
    { label: 'Lier une carte', route: '/client/card-link', icon: '💳' },
    { label: 'Chatbot', route: '/chatbot', icon: '🤖' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAccounts().subscribe(res => {
      if (res.data) this.accounts.set(res.data);
    });
  }
}
