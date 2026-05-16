import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { statusFr, transactionTypeFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-transactions',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Transactions</h1>
          <p class="subtitle outfit">Journal détaillé de vos virements, crédits, dépôts et recharges carte.</p>
        </div>

        <div class="filters-panel">
          <div class="search-box">
            <input class="premium-input outfit" type="text" placeholder="Rechercher référence, IBAN, description..."
              [ngModel]="search()" (ngModelChange)="search.set($event)" />
          </div>
          <select class="premium-select outfit" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
            <option value="">Tous les types</option>
            @for (type of availableTypes(); track type) {
              <option [value]="type">{{ transactionTypeFr(type) }}</option>
            }
          </select>
          <select class="premium-select outfit" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Tous les états</option>
            @for (status of availableStatuses(); track status) {
              <option [value]="status">{{ statusFr(status) }}</option>
            }
          </select>
          <input class="premium-input date-input outfit" type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" />
          <input class="premium-input date-input outfit" type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" />
          <input class="premium-input amount-input outfit" type="number" min="0" step="0.001" placeholder="Min"
            [ngModel]="minAmount()" (ngModelChange)="minAmount.set($event === '' ? null : +$event)" />
          <input class="premium-input amount-input outfit" type="number" min="0" step="0.001" placeholder="Max"
            [ngModel]="maxAmount()" (ngModelChange)="maxAmount.set($event === '' ? null : +$event)" />
          <button class="btn btn-ghost btn-sm outfit" (click)="clearFilters()" [disabled]="!hasFilters()">Réinitialiser</button>
        </div>

        <div class="filter-summary outfit">
          {{ filteredTransactions().length }} transaction{{ filteredTransactions().length > 1 ? 's' : '' }} affichée{{ filteredTransactions().length > 1 ? 's' : '' }}
          <span>sur {{ transactions().length }}</span>
        </div>

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Référence</th>
                  <th class="outfit">Type</th>
                  <th class="outfit">Montant</th>
                  <th class="outfit">État</th>
                  <th class="outfit">Compte</th>
                  <th class="outfit">Date & Heure</th>
                </tr>
              </thead>
              <tbody>
                @for (t of filteredTransactions(); track t.id) {
                  <tr class="animate-in">
                    <td>
                      <code class="ref-code outfit">{{ t.reference }}</code>
                    </td>
                    <td>
                      <div class="type-cell">
                        <span class="type-icon">{{ typeIcon(t.type) }}</span>
                        <span class="type-label outfit">{{ transactionTypeFr(t.type) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="amount-cell outfit" [class.positive]="isIncoming(t)" [class.negative]="!isIncoming(t)">
                        {{ isIncoming(t) ? '+' : '-' }}{{ t.amount | number:'1.3-3' }} <small>TND</small>
                      </span>
                    </td>
                    <td>
                      <span class="status-indicator-pill" [class]="'st-' + t.status.toLowerCase()">
                        {{ statusFr(t.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="account-cell outfit">
                        <span>{{ compactAccount(t.destinationAccountIban || t.destinationExternalIban || t.sourceAccountIban) }}</span>
                        @if (t.description) { <small>{{ t.description }}</small> }
                      </div>
                    </td>
                    <td>
                      <div class="date-cell">
                        <span class="date">{{ t.createdAt | date:'dd MMM yyyy' }}</span>
                        <span class="time">{{ t.createdAt | date:'HH:mm' }}</span>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p class="outfit">Aucune transaction ne correspond aux critères sélectionnés.</p>
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
    .filters-panel {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(150px, 180px)) repeat(2, 145px) repeat(2, 105px) auto;
      gap: 0.75rem;
      align-items: center;
      background: white;
      border: 1px solid var(--gray-100);
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 0.75rem;
      box-shadow: var(--shadow-sm);
    }
    .premium-input, .premium-select {
      width: 100%;
      border: 1px solid var(--gray-100);
      border-radius: 10px;
      background: var(--gray-50);
      padding: 0.65rem 0.8rem;
      color: var(--primary);
      font-size: 0.82rem;
      font-weight: 600;
    }
    .premium-select { background: white; }
    .amount-input { min-width: 92px; }
    .filter-summary { margin: 0 0 1rem; color: var(--gray-500); font-size: 0.8rem; font-weight: 700; }
    .filter-summary span { color: var(--gray-400); font-weight: 600; }

    .premium-card { border: 1px solid var(--gray-100); box-shadow: var(--shadow); }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.15rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1.1rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }

    .ref-code { font-size: 0.75rem; color: var(--primary-light); font-weight: 600; background: var(--gray-50); padding: 0.2rem 0.5rem; border-radius: 4px; }
    .type-cell { display: flex; align-items: center; gap: 0.75rem; }
    .type-icon { font-size: 1.1rem; opacity: 0.85; }
    .type-label { font-size: 0.8rem; font-weight: 700; color: var(--primary); }

    .amount-cell { font-size: 1rem; font-weight: 800; white-space: nowrap; }
    .amount-cell.positive { color: var(--success); }
    .amount-cell.negative { color: var(--primary); }
    .amount-cell small { font-size: 0.65rem; opacity: 0.6; }

    .status-indicator-pill { font-size: 0.65rem; font-weight: 800; padding: 0.25rem 0.75rem; border-radius: 12px; text-transform: uppercase; white-space: nowrap; }
    .st-executed { background: var(--success-light); color: var(--success); }
    .st-pending { background: var(--warning-light); color: var(--warning); }
    .st-approved { background: var(--info-light); color: var(--info); }
    .st-rejected, .st-failed, .st-cancelled { background: var(--danger-light); color: var(--danger); }

    .account-cell { display: flex; flex-direction: column; gap: 0.2rem; min-width: 170px; }
    .account-cell span { color: var(--primary); font-size: 0.78rem; font-weight: 700; }
    .account-cell small { color: var(--gray-400); font-size: 0.72rem; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .date-cell { display: flex; flex-direction: column; font-size: 0.8rem; font-weight: 600; }
    .date-cell .date { color: var(--primary); }
    .date-cell .time { color: var(--gray-400); font-size: 0.7rem; }

    .empty-state { padding: 5rem 2rem; text-align: center; opacity: 0.45; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

    @media (max-width: 1200px) {
      .filters-panel { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
      .filters-panel { grid-template-columns: 1fr; }
    }
  `]
})
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  search = signal('');
  typeFilter = signal('');
  statusFilter = signal('');
  dateFrom = signal('');
  dateTo = signal('');
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);

  navItems = CLIENT_NAV;
  statusFr = statusFr;
  transactionTypeFr = transactionTypeFr;

  availableTypes = computed(() => Array.from(new Set(this.transactions().map(t => t.type).filter(Boolean))).sort());
  availableStatuses = computed(() => Array.from(new Set(this.transactions().map(t => t.status).filter(Boolean))).sort());

  filteredTransactions = computed(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const min = this.minAmount();
    const max = this.maxAmount();

    return this.transactions().filter(t => {
      if (type && t.type !== type) return false;
      if (status && t.status !== status) return false;
      const day = (t.createdAt || '').slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (min !== null && Number(t.amount) < min) return false;
      if (max !== null && Number(t.amount) > max) return false;
      if (q) {
        const haystack = [
          t.reference,
          t.type,
          t.status,
          t.sourceAccountIban,
          t.destinationAccountIban,
          t.destinationExternalIban,
          t.description,
          t.initiatedByName,
          t.approvedByName,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getClientTransfers().subscribe({
      next: r => { if (r.data?.content) this.transactions.set(r.data.content); },
      error: () => {}
    });
  }

  hasFilters(): boolean {
    return !!(this.search() || this.typeFilter() || this.statusFilter() || this.dateFrom() || this.dateTo() || this.minAmount() !== null || this.maxAmount() !== null);
  }

  clearFilters() {
    this.search.set('');
    this.typeFilter.set('');
    this.statusFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.minAmount.set(null);
    this.maxAmount.set(null);
  }

  isIncoming(t: Transaction): boolean {
    return t.type === 'CREDIT_DISBURSEMENT' || (!!t.destinationAccountIban && !t.sourceAccountIban);
  }

  typeIcon(type: string): string {
    if ((type || '').includes('CREDIT')) return '💰';
    if ((type || '').includes('CARD')) return '💳';
    return '📤';
  }

  compactAccount(value: string | null | undefined): string {
    if (!value) return '-';
    return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }
}
