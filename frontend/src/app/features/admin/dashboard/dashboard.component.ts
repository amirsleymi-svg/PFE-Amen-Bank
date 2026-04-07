import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent, NavItem } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { DashboardStats } from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [SidebarComponent, RouterLink],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header"><h1>Administration</h1><p>Vue d'ensemble du systeme</p></div>
        <div class="stats-grid">
          <div class="stat-card stat-primary"><div class="stat-label">Total utilisateurs</div><div class="stat-value">{{ stats()?.totalUsers ?? '-' }}</div></div>
          <div class="stat-card stat-info"><div class="stat-label">Clients</div><div class="stat-value">{{ stats()?.totalClients ?? '-' }}</div></div>
          <div class="stat-card"><div class="stat-label">Employes</div><div class="stat-value">{{ stats()?.totalEmployees ?? '-' }}</div></div>
          <div class="stat-card stat-warning"><div class="stat-label">Inscriptions en attente</div><div class="stat-value">{{ stats()?.pendingRegistrations ?? '-' }}</div></div>
          <div class="stat-card stat-warning"><div class="stat-label">Credits en attente</div><div class="stat-value">{{ stats()?.pendingCredits ?? '-' }}</div></div>
          <div class="stat-card stat-danger"><div class="stat-label">Resets mot de passe</div><div class="stat-value">{{ stats()?.pendingPasswordResets ?? '-' }}</div></div>
        </div>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <a routerLink="/admin/users" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">👥</div><div style="font-weight:600;">Utilisateurs</div></a>
          <a routerLink="/admin/registrations" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">📋</div><div style="font-weight:600;">Inscriptions</div></a>
          <a routerLink="/admin/password-resets" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">🔑</div><div style="font-weight:600;">Resets</div></a>
          <a routerLink="/admin/transfers" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">💸</div><div style="font-weight:600;">Virements</div></a>
          <a routerLink="/admin/credits" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">💰</div><div style="font-weight:600;">Credits</div></a>
          <a routerLink="/admin/audit-logs" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">📜</div><div style="font-weight:600;">Audit Logs</div></a>
          <a routerLink="/admin/reports" class="card" style="text-decoration:none; text-align:center;"><div style="font-size:1.5rem;">📝</div><div style="font-weight:600;">Rapports</div></a>
        </div>
      </main>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/admin/dashboard', icon: '📊' },
    { label: 'Utilisateurs', route: '/admin/users', icon: '👥' },
    { label: 'Inscriptions', route: '/admin/registrations', icon: '📋' },
    { label: 'Resets MDP', route: '/admin/password-resets', icon: '🔑' },
    { label: 'Virements', route: '/admin/transfers', icon: '💸' },
    { label: 'Credits', route: '/admin/credits', icon: '💰' },
    { label: 'Audit Logs', route: '/admin/audit-logs', icon: '📜' },
    { label: 'Rapports', route: '/admin/reports', icon: '📝' },
  ];
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getDashboardStats().subscribe(r => { if (r.data) this.stats.set(r.data); }); }
}
