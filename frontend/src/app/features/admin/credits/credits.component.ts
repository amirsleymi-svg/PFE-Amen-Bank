import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { CreditRequest } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-credits',
  imports: [SidebarComponent, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Credits en attente (Admin)</h1></div>
        @if (msg()) { <div class="alert alert-success">{{ msg() }}</div> }
        <div class="card"><div class="table-container"><table>
          <thead><tr><th>Client</th><th>Montant</th><th>Duree</th><th>Mensualite</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (c of credits(); track c.id) {
              <tr><td>{{ c.clientName }}</td><td class="amount">{{ c.amount | number:'1.3-3' }} TND</td><td>{{ c.durationMonths }} mois</td><td>{{ c.monthlyPayment | number:'1.3-3' }} TND</td><td>{{ c.createdAt | date:'dd/MM/yyyy' }}</td>
              <td class="flex gap-1"><button class="btn btn-primary btn-sm" (click)="approve(c.id)">Approuver</button><button class="btn btn-danger btn-sm" (click)="reject(c.id)">Rejeter</button></td></tr>
            } @empty { <tr><td colspan="6" class="text-center" style="padding:2rem;">Aucun credit</td></tr> }
          </tbody>
        </table></div></div>
      </main>
    </div>
  `
})
export class AdminCreditsComponent implements OnInit {
  credits = signal<CreditRequest[]>([]);
  msg = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getPendingCreditsAdmin().subscribe(r => { if (r.data?.content) this.credits.set(r.data.content); }); }
  approve(id: number) { this.api.approveCreditAdmin(id).subscribe(() => { this.msg.set('Approuve'); this.load(); }); }
  reject(id: number) { this.api.rejectCreditAdmin(id, 'Refuse').subscribe(() => { this.msg.set('Rejete'); this.load(); }); }
}
