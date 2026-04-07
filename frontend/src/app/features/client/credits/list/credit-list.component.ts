import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../../core/services/api.service';
import { CreditRequest } from '../../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-credit-list',
  imports: [SidebarComponent, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Mes demandes de credit</h1></div>
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>Montant</th><th>Duree</th><th>Mensualite</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                @for (c of credits(); track c.id) {
                  <tr>
                    <td class="amount">{{ c.amount | number:'1.3-3' }} TND</td>
                    <td>{{ c.durationMonths }} mois</td>
                    <td>{{ c.monthlyPayment | number:'1.3-3' }} TND</td>
                    <td><span class="badge" [class.badge-success]="c.status==='APPROVED'" [class.badge-warning]="c.status==='PENDING'" [class.badge-danger]="c.status==='REJECTED'">{{ c.status }}</span></td>
                    <td>{{ c.createdAt | date:'dd/MM/yyyy' }}</td>
                  </tr>
                } @empty { <tr><td colspan="5" class="text-center" style="padding:2rem;">Aucune demande</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `
})
export class CreditListComponent implements OnInit {
  credits = signal<CreditRequest[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getClientCredits().subscribe(r => { if (r.data?.content) this.credits.set(r.data.content); }); }
}
