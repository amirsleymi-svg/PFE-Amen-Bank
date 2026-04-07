import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent, NavItem } from '../../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-employee-dashboard',
  imports: [SidebarComponent, RouterLink],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header"><h1>Espace Employe</h1><p>Gerez les demandes de virements, credits et rapports</p></div>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
          <a routerLink="/employee/transfers" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">💸</div><div style="font-weight:600;">Virements en attente</div>
          </a>
          <a routerLink="/employee/credits" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">💰</div><div style="font-weight:600;">Credits en attente</div>
          </a>
          <a routerLink="/employee/reports" class="card" style="text-decoration:none; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">📝</div><div style="font-weight:600;">Rapports journaliers</div>
          </a>
        </div>
      </main>
    </div>
  `
})
export class EmployeeDashboardComponent {
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/employee/dashboard', icon: '📊' },
    { label: 'Virements', route: '/employee/transfers', icon: '💸' },
    { label: 'Credits', route: '/employee/credits', icon: '💰' },
    { label: 'Rapports', route: '/employee/reports', icon: '📝' },
  ];
}
