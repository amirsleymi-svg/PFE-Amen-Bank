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
        <div class="page-header flex-between align-center">
          <div>
            <h1 class="outfit">Tableau de bord</h1>
            <p class="subtitle outfit">Bienvenue, {{ auth.user()?.firstName }}. Voici le résumé de vos actifs.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary btn-sm outfit" routerLink="/client/transfers/simple">+ NOUVEAU VIREMENT</button>
          </div>
        </div>

        <div class="dashboard-content animate-in">
          <div class="section-head">
            <h3 class="outfit">Comptes & Soldes</h3>
          </div>
          <div class="accounts-horizontal-scroll">
            @for (account of accounts(); track account.id) {
              <div class="premium-account-card" [class.active]="account.status==='ACTIVE'">
                <div class="acc-info">
                  <div class="acc-type outfit">Compte Courant</div>
                  <div class="acc-number outfit">{{ account.accountNumber }}</div>
                </div>
                <div class="acc-balance outfit">
                  {{ account.balance | number:'1.3-3' }} <small>TND</small>
                </div>
                <div class="acc-footer">
                  <span class="acc-status outfit">{{ statusFr(account.status) }}</span>
                  <span class="acc-iban">{{ account.iban }}</span>
                </div>
              </div>
            }
          </div>

          <div class="grid-main mt-3">
            <div class="left-col">
              @if (cards().length) {
                <div class="section-head">
                  <h3 class="outfit">Moyens de paiement</h3>
                </div>
                <div class="cards-stack">
                  @for (card of cards(); track card.id) {
                    <div class="dashboard-card-item glass-style shadow-premium animate-in">
                      <div class="flex-between align-center">
                        <div class="flex align-center gap-1">
                          <div class="card-icon">💳</div>
                          <div>
                            <div class="card-num outfit">{{ card.cardNumberMasked }}</div>
                            <div class="card-status-text outfit">{{ statusFr(card.status) }}</div>
                          </div>
                        </div>
                        <div class="card-amount outfit">{{ card.balance | number:'1.3-3' }} <small>TND</small></div>
                      </div>
                    </div>
                  }
                </div>
              }

              <div class="section-head mt-3">
                <h3 class="outfit">Services Rapides</h3>
              </div>
              <div class="services-grid">
                <a routerLink="/client/transfers/grouped" class="service-pill glass-style">
                  <span class="pill-icon">👥</span>
                  <span class="pill-text outfit">Virements Groupés</span>
                </a>
                <a routerLink="/client/credits/simulate" class="service-pill glass-style">
                  <span class="pill-icon">📊</span>
                  <span class="pill-text outfit">Simulateur Crédit</span>
                </a>
                <a routerLink="/client/cards/request" class="service-pill glass-style">
                  <span class="pill-icon">✨</span>
                  <span class="pill-text outfit">Nouvelle Carte</span>
                </a>
                <a routerLink="/client/chatbot" class="service-pill glass-style">
                  <span class="pill-icon">🤖</span>
                  <span class="pill-text outfit">Assistant IA</span>
                </a>
              </div>
            </div>

            <div class="right-col">
              <div class="promo-card premium-gradient shadow-premium">
                <div class="promo-content">
                  <h4 class="outfit">Prêt Amen First</h4>
                  <p class="outfit">Taux préférentiel de 7.5% pour nos clients premium. Simulez votre crédit en ligne.</p>
                  <button class="btn btn-accent btn-sm mt-1 outfit" routerLink="/client/credits/simulate">SIMULER MAINTENANT</button>
                </div>
                <div class="promo-bg-icon">💰</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .section-head h3 { margin: 2rem 0 1rem; font-size: 0.85rem; color: var(--gray-500); font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
    
    .accounts-horizontal-scroll { display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: none; }
    .accounts-horizontal-scroll::-webkit-scrollbar { display: none; }
    
    .premium-account-card {
      min-width: 320px; padding: 2rem; border-radius: 24px;
      background: white; border: 1px solid var(--gray-100);
      display: flex; flex-direction: column; justify-content: space-between;
      height: 200px; transition: all 0.2s;
    }
    .premium-account-card.active { border-left: 4px solid var(--accent); }
    .premium-account-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
    
    .acc-type { font-size: 0.7rem; color: var(--gray-400); font-weight: 700; text-transform: uppercase; }
    .acc-number { font-size: 1.1rem; font-weight: 800; color: var(--primary); margin-top: 0.25rem; }
    .acc-balance { font-size: 2.2rem; font-weight: 800; color: var(--primary); margin: 1.5rem 0; }
    .acc-balance small { font-size: 1rem; opacity: 0.5; }
    .acc-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--gray-50); padding-top: 1rem; }
    .acc-status { font-size: 0.75rem; font-weight: 800; color: var(--success); }
    .acc-iban { font-size: 0.7rem; color: var(--gray-400); font-family: monospace; }

    .grid-main { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; }
    
    .dashboard-card-item { padding: 1.5rem; border-radius: 20px; margin-bottom: 1rem; }
    .card-icon { font-size: 1.5rem; }
    .card-num { font-size: 0.95rem; font-weight: 700; color: var(--primary); }
    .card-status-text { font-size: 0.7rem; color: var(--gray-400); font-weight: 700; text-transform: uppercase; }
    .card-amount { font-size: 1.2rem; font-weight: 800; color: var(--primary); }
    .card-amount small { font-size: 0.8rem; opacity: 0.5; }

    .services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .service-pill {
      display: flex; align-items: center; gap: 1rem; padding: 1.25rem;
      border-radius: 16px; text-decoration: none; transition: all 0.2s;
    }
    .service-pill:hover { border-color: var(--accent); background: var(--gray-50); transform: translateX(5px); }
    .pill-icon { font-size: 1.2rem; }
    .pill-text { font-size: 0.85rem; font-weight: 700; color: var(--primary); }

    .promo-card {
      padding: 2.5rem; border-radius: 24px; position: relative; overflow: hidden;
      color: white; height: 100%; display: flex; align-items: center;
    }
    .promo-content { position: relative; z-index: 2; }
    .promo-content h4 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .promo-content p { font-size: 0.9rem; opacity: 0.9; line-height: 1.6; }
    .promo-bg-icon {
      position: absolute; right: -20px; bottom: -20px;
      font-size: 10rem; opacity: 0.1; transform: rotate(-15deg);
    }
    .shadow-premium { box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .premium-gradient { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); }
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
