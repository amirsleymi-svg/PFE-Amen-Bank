import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { DashboardStats, Transaction, CreditRequest, AuditLog } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  imports: [SidebarComponent, RouterLink, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Administration Système</h1>
          <p>Supervision globale et monitoring en temps réel des flux bancaires.</p>
        </div>

        <!-- Financial Summary -->
        <div class="financial-summary mb-3">
          <div class="stat-card premium-gradient">
            <div class="flex-between">
              <div class="stat-label">Volume financier total (Actif)</div>
              <div class="accent-dot pulse"></div>
            </div>
            <div class="stat-value outfit">{{ (stats()?.totalBalance ?? 0) | number:'1.3-3' }} <span class="currency-tag">TND</span></div>
          </div>
        </div>

        <!-- Core Stats Grid -->
        <div class="dashboard-grid">
          <section>
            <h3 class="section-title outfit">Utilisateurs</h3>
            <div class="stats-grid compact">
              <div class="stat-card glass-style"><div class="stat-label">Total</div><div class="stat-value outfit">{{ stats()?.totalUsers ?? '-' }}</div></div>
              <div class="stat-card glass-style"><div class="stat-label">Clients</div><div class="stat-value outfit text-info">{{ stats()?.totalClients ?? '-' }}</div></div>
              <div class="stat-card glass-style"><div class="stat-label">Employés</div><div class="stat-value outfit">{{ stats()?.totalEmployees ?? '-' }}</div></div>
            </div>
          </section>

          <section>
            <h3 class="section-title outfit">Alertes & Attente</h3>
            <div class="stats-grid compact">
              <div class="stat-card glass-style border-warning"><div class="stat-label">Virements</div><div class="stat-value outfit text-warning">{{ stats()?.pendingTransfers ?? '-' }}</div></div>
              <div class="stat-card glass-style border-warning"><div class="stat-label">Crédits</div><div class="stat-value outfit text-warning">{{ stats()?.pendingCredits ?? '-' }}</div></div>
              <div class="stat-card glass-style border-danger"><div class="stat-label">Fraude</div><div class="stat-value outfit text-danger">{{ stats()?.openFraudAlerts ?? '-' }}</div></div>
            </div>
          </section>
        </div>

        <!-- Activity feed (3 columns) -->
        <h3 class="section-title outfit mt-3">Monitoring en direct</h3>
        <div class="activity-grid">
          <!-- Transfers -->
          <div class="activity-card premium-surface">
            <div class="activity-head">
              <div class="activity-title outfit">Virements récents</div>
              <a routerLink="/admin/transfers" class="activity-link">Tout voir</a>
            </div>
            <div class="activity-body">
              @for (t of recentTransfers(); track t.id) {
                <div class="activity-item">
                  <div class="activity-main">
                    <span class="activity-amount outfit">{{ t.amount | number:'1.3-3' }} <small>TND</small></span>
                    @if (isAutoTransfer(t)) {
                      <span class="badge badge-success">⚡ AUTO</span>
                    } @else if (t.approvedByName) {
                      <span class="badge badge-dark">👤 {{ shortName(t.approvedByName) }}</span>
                    }
                  </div>
                  <div class="activity-meta">
                    <span class="activity-name">{{ t.initiatedByName }}</span>
                    <span class="status-indicator" [class]="'st-' + t.status.toLowerCase()"></span>
                  </div>
                  <div class="activity-date">{{ t.createdAt | date:'dd/MM HH:mm' }}</div>
                </div>
              } @empty {
                <div class="empty-mini">Aucun flux détecté</div>
              }
            </div>
          </div>

          <!-- Credits -->
          <div class="activity-card premium-surface">
            <div class="activity-head">
              <div class="activity-title outfit">Demandes de crédit</div>
              <a routerLink="/admin/credits" class="activity-link">Tout voir</a>
            </div>
            <div class="activity-body">
              @for (c of recentCredits(); track c.id) {
                <div class="activity-item">
                  <div class="activity-main">
                    <span class="activity-amount outfit">{{ c.amount | number:'1.3-3' }} <small>TND</small></span>
                    <span class="badge badge-neutral">{{ c.durationMonths }}m</span>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-name">{{ c.clientName }}</span>
                    <span class="status-indicator" [class]="'st-' + c.status.toLowerCase()"></span>
                  </div>
                  <div class="activity-date">{{ c.createdAt | date:'dd/MM HH:mm' }}</div>
                </div>
              } @empty {
                <div class="empty-mini">Aucune demande</div>
              }
            </div>
          </div>

          <!-- Audit logs -->
          <div class="activity-card premium-surface">
            <div class="activity-head">
              <div class="activity-title outfit">Journal d'audit</div>
              <a routerLink="/admin/audit-logs" class="activity-link">Tout voir</a>
            </div>
            <div class="activity-body">
              @for (l of recentLogs(); track l.id) {
                <div class="activity-item">
                  <div class="activity-main">
                    <span class="badge" [class]="'badge-' + auditCat(l.action)">{{ l.action }}</span>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-name">{{ l.userName }}</span>
                    <span class="badge-sub">{{ l.entityType }}</span>
                  </div>
                  <div class="activity-date">{{ l.createdAt | date:'dd/MM HH:mm' }}</div>
                </div>
              } @empty {
                <div class="empty-mini">Journal vide</div>
              }
            </div>
          </div>
        </div>

        <!-- Quick links -->
        <h3 class="section-title outfit">Gestion Rapide</h3>
        <div class="quick-grid">
          <a routerLink="/admin/users" class="card quick-item"><div class="quick-icon">👥</div><div class="quick-title">Utilisateurs</div></a>
          <a routerLink="/admin/bank-accounts" class="card quick-item"><div class="quick-icon">🏦</div><div class="quick-title">Comptes</div></a>
          <a routerLink="/admin/registrations" class="card quick-item"><div class="quick-icon">📋</div><div class="quick-title">Inscriptions</div></a>
          <a routerLink="/admin/transfers" class="card quick-item"><div class="quick-icon">💸</div><div class="quick-title">Virements</div></a>
          <a routerLink="/admin/credits" class="card quick-item"><div class="quick-icon">💰</div><div class="quick-title">Crédits</div></a>
          <a routerLink="/admin/fraud-alerts" class="card quick-item"><div class="quick-icon">🚨</div><div class="quick-title">Fraude</div></a>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .section-title { margin: 1.5rem 0 0.75rem; font-size: 0.8rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    
    .financial-summary .stat-card { padding: 2rem; }
    .premium-gradient { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); color: white; border: none; }
    .premium-gradient .stat-label { color: var(--accent); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .premium-gradient .stat-value { font-size: 2.5rem; margin-top: 0.5rem; }
    .currency-tag { font-size: 1rem; opacity: 0.6; margin-left: 0.5rem; }

    .pulse { animation: pulse-shadow 2s infinite; }
    @keyframes pulse-shadow {
      0% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(197, 160, 89, 0); }
      100% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0); }
    }

    .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .stats-grid.compact { grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .glass-style { background: white; border: 1px solid var(--gray-100); padding: 1.25rem; }
    .glass-style .stat-label { font-size: 0.7rem; color: var(--gray-500); font-weight: 700; text-transform: uppercase; }
    .glass-style .stat-value { font-size: 1.5rem; margin-top: 0.25rem; }

    .border-warning { border-left: 3px solid var(--warning); }
    .border-danger { border-left: 3px solid var(--danger); }

    .activity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .premium-surface { background: white; border: 1px solid var(--gray-100); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow); }
    .activity-head { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: var(--gray-50); border-bottom: 1px solid var(--gray-100); }
    .activity-title { font-weight: 800; color: var(--primary); font-size: 0.85rem; text-transform: uppercase; }
    .activity-link { font-size: 0.75rem; color: var(--accent); font-weight: 700; text-decoration: none; text-transform: uppercase; }
    
    .activity-body { max-height: 420px; overflow-y: auto; }
    .activity-item { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gray-50); transition: all 0.2s; }
    .activity-item:hover { background: var(--gray-50); }

    .activity-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
    .activity-amount { font-weight: 700; color: var(--primary); font-size: 1rem; }
    .activity-amount small { font-size: 0.7rem; opacity: 0.6; }
    .activity-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--gray-600); }
    .activity-name { font-weight: 500; }
    .activity-date { font-size: 0.7rem; color: var(--gray-400); margin-top: 0.5rem; }

    .status-indicator { width: 8px; height: 8px; border-radius: 50%; }
    .st-pending { background: var(--warning); box-shadow: 0 0 6px var(--warning); }
    .st-approved, .st-executed, .st-disbursed { background: var(--success); box-shadow: 0 0 6px var(--success); }
    .st-rejected, .st-failed { background: var(--danger); box-shadow: 0 0 6px var(--danger); }

    .badge-sub { font-size: 0.7rem; color: var(--gray-500); background: var(--gray-100); padding: 0.1rem 0.4rem; border-radius: 4px; }
    .empty-mini { padding: 3rem 1rem; text-align: center; color: var(--gray-400); font-size: 0.85rem; font-style: italic; }

    .quick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
    .quick-item { 
      text-decoration: none; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; 
      background: white; border: 1px solid var(--gray-100); border-radius: var(--radius); transition: all 0.2s;
    }
    .quick-item:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--accent); }
    .quick-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .quick-title { font-weight: 700; color: var(--primary); font-size: 0.75rem; text-transform: uppercase; }

    .text-info { color: var(--info) !important; }
    .text-warning { color: var(--warning) !important; }
    .text-danger { color: var(--danger) !important; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  recentTransfers = signal<Transaction[]>([]);
  recentCredits = signal<CreditRequest[]>([]);
  recentLogs = signal<AuditLog[]>([]);
  navItems = ADMIN_NAV;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboardStats().subscribe({
      next: r => { if (r.data) this.stats.set(r.data); },
      error: () => {}
    });
    this.api.getAdminTransfers(0).subscribe({
      next: r => { if (r.data?.content) this.recentTransfers.set(r.data.content.slice(0, 8)); },
      error: () => {}
    });
    this.api.getAdminCredits(0).subscribe({
      next: r => { if (r.data?.content) this.recentCredits.set(r.data.content.slice(0, 8)); },
      error: () => {}
    });
    this.api.getAuditLogs(0).subscribe({
      next: r => { if (r.data?.content) this.recentLogs.set(r.data.content.slice(0, 10)); },
      error: () => {}
    });
  }

  isAutoTransfer(t: Transaction): boolean {
    return !t.approvedByName && (t.status === 'APPROVED' || t.status === 'EXECUTED');
  }

  shortName(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[0] + ' ' + parts[parts.length - 1][0] + '.' : parts[0];
  }

  auditCat(action: string): string {
    const a = (action || '').toUpperCase();
    if (a.includes('FRAUD')) return 'fraud';
    if (a.includes('APPROVE')) return 'approve';
    if (a.includes('REJECT')) return 'reject';
    if (a.includes('DISABLE') || a.includes('FREEZE') || a.includes('LOCK')) return 'disable';
    if (a.includes('ACTIVATE') || a.includes('UNLOCK') || a.includes('ENABLE')) return 'activate';
    if (a.includes('DELETE') || a.includes('REMOVE')) return 'delete';
    if (a.includes('CREATE') || a.includes('INITIATE') || a.includes('REGISTER')) return 'create';
    if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH')) return 'login';
    return 'other';
  }
}
