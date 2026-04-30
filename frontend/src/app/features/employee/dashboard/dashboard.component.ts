import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { EMPLOYEE_NAV } from '../../../shared/nav-items';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employee-dashboard',
  imports: [SidebarComponent, RouterLink],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <div class="flex-between align-end">
            <div>
              <h1 class="outfit">Espace Opérationnel</h1>
              <p>Bienvenue, {{ auth.user()?.firstName }} — Prêt pour la supervision des flux.</p>
            </div>
            <div class="status-badge outfit">
              <span class="pulse-dot"></span> Système Connecté
            </div>
          </div>
        </div>

        <div class="stats-grid employee-grid mt-2">
          <a routerLink="/employee/transfers" class="card premium-action-card">
            <div class="card-icon">💸</div>
            <div class="card-content">
              <h3 class="outfit">Virements</h3>
              <p>Traiter les validations en attente</p>
            </div>
            <div class="card-arrow">→</div>
          </a>

          <a routerLink="/employee/credits" class="card premium-action-card">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3 class="outfit">Crédits</h3>
              <p>Analyse et décision des dossiers</p>
            </div>
            <div class="card-arrow">→</div>
          </a>

          <a routerLink="/employee/balance" class="card premium-action-card">
            <div class="card-icon">💵</div>
            <div class="card-content">
              <h3 class="outfit">Gestion Solde</h3>
              <p>Créditer les comptes clients</p>
            </div>
            <div class="card-arrow">→</div>
          </a>

          <a routerLink="/employee/reports" class="card premium-action-card">
            <div class="card-icon">📝</div>
            <div class="card-content">
              <h3 class="outfit">Rapports</h3>
              <p>Extraction des journaux d'activité</p>
            </div>
            <div class="card-arrow">→</div>
          </a>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .employee-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
    
    .status-badge {
      background: var(--gray-50); border: 1px solid var(--gray-100);
      padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.75rem;
      font-weight: 700; color: var(--success); text-transform: uppercase;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .pulse-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    .premium-action-card {
      text-decoration: none; display: flex; align-items: center; gap: 1.25rem;
      padding: 1.75rem; border: 1px solid var(--gray-100); border-radius: var(--radius-lg);
      background: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .premium-action-card:hover {
      transform: translateY(-5px); border-color: var(--accent);
      box-shadow: var(--shadow-lg);
    }
    .premium-action-card:hover .card-arrow { transform: translateX(5px); opacity: 1; }
    
    .card-icon { font-size: 2rem; background: var(--gray-50); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 15px; }
    .card-content h3 { font-size: 1.1rem; color: var(--primary); margin-bottom: 0.25rem; }
    .card-content p { font-size: 0.8rem; color: var(--gray-500); margin: 0; }
    
    .card-arrow { font-size: 1.25rem; color: var(--accent); opacity: 0.3; transition: all 0.2s; margin-left: auto; }
  `]
})
export class EmployeeDashboardComponent {
  navItems = EMPLOYEE_NAV;
  constructor(public auth: AuthService) {}
}
