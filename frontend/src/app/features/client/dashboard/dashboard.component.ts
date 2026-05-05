import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { BankAccount, AccountCard } from '../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-client-dashboard',
  imports: [SidebarComponent, NavbarComponent, RouterLink, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <app-navbar />
        <div class="page-header">
          <h1 class="outfit">Tableau de bord</h1>
          <p>Bienvenue dans votre espace premium, {{ auth.user()?.firstName }}</p>
        </div>

        <div class="section-head">
          <h3 class="outfit">Mes comptes bancaires</h3>
        </div>
        <div class="stats-grid accounts-grid">
          @for (account of accounts(); track account.id) {
            <div class="stat-card account-card premium-gradient">
              <div class="stat-label">{{ account.accountNumber }}</div>
              <div class="stat-value outfit">{{ account.balance | number:'1.3-3' }} <span class="currency">TND</span></div>
              <div class="muted-meta">IBAN: {{ account.iban }}</div>
              <div class="card-footer-meta">
                <span class="badge status-badge" [class.badge-success]="account.status==='ACTIVE'" [class.badge-danger]="account.status!=='ACTIVE'">{{ statusFr(account.status) }}</span>
                <span class="accent-dot"></span>
              </div>
            </div>
          }
        </div>

        @if (cards().length) {
          <div class="section-head">
            <h3 class="outfit">Mes cartes premium</h3>
          </div>
          <div class="stats-grid cards-grid">
            @for (card of cards(); track card.id) {
              <div class="stat-card card-item glass-style">
                <div class="stat-label">NUMÉRO DE CARTE</div>
                <div class="stat-value card-balance outfit">{{ card.cardNumberMasked }}</div>
                <div class="flex-between mt-2">
                  <div class="card-balance-sub outfit">{{ card.balance | number:'1.3-3' }} TND</div>
                  <span class="badge status-badge" [class.badge-success]="card.status==='ACTIVE'" [class.badge-warning]="card.status==='DISABLED'" [class.badge-danger]="card.status==='EXPIRED'">{{ statusFr(card.status) }}</span>
                </div>
              </div>
            }
          </div>
        }

        <div class="section-head">
          <h3 class="outfit">Accès rapide</h3>
        </div>
        <div class="quick-grid">
          <a routerLink="/client/transfers/simple" class="card quick-item">
            <div class="quick-icon gold-text">💸</div>
            <div class="quick-title">Virement simple</div>
          </a>
          <a routerLink="/client/transfers/grouped" class="card quick-item">
            <div class="quick-icon gold-text">👥</div>
            <div class="quick-title">Virement groupé</div>
          </a>
          <a routerLink="/client/transfers/permanent" class="card quick-item">
            <div class="quick-icon gold-text">🔄</div>
            <div class="quick-title">Virement permanent</div>
          </a>
          <a routerLink="/client/credits/simulate" class="card quick-item">
            <div class="quick-icon gold-text">📊</div>
            <div class="quick-title">Simuler un crédit</div>
          </a>
          <a routerLink="/client/cards" class="card quick-item">
            <div class="quick-icon gold-text">💳</div>
            <div class="quick-title">Mes cartes</div>
          </a>
          <a routerLink="/client/chatbot" class="card quick-item">
            <div class="quick-icon gold-text">🤖</div>
            <div class="quick-title">Assistant IA</div>
          </a>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .section-head h3 {
      margin: 2rem 0 1rem;
      font-size: 0.85rem;
      color: var(--gray-500);
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .accounts-grid, .cards-grid {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .premium-gradient {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: white;
      border: 1px solid var(--primary-light);
    }

    .premium-gradient .stat-label { color: var(--accent); opacity: 0.8; }
    .premium-gradient .stat-value { color: white; margin-top: 0.75rem; }

    .glass-style {
      background: white;
      border: 1px solid var(--gray-100);
      box-shadow: var(--shadow);
    }

    .account-card .muted-meta {
      font-size: 0.7rem;
      color: var(--gray-400);
      margin-top: 0.5rem;
      font-family: monospace;
    }

    .card-footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }

    .accent-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
    }

    .quick-item {
      text-decoration: none;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      border: 1px solid var(--gray-50);
      border-radius: var(--radius);
      transition: all 0.05s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .quick-item:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: var(--accent);
    }

    .quick-icon { font-size: 1.75rem; margin-bottom: 0.75rem; }
    .gold-text { filter: drop-shadow(0 2px 4px rgba(197, 160, 89, 0.3)); }
    .quick-title { font-weight: 600; color: var(--primary); font-size: 0.85rem; text-align: center; }
  `]
})
export class ClientDashboardComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  cards = signal<AccountCard[]>([]);
  navItems = CLIENT_NAV;
  statusFr = statusFr;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.api.getAccounts().subscribe({
      next: res => { if (res.data) this.accounts.set(res.data); },
      error: () => {}
    });
    this.api.getClientCards().subscribe({
      next: res => { if (res.data) this.cards.set(res.data); },
      error: () => {}
    });
  }
}
