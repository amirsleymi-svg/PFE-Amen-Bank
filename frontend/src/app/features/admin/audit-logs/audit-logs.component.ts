import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { AuditLog } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';
import { auditActionFr, entityTypeFr } from '../../../shared/display-labels';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';

type ActionCategory = 'approve' | 'reject' | 'create' | 'delete' | 'disable' | 'activate' | 'login' | 'fraud' | 'other';

@Component({
  selector: 'app-audit-logs',
  imports: [SidebarComponent, DatePipe, FormsModule],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1 class="outfit">Journal de Sécurité</h1>
            <p class="subtitle">Traçabilité d'audit et supervision des flux administratifs.</p>
          </div>
          @if (logs().length) {
            <button class="btn btn-ghost btn-danger-text" (click)="showConfirmAll.set(true)">Effacer l'historique</button>
          }
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <!-- Premium Stats Grid -->
        <div class="analytics-grid mb-3">
          <div class="stat-card premium-surface">
            <span class="stat-label outfit">Total Événements</span>
            <div class="stat-value outfit">{{ logs().length }}</div>
            <div class="stat-footer outfit">Depuis la création</div>
          </div>
          <div class="stat-card accent-gradient">
            <span class="stat-label outfit">Aujourd'hui</span>
            <div class="stat-value outfit">{{ todayCount() }}</div>
            <div class="stat-footer outfit">Actions en 24h</div>
          </div>
          <div class="stat-card success-surface">
            <span class="stat-label outfit">Approbations</span>
            <div class="stat-value outfit text-success">{{ counts().approve }}</div>
            <div class="stat-footer outfit">Flux validés</div>
          </div>
          <div class="stat-card warning-surface">
            <span class="stat-label outfit">Alertes Sécurité</span>
            <div class="stat-value outfit text-warning">{{ counts().fraud + counts().disable }}</div>
            <div class="stat-footer outfit">Fraude & Suspensions</div>
          </div>
        </div>

        <!-- Forensic Filters -->
        <div class="forensic-filters mb-2">
          <div class="search-wrapper">
            <input
              class="premium-input outfit"
              type="text"
              placeholder="🔍 Recherche d'audit (IP, utilisateur, détails...)"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)" />
          </div>
          <div class="select-group">
            <select class="premium-select outfit" [ngModel]="category()" (ngModelChange)="category.set($event)">
              <option value="">Toutes Catégories</option>
              <option value="approve">Approbations</option>
              <option value="reject">Rejets</option>
              <option value="fraud">Alertes Fraude</option>
              <option value="login">Authentification</option>
            </select>
            <select class="premium-select outfit" [ngModel]="entityFilter()" (ngModelChange)="entityFilter.set($event)">
              <option value="">Toutes Entités</option>
              @for (e of entityTypes(); track e) { <option [value]="e">{{ e }}</option> }
            </select>
          </div>
          <div class="filter-meta outfit">
            {{ filtered().length }} résultats trouvés
          </div>
        </div>

        <!-- Confirm delete all dialog -->
        @if (showConfirmAll()) {
          <div class="overlay animate-in" (click)="showConfirmAll.set(false)">
            <div class="dialog glass-style" (click)="$event.stopPropagation()">
              <h3 class="outfit">Suppression Historique</h3>
              <p>Confirmez-vous la purge de <strong>{{ logs().length }}</strong> entrées ?</p>
              <p class="text-danger size-sm mb-2">Cette action est définitive et conforme aux audits.</p>
              <div class="flex gap-1">
                <button class="btn btn-ghost" (click)="showConfirmAll.set(false)">Annuler</button>
                <button class="btn btn-danger" (click)="deleteAll()" [disabled]="deleting()">
                  {{ deleting() ? 'Purge en cours...' : 'Confirmer la purge' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Forensic Details Modal -->
        @if (selected(); as s) {
          <div class="overlay animate-in" (click)="selected.set(null)">
            <div class="dialog dialog-lg premium-surface shadow-2xl" (click)="$event.stopPropagation()">
              <div class="flex-between mb-2">
                <h3 class="outfit">Détails Événement #{{ s.id }}</h3>
                <button class="btn-close" (click)="selected.set(null)">✕</button>
              </div>
              <div class="detail-grid">
                <div class="detail-item"><span class="k outfit">Opérateur</span><span class="v outfit font-bold">{{ s.userName }}</span></div>
                <div class="detail-item"><span class="k outfit">Action</span><span class="v"><span class="badge" [class]="'badge-' + categoryOf(s.action)">{{ auditActionFr(s.action) }}</span></span></div>
                <div class="detail-item"><span class="k outfit">Cible</span><span class="v">{{ entityTypeFr(s.entityType) }} <small class="text-muted">#{{ s.entityId }}</small></span></div>
                <div class="detail-item"><span class="k outfit">Adresse IP</span><span class="v code">{{ s.ipAddress || 'Interne' }}</span></div>
                <div class="detail-item"><span class="k outfit">Horodatage</span><span class="v">{{ s.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span></div>
              </div>
              <div class="detail-block mt-2">
                <span class="k outfit mb-1">Rapport de données</span>
                <div class="data-report">{{ s.details || 'Aucune donnée contextuelle disponible.' }}</div>
              </div>
            </div>
          </div>
        }

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Opérateur</th>
                  <th class="outfit">Action</th>
                  <th class="outfit">Entité</th>
                  <th class="outfit">Adresse IP</th>
                  <th class="outfit">Date</th>
                  <th class="outfit text-right">Contrôle</th>
                </tr>
              </thead>
              <tbody>
                @for (l of filtered(); track l.id) {
                  <tr class="log-row animate-in" (click)="selected.set(l)">
                    <td class="font-bold color-primary">{{ l.userName }}</td>
                    <td><span class="badge" [class]="'badge-' + categoryOf(l.action)">{{ auditActionFr(l.action) }}</span></td>
                    <td>
                      <span class="entity-tag">{{ entityTypeFr(l.entityType) }}</span>
                    </td>
                    <td><code class="ip-address">{{ l.ipAddress || '—' }}</code></td>
                    <td class="color-gray size-sm">{{ l.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <div class="flex gap-1 justify-end">
                        <button class="btn btn-ghost btn-sm" (click)="$event.stopPropagation(); selected.set(l)">Détails</button>
                        <button class="btn btn-ghost btn-danger-text btn-sm" (click)="$event.stopPropagation(); deleteLog(l.id)">✕</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <div class="empty-icon">🛡️</div>
                        <p class="outfit">Aucun événement ne correspond à vos critères.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
    .stat-card { padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--gray-100); }
    .stat-label { font-size: 0.7rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .stat-value { font-size: 2rem; font-weight: 800; margin: 0.5rem 0; color: var(--primary); }
    .stat-footer { font-size: 0.75rem; color: var(--gray-400); }

    .accent-gradient { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border: none; }
    .accent-gradient .stat-label { color: var(--accent); }
    .accent-gradient .stat-value, .accent-gradient .stat-footer { color: white; }

    .forensic-filters { display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem 1.5rem; border-radius: var(--radius); border: 1px solid var(--gray-100); }
    .search-wrapper { flex: 1; }
    .premium-input { width: 100%; border: 1px solid var(--gray-100); padding: 0.75rem 1.25rem; border-radius: var(--radius-sm); background: var(--gray-50); }
    .select-group { display: flex; gap: 0.5rem; }
    .premium-select { border: 1px solid var(--gray-100); padding: 0.75rem 1rem; border-radius: var(--radius-sm); background: white; font-size: 0.85rem; font-weight: 600; color: var(--gray-600); }
    .filter-meta { font-size: 0.75rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; }

    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gray-50); }
    .log-row { cursor: pointer; transition: all 0.05s; }
    .log-row:hover { background: var(--gray-50); }

    .badge { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
    .badge-approve { background: var(--success-light); color: var(--success); }
    .badge-reject { background: var(--danger-light); color: var(--danger); }
    .badge-fraud { background: var(--warning); color: var(--primary); border: 1px solid var(--accent); }
    .badge-login { background: var(--info-light); color: var(--info); }
    .badge-other { background: var(--gray-100); color: var(--gray-600); }

    .entity-tag { font-size: 0.7rem; font-weight: 700; background: var(--gray-100); color: var(--gray-600); padding: 0.2rem 0.5rem; border-radius: 4px; }
    .ip-address { font-family: monospace; font-size: 0.8rem; color: var(--gray-400); }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem; background: var(--gray-50); border-radius: var(--radius); }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-item .k { font-size: 0.65rem; color: var(--gray-400); text-transform: uppercase; font-weight: 800; }
    .detail-item .v { font-size: 0.95rem; color: var(--primary); }
    .data-report { background: var(--primary); color: white; padding: 1.5rem; border-radius: var(--radius); font-size: 0.9rem; line-height: 1.6; font-family: 'Inter', sans-serif; }

    .btn-close { border: none; background: none; font-size: 1.5rem; color: var(--gray-400); cursor: pointer; transition: color 0.2s; }
    .btn-close:hover { color: var(--danger); }
    .btn-danger-text { color: var(--danger) !important; font-weight: 700; }
    
    .empty-state { padding: 5rem 2rem; text-align: center; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.2; }
  `]
})
export class AuditLogsComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  msg = signal('');
  isError = signal(false);
  showConfirmAll = signal(false);
  deleting = signal(false);
  search = signal('');
  category = signal<string>('');
  entityFilter = signal<string>('');
  selected = signal<AuditLog | null>(null);
  auditActionFr = auditActionFr;
  entityTypeFr = entityTypeFr;

  constructor(private api: ApiService, private wsService: NotificationWebsocketService) {}

  ngOnInit() { this.load(); }

  navItems = ADMIN_NAV;

  entityTypes = computed(() => {
    const set = new Set(this.logs().map(l => l.entityType).filter(Boolean));
    return Array.from(set).sort();
  });

  todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.logs().filter(l => (l.createdAt || '').slice(0, 10) === today).length;
  });

  uniqueUsers = computed(() => new Set(this.logs().map(l => l.userName)).size);

  counts = computed(() => {
    const c = { approve: 0, reject: 0, create: 0, delete: 0, disable: 0, activate: 0, login: 0, fraud: 0, other: 0 };
    for (const l of this.logs()) c[this.categoryOf(l.action)]++;
    return c;
  });

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const cat = this.category();
    const ent = this.entityFilter();
    return this.logs().filter(l => {
      if (cat && this.categoryOf(l.action) !== cat) return false;
      if (ent && l.entityType !== ent) return false;
      if (q && !(
        (l.userName || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.entityType || '').toLowerCase().includes(q) ||
        (l.ipAddress || '').toLowerCase().includes(q)
      )) return false;
      return true;
    });
  });

  categoryOf(action: string): ActionCategory {
    const a = (action || '').toUpperCase();
    if (a.includes('FRAUD')) return 'fraud';
    if (a.includes('APPROVE') || a.includes('APPROBATION')) return 'approve';
    if (a.includes('REJECT') || a.includes('REJET') || a.includes('REFUS')) return 'reject';
    if (a.includes('DISABLE') || a.includes('FREEZE') || a.includes('LOCK') || a.includes('SUSPENSION') || a.includes('GEL')) return 'disable';
    if (a.includes('ACTIVATE') || a.includes('UNLOCK') || a.includes('ENABLE') || a.includes('ACTIVATION')) return 'activate';
    if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('SUPPRESSION')) return 'delete';
    if (a.includes('CREATE') || a.includes('INITIATE') || a.includes('REGISTER') || a.includes('CREATION') || a.includes('DEMANDE')) return 'create';
    if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH') || a.includes('CONNEXION')) return 'login';
    return 'other';
  }

  clearFilters() {
    this.search.set('');
    this.category.set('');
    this.entityFilter.set('');
  }

  load() {
    this.api.getAuditLogs().subscribe({
      next: r => {
        if (r.data?.content) this.logs.set(r.data.content);
        this.api.markBadgesSeen().subscribe({ next: () => this.wsService.fetchCounts(), error: () => {} });
      },
      error: () => {}
    });
  }

  showMsg(text: string, error = false) {
    this.msg.set(text);
    this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  deleteLog(id: number) {
    this.api.deleteAuditLog(id).subscribe({
      next: () => { this.showMsg('Journal supprimé'); this.load(); },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  deleteAll() {
    this.deleting.set(true);
    this.api.deleteAllAuditLogs().subscribe({
      next: () => {
        this.deleting.set(false);
        this.showConfirmAll.set(false);
        this.showMsg('Tous les journaux ont été supprimés');
        this.load();
      },
      error: (e) => {
        this.deleting.set(false);
        this.showConfirmAll.set(false);
        this.showMsg(e.error?.message || 'Erreur', true);
      }
    });
  }
}
