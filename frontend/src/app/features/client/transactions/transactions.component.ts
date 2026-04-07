import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-transactions',
  imports: [SidebarComponent, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Historique des transactions</h1></div>
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr>
                <th>Reference</th><th>Type</th><th>Montant</th><th>Statut</th><th>Date</th>
              </tr></thead>
              <tbody>
                @for (t of transactions(); track t.id) {
                  <tr>
                    <td>{{ t.reference }}</td>
                    <td>{{ t.type }}</td>
                    <td class="amount">{{ t.amount | number:'1.3-3' }} TND</td>
                    <td><span class="badge" [class.badge-success]="t.status==='EXECUTED'" [class.badge-warning]="t.status==='PENDING'" [class.badge-danger]="t.status==='REJECTED'||t.status==='FAILED'" [class.badge-info]="t.status==='APPROVED'">{{ t.status }}</span></td>
                    <td>{{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  </tr>
                } @empty { <tr><td colspan="5" class="text-center" style="padding:2rem;">Aucune transaction</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `
})
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getClientTransfers().subscribe(r => { if (r.data?.content) this.transactions.set(r.data.content); }); }
}
