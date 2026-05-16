import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { DashboardStats, Transaction, CreditRequest, AuditLog } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { auditActionFr, entityTypeFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-admin-dashboard',
  imports: [SidebarComponent, NavbarComponent, RouterLink, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <app-navbar />
        <div class="page-header flex-between align-center">
          <div>
            <h1 class="outfit">Administration Système</h1>
            <p class="subtitle outfit">Supervision globale et monitoring en temps réel des flux bancaires.</p>
          </div>
          <div class="header-actions">
            <div class="status-pill outfit"><span class="pulse-dot"></span> SYSTÈME OPÉRATIONNEL</div>
          </div>
        </div>

        <div class="dashboard-content animate-in">
          <!-- Main Stats Row -->
          <div class="stats-grid main-stats mb-3">
            <div class="stat-card premium-gradient shadow-premium">
              <div class="stat-info">
                <div class="stat-label outfit">Volume Financier Global</div>
                <div class="stat-value outfit">{{ (stats()?.totalBalance ?? 0) | number:'1.3-3' }} <small>TND</small></div>
              </div>
              <div class="stat-icon-bg">🏦</div>
            </div>
            
            <div class="stats-sub-grid">
              <div class="stat-card glass-style">
                <div class="stat-label outfit">Utilisateurs Totaux</div>
                <div class="stat-value-sm outfit">{{ stats()?.totalUsers ?? '-' }}</div>
              </div>
              <div class="stat-card glass-style">
                <div class="stat-label outfit">Alertes Fraude</div>
                <div class="stat-value-sm outfit text-danger">{{ stats()?.openFraudAlerts ?? '-' }}</div>
              </div>
            </div>
          </div>

          <div class="grid-layout">
            <!-- Activities Column -->
            <div class="activity-column">
              <div class="section-head flex-between">
                <h3 class="outfit">Journal des Opérations</h3>
                <a routerLink="/admin/superviser/audit-logs" class="link-sm outfit">Voir l'audit complet</a>
              </div>
              
              <div class="activity-feed-premium shadow-premium">
                @for (l of recentLogs(); track l.id) {
                  <div class="audit-item-row">
                    <div class="audit-icon" [class]="'cat-' + auditCat(l.action)"></div>
                    <div class="audit-info">
                      <div class="audit-action outfit">{{ auditActionFr(l.action) }}</div>
                      <div class="audit-meta outfit">{{ l.userName }} • {{ entityTypeFr(l.entityType) }}</div>
                    </div>
                    <div class="audit-time outfit">{{ l.createdAt | date:'HH:mm' }}</div>
                  </div>
                } @empty {
                  <div class="empty-state outfit">Aucune activité récente</div>
                }
              </div>
            </div>

            <!-- Quick Actions Column -->
            <div class="actions-column">
              <div class="section-head">
                <h3 class="outfit">Actions Prioritaires</h3>
              </div>
              
              <div class="priority-actions-list">
                <a routerLink="/admin/superviser/transfers" class="priority-card border-warning">
                  <div class="p-info">
                    <span class="p-count outfit">{{ stats()?.pendingTransfers ?? 0 }}</span>
                    <span class="p-label outfit">Virements en attente</span>
                  </div>
                  <span class="p-arrow">→</span>
                </a>
                
                <a routerLink="/admin/superviser/credits" class="priority-card border-warning">
                  <div class="p-info">
                    <span class="p-count outfit">{{ stats()?.pendingCredits ?? 0 }}</span>
                    <span class="p-label outfit">Crédits à valider</span>
                  </div>
                  <span class="p-arrow">→</span>
                </a>

                <a routerLink="/admin/security-system/fraud-alerts" class="priority-card border-danger">
                  <div class="p-info">
                    <span class="p-count outfit">{{ stats()?.openFraudAlerts ?? 0 }}</span>
                    <span class="p-label outfit">Alertes de sécurité</span>
                  </div>
                  <span class="p-arrow">→</span>
                </a>
              </div>

              <div class="section-head mt-2">
                <h3 class="outfit">Ressources</h3>
              </div>
              <div class="resources-grid">
                <a routerLink="/admin/users" class="res-pill">Utilisateurs</a>
                <a routerLink="/admin/employees" class="res-pill">Employés</a>
                <a routerLink="/admin/reports" class="res-pill">Rapports PDF</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-content { margin-top: 1.5rem; }
    .main-stats { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; }
    .stats-sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    
    .stat-card { padding: 1.5rem; border-radius: 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
    .premium-gradient { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); color: white; border: none; }
    .stat-label { font-size: 0.8rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 2.2rem; font-weight: 800; margin-top: 0.5rem; }
    .stat-value small { font-size: 1rem; opacity: 0.6; }
    .stat-value-sm { font-size: 1.8rem; font-weight: 800; color: var(--primary); }
    .stat-icon-bg { position: absolute; right: -10px; bottom: -10px; font-size: 6rem; opacity: 0.1; transform: rotate(-15deg); }

    .grid-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: start; }
    .section-head { margin-bottom: 1rem; }
    .section-head h3 { font-size: 0.85rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .link-sm { font-size: 0.75rem; color: var(--accent); font-weight: 700; text-decoration: none; text-transform: uppercase; }

    .activity-feed-premium { background: white; border-radius: 24px; border: 1px solid var(--gray-100); overflow: hidden; }
    .audit-item-row { padding: 1.25rem; display: flex; align-items: center; gap: 1.25rem; border-bottom: 1px solid var(--gray-50); transition: background 0.2s; }
    .audit-item-row:hover { background: var(--gray-50); }
    .audit-icon { width: 12px; height: 12px; border-radius: 50%; background: var(--gray-200); }
    .cat-fraud { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
    .cat-approve { background: var(--success); }
    .cat-reject { background: var(--warning); }
    .audit-info { flex: 1; }
    .audit-action { font-size: 0.9rem; font-weight: 700; color: var(--primary); }
    .audit-meta { font-size: 0.75rem; color: var(--gray-500); margin-top: 2px; }
    .audit-time { font-size: 0.75rem; color: var(--gray-400); font-weight: 600; }

    .priority-actions-list { display: flex; flex-direction: column; gap: 1rem; }
    .priority-card {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.5rem; background: white; border-radius: 20px;
      border: 1px solid var(--gray-100); text-decoration: none; transition: all 0.2s;
    }
    .priority-card:hover { transform: translateX(5px); border-color: var(--accent); box-shadow: var(--shadow); }
    .priority-card.border-warning { border-left: 4px solid var(--warning); }
    .priority-card.border-danger { border-left: 4px solid var(--danger); }
    .p-count { font-size: 1.4rem; font-weight: 800; color: var(--primary); display: block; }
    .p-label { font-size: 0.8rem; color: var(--gray-500); font-weight: 700; }
    .p-arrow { color: var(--accent); font-weight: 800; font-size: 1.2rem; }

    .resources-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .res-pill {
      padding: 0.6rem 1rem; background: var(--gray-50); border: 1px solid var(--gray-100);
      border-radius: 100px; color: var(--primary); font-size: 0.8rem; font-weight: 700;
      text-decoration: none; transition: all 0.2s;
    }
    .res-pill:hover { background: var(--primary); color: white; border-color: var(--primary); }

    .status-pill {
      background: var(--gray-50); border: 1px solid var(--gray-100);
      padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.7rem;
      font-weight: 800; color: var(--success); display: flex; align-items: center; gap: 0.6rem;
    }
    .pulse-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
    .shadow-premium { box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  recentTransfers = signal<Transaction[]>([]);
  recentCredits = signal<CreditRequest[]>([]);
  recentLogs = signal<AuditLog[]>([]);
  navItems = ADMIN_NAV;
  auditActionFr = auditActionFr;
  entityTypeFr = entityTypeFr;

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
