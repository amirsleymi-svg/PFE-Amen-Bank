import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { EMPLOYEE_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { Transaction } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-employee-transfers',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Validation des Virements</h1>
          <p>Supervisez les transactions nécessitant une approbation manuelle.</p>
        </div>

        @if (msg()) { <div class="alert alert-success animate-in">{{ msg() }}</div> }

        <div class="card premium-card no-padding">
          <div class="table-container premium-table-wrapper">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Référence</th>
                  <th class="outfit">Type</th>
                  <th class="outfit">Montant</th>
                  <th class="outfit">Émetteur</th>
                  <th class="outfit">Date</th>
                  <th class="outfit text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of transfers(); track t.id) {
                  <tr class="animate-in">
                    <td><code class="ref-code outfit">{{ t.reference }}</code></td>
                    <td><span class="badge-type" [class]="'type-' + t.type.toLowerCase()">{{ t.type }}</span></td>
                    <td class="amount outfit">{{ t.amount | number:'1.3-3' }} <small>TND</small></td>
                    <td>
                      <div class="client-info">
                        <div class="avatar-sm outfit">{{ t.initiatedByName[0] }}</div>
                        <span class="client-name">{{ t.initiatedByName }}</span>
                      </div>
                    </td>
                    <td class="color-gray">{{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <div class="flex gap-1 justify-end">
                        <button class="btn btn-primary btn-sm btn-success-hover" (click)="approve(t.id)">Valider</button>
                        <button class="btn btn-ghost btn-sm btn-danger-hover" (click)="reject(t.id)">Rejeter</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <div class="empty-icon">💸</div>
                        <p class="outfit">Aucun virement en attente de validation.</p>
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
    .premium-card { border: 1px solid var(--gray-100); box-shadow: var(--shadow); overflow: hidden; padding: 0 !important; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.75rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }

    .ref-code { background: var(--gray-50); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700; color: var(--primary); border: 1px solid var(--gray-100); }
    
    .badge-type { font-size: 0.65rem; font-weight: 800; padding: 0.25rem 0.5rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .type-simple { background: var(--primary-light); color: white; }
    .type-grouped { background: var(--info); color: white; }
    .type-permanent { background: var(--accent); color: var(--primary); }

    .amount { font-weight: 700; color: var(--primary); }
    .amount small { font-size: 0.7rem; opacity: 0.6; }

    .client-info { display: flex; align-items: center; gap: 0.5rem; }
    .avatar-sm { width: 24px; height: 24px; background: var(--gray-100); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
    .client-name { font-size: 0.85rem; font-weight: 600; color: var(--gray-700); }

    .btn-success-hover:hover { background: var(--success) !important; border-color: var(--success) !important; color: white !important; }
    .btn-danger-hover:hover { background: var(--danger) !important; border-color: var(--danger) !important; color: white !important; }

    .empty-state { padding: 5rem 2rem; text-align: center; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; }
    .empty-state p { color: var(--gray-400); font-weight: 600; }

    .color-gray { color: var(--gray-500); font-size: 0.8rem; }
    .justify-end { justify-content: flex-end; }
  `]
})
export class EmployeeTransfersComponent implements OnInit {
  transfers = signal<Transaction[]>([]);
  msg = signal('');
  navItems = EMPLOYEE_NAV;
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getPendingTransfersEmployee().subscribe({ next: r => { if (r.data?.content) this.transfers.set(r.data.content); }, error: () => {} }); }
  approve(id: number) { this.api.approveTransferEmployee(id).subscribe({ next: () => { this.msg.set('Virement approuve'); this.load(); }, error: () => this.msg.set('Erreur') }); }
  reject(id: number) { this.api.rejectTransferEmployee(id, 'Refuse par employe').subscribe({ next: () => { this.msg.set('Virement rejete'); this.load(); }, error: () => this.msg.set('Erreur') }); }
}
