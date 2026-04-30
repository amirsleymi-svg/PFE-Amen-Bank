import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-transactions',
  imports: [SidebarComponent, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Historique Transactionnel</h1>
          <p class="subtitle outfit">Journal détaillé de vos flux financiers et virements.</p>
        </div>

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Référence</th>
                  <th class="outfit">Type de Flux</th>
                  <th class="outfit">Montant</th>
                  <th class="outfit">État</th>
                  <th class="outfit">Date & Heure</th>
                </tr>
              </thead>
              <tbody>
                @for (t of transactions(); track t.id) {
                  <tr class="animate-in">
                    <td>
                      <code class="ref-code outfit">{{ t.reference }}</code>
                    </td>
                    <td>
                      <div class="type-cell">
                        <span class="type-icon">
                          @if (t.type.includes('TRANSFER')) { 📤 } @else { 💳 }
                        </span>
                        <span class="type-label outfit">{{ t.type }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="amount-cell outfit" [class.negative]="true">
                        {{ t.amount | number:'1.3-3' }} <small>TND</small>
                      </span>
                    </td>
                    <td>
                      <span class="status-indicator-pill" [class]="'st-' + t.status.toLowerCase()">
                        {{ t.status }}
                      </span>
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
                    <td colspan="5">
                      <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p class="outfit">Aucune transaction enregistrée dans votre historique.</p>
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
    .premium-card { border: 1px solid var(--gray-100); box-shadow: var(--shadow); }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }

    .ref-code { font-size: 0.75rem; color: var(--primary-light); font-weight: 600; background: var(--gray-50); padding: 0.2rem 0.5rem; border-radius: 4px; }
    
    .type-cell { display: flex; align-items: center; gap: 0.75rem; }
    .type-icon { font-size: 1.1rem; opacity: 0.8; }
    .type-label { font-size: 0.8rem; font-weight: 700; color: var(--primary); }

    .amount-cell { font-size: 1rem; font-weight: 800; }
    .amount-cell.negative { color: var(--primary); }
    .amount-cell small { font-size: 0.65rem; opacity: 0.6; }

    .status-indicator-pill { font-size: 0.65rem; font-weight: 800; padding: 0.25rem 0.75rem; border-radius: 12px; text-transform: uppercase; }
    .st-executed { background: var(--success-light); color: var(--success); }
    .st-pending { background: var(--warning-light); color: var(--warning); }
    .st-approved { background: var(--info-light); color: var(--info); }
    .st-rejected, .st-failed { background: var(--danger-light); color: var(--danger); }

    .date-cell { display: flex; flex-direction: column; font-size: 0.8rem; font-weight: 600; }
    .date-cell .date { color: var(--primary); }
    .date-cell .time { color: var(--gray-400); font-size: 0.7rem; }

    .empty-state { padding: 5rem 2rem; text-align: center; opacity: 0.3; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  `]
})
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  navItems = CLIENT_NAV;
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getClientTransfers().subscribe({ next: r => { if (r.data?.content) this.transactions.set(r.data.content); }, error: () => {} }); }
}
