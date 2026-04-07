import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-employee-transfers',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Virements en attente</h1></div>
        @if (msg()) { <div class="alert alert-success">{{ msg() }}</div> }
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>Reference</th><th>Type</th><th>Montant</th><th>Client</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (t of transfers(); track t.id) {
                  <tr>
                    <td>{{ t.reference }}</td><td>{{ t.type }}</td>
                    <td class="amount">{{ t.amount | number:'1.3-3' }} TND</td>
                    <td>{{ t.initiatedByName }}</td>
                    <td>{{ t.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="flex gap-1">
                      <button class="btn btn-primary btn-sm" (click)="approve(t.id)">Approuver</button>
                      <button class="btn btn-danger btn-sm" (click)="reject(t.id)">Rejeter</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="6" class="text-center" style="padding:2rem;">Aucun virement en attente</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `
})
export class EmployeeTransfersComponent implements OnInit {
  transfers = signal<Transaction[]>([]);
  msg = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getPendingTransfersEmployee().subscribe(r => { if (r.data?.content) this.transfers.set(r.data.content); }); }
  approve(id: number) { this.api.approveTransferEmployee(id).subscribe(() => { this.msg.set('Virement approuve'); this.load(); }); }
  reject(id: number) { this.api.rejectTransferEmployee(id, 'Refuse par employe').subscribe(() => { this.msg.set('Virement rejete'); this.load(); }); }
}
