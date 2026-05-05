import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { CreditRequest } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-admin-credits',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1>Suivi des crédits</h1>
            <p class="subtitle">Historique complet des demandes et décisions employé</p>
          </div>
          <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvés</option>
            <option value="DISBURSED">Déboursés</option>
            <option value="REJECTED">Rejetés</option>
          </select>
        </div>

        <!-- KPI strip -->
        <div class="kpi-grid">
          <div class="kpi kpi-total"><span class="kpi-label">Total</span><span class="kpi-value">{{ credits().length }}</span></div>
          <div class="kpi kpi-pending"><span class="kpi-label">En attente</span><span class="kpi-value">{{ pendingCount() }}</span></div>
          <div class="kpi kpi-approved"><span class="kpi-label">Approuvés / Déboursés</span><span class="kpi-value">{{ approvedCount() }}</span></div>
          <div class="kpi kpi-rejected"><span class="kpi-label">Rejetés</span><span class="kpi-value">{{ rejectedCount() }}</span></div>
          <div class="kpi kpi-volume"><span class="kpi-label">Volume demandé</span><span class="kpi-value">{{ totalVolume() | number:'1.3-3' }} TND</span></div>
        </div>

        <div class="card"><div class="table-container"><table>
          <thead><tr>
            <th>Référence</th>
            <th>Client</th>
            <th>Montant</th>
            <th>Durée</th>
            <th>Mensualité</th>
            <th>Décision</th>
            <th>Validé par</th>
            <th>Statut</th>
            <th>Demandé le</th>
            <th>Traité le</th>
          </tr></thead>
          <tbody>
            @for (c of credits(); track c.id) {
              <tr>
                <td><code class="ref">CR-{{ formatId(c.id) }}</code></td>
                <td><strong>{{ c.clientName }}</strong></td>
                <td class="amount">{{ c.amount | number:'1.3-3' }} TND</td>
                <td>{{ c.durationMonths }} mois</td>
                <td>{{ c.monthlyPayment | number:'1.3-3' }} TND</td>
                <td>
                  @if (c.status === 'PENDING') {
                    <span class="mode-badge mode-pending">⏳ En attente</span>
                  } @else if (c.status === 'REJECTED') {
                    <span class="mode-badge mode-reject" [title]="c.decisionComment || ''">❌ Refusé</span>
                  } @else {
                    <span class="mode-badge mode-approved">✅ Approuvé & versé</span>
                  }
                </td>
                <td>{{ c.reviewedByName || '—' }}</td>
                <td>
                  <span class="badge"
                    [class.badge-warning]="c.status==='PENDING'"
                    [class.badge-success]="c.status==='APPROVED'||c.status==='DISBURSED'"
                    [class.badge-danger]="c.status==='REJECTED'">
                    {{ statusFr(c.status) }}
                  </span>
                </td>
                <td>{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ c.reviewedAt ? (c.reviewedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="10" class="text-center" style="padding:2rem;color:#9ca3af;">Aucun crédit</td></tr> }
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
    .kpi-pending { border-left-color: #f59e0b; }
    .kpi-approved { border-left-color: #10b981; }
    .kpi-rejected { border-left-color: #ef4444; }
    .kpi-volume { border-left-color: #111827; }

    .ref { font-family: monospace; font-size: 0.8rem; background: #f3f4f6; padding: 0.1rem 0.4rem; border-radius: 4px; color: #374151; }

    .mode-badge {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .mode-approved { background: #d1fae5; color: #065f46; }
    .mode-reject { background: #fee2e2; color: #991b1b; cursor: help; }
    .mode-pending { background: #fef3c7; color: #92400e; }
  `]
})
export class AdminCreditsComponent implements OnInit {
  credits = signal<CreditRequest[]>([]);
  filterStatus = '';
  navItems = ADMIN_NAV;
  statusFr = statusFr;

  pendingCount = computed(() => this.credits().filter(c => c.status === 'PENDING').length);
  approvedCount = computed(() => this.credits().filter(c => c.status === 'APPROVED' || c.status === 'DISBURSED').length);
  rejectedCount = computed(() => this.credits().filter(c => c.status === 'REJECTED').length);
  totalVolume = computed(() => this.credits().reduce((sum, c) => sum + (Number(c.amount) || 0), 0));

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }

  formatId(id: number): string {
    return String(id).padStart(6, '0');
  }

  load() {
    this.api.getAdminCredits(0, this.filterStatus || undefined).subscribe({
      next: r => { if (r.data?.content) this.credits.set(r.data.content); },
      error: () => {}
    });
  }
}
