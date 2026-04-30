import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-transfers',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1>Suivi des virements</h1>
            <p class="subtitle">Historique complet : auto-exécutés et validés par employé</p>
          </div>
          <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuves</option>
            <option value="EXECUTED">Executes</option>
            <option value="REJECTED">Rejetes</option>
            <option value="FAILED">Echoues</option>
          </select>
        </div>

        <!-- KPI strip -->
        <div class="kpi-grid">
          <div class="kpi kpi-total"><span class="kpi-label">Total</span><span class="kpi-value">{{ transfers().length }}</span></div>
          <div class="kpi kpi-auto"><span class="kpi-label">Auto-exécutés</span><span class="kpi-value">{{ autoCount() }}</span></div>
          <div class="kpi kpi-manual"><span class="kpi-label">Validés employé</span><span class="kpi-value">{{ manualCount() }}</span></div>
          <div class="kpi kpi-pending"><span class="kpi-label">En attente</span><span class="kpi-value">{{ pendingCount() }}</span></div>
          <div class="kpi kpi-volume"><span class="kpi-label">Volume total</span><span class="kpi-value">{{ totalVolume() | number:'1.3-3' }} TND</span></div>
        </div>

        <div class="card"><div class="table-container"><table>
          <thead><tr>
            <th>Référence</th>
            <th>Type</th>
            <th>Montant</th>
            <th>Client (initiateur)</th>
            <th>Mode validation</th>
            <th>Validé par</th>
            <th>Statut</th>
            <th>Créé le</th>
            <th>Exécuté le</th>
          </tr></thead>
          <tbody>
            @for (t of transfers(); track t.id) {
              <tr>
                <td><code class="ref">{{ t.reference }}</code></td>
                <td><span class="type-chip">{{ typeLabel(t.type) }}</span></td>
                <td class="amount">{{ t.amount | number:'1.3-3' }} TND</td>
                <td>{{ t.initiatedByName }}</td>
                <td>
                  @if (isAutoApproved(t)) {
                    <span class="mode-badge mode-auto" title="Exécuté automatiquement (montant sous le seuil)">⚡ Automatique</span>
                  } @else if (t.approvedByName) {
                    <span class="mode-badge mode-manual" title="Validé manuellement par un employé">👤 Employé</span>
                  } @else if (t.status === 'PENDING') {
                    <span class="mode-badge mode-pending">⏳ En attente</span>
                  } @else {
                    <span class="mode-badge mode-other">—</span>
                  }
                </td>
                <td>{{ t.approvedByName || (isAutoApproved(t) ? 'Système (auto)' : '—') }}</td>
                <td>
                  <span class="badge"
                    [class.badge-warning]="t.status==='PENDING'"
                    [class.badge-info]="t.status==='APPROVED'"
                    [class.badge-success]="t.status==='EXECUTED'"
                    [class.badge-danger]="t.status==='REJECTED'||t.status==='FAILED'">
                    {{ t.status }}
                  </span>
                </td>
                <td>{{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ t.executedAt ? (t.executedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="9" class="text-center" style="padding:2rem;color:#9ca3af;">Aucun virement</td></tr> }
          </tbody>
        </table></div></div>
      </main>
    </div>
  `,
  styles: [`
    .subtitle { color: #6b7280; font-size: 0.9rem; margin: 0.25rem 0 0; }
    .filter-select { padding:0.5rem 0.75rem;border:1px solid #ddd;border-radius:8px;font-size:0.9rem; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .kpi {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #6b7280;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .kpi-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    .kpi-value { font-size: 1.35rem; font-weight: 700; color: #111827; }
    .kpi-total { border-left-color: #3b82f6; }
    .kpi-auto { border-left-color: #10b981; }
    .kpi-manual { border-left-color: #8b5cf6; }
    .kpi-pending { border-left-color: #f59e0b; }
    .kpi-volume { border-left-color: #111827; }

    .ref { font-family: monospace; font-size: 0.8rem; background: #f3f4f6; padding: 0.1rem 0.4rem; border-radius: 4px; color: #374151; }
    .type-chip { display: inline-block; padding: 0.15rem 0.55rem; background: #eef2ff; color: #3730a3; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }

    .mode-badge {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .mode-auto { background: #d1fae5; color: #065f46; }
    .mode-manual { background: #ede9fe; color: #5b21b6; }
    .mode-pending { background: #fef3c7; color: #92400e; }
    .mode-other { background: #f3f4f6; color: #6b7280; }
  `]
})
export class AdminTransfersComponent implements OnInit {
  transfers = signal<Transaction[]>([]);
  filterStatus = '';
  navItems = ADMIN_NAV;

  autoCount = computed(() => this.transfers().filter(t => this.isAutoApproved(t)).length);
  manualCount = computed(() => this.transfers().filter(t => !!t.approvedByName).length);
  pendingCount = computed(() => this.transfers().filter(t => t.status === 'PENDING').length);
  totalVolume = computed(() => this.transfers().reduce((sum, t) => sum + (Number(t.amount) || 0), 0));

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }

  isAutoApproved(t: Transaction): boolean {
    return !t.approvedByName && (t.status === 'APPROVED' || t.status === 'EXECUTED');
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'TRANSFER_SIMPLE': return 'Simple';
      case 'TRANSFER_GROUPED': return 'Groupé';
      case 'TRANSFER_PERMANENT': return 'Permanent';
      default: return type;
    }
  }

  load() {
    this.api.getAdminTransfers(0, this.filterStatus || undefined).subscribe({
      next: r => { if (r.data?.content) this.transfers.set(r.data.content); },
      error: () => {}
    });
  }
}
