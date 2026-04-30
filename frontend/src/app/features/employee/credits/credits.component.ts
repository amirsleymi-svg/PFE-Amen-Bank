import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { EMPLOYEE_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { CreditRequest } from '../../../core/models/api.models';
import { DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-employee-credits',
  imports: [SidebarComponent, DecimalPipe, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Décisions de Crédit</h1>
          <p>Examinez et validez les demandes de financement en attente.</p>
        </div>

        @if (msg()) { <div class="alert alert-success animate-in">{{ msg() }}</div> }

        <div class="card premium-card no-padding">
          <div class="table-container premium-table-wrapper">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Client</th>
                  <th class="outfit">Montant</th>
                  <th class="outfit">Durée</th>
                  <th class="outfit">Mensualité</th>
                  <th class="outfit">Date de demande</th>
                  <th class="outfit text-right">Actions de décision</th>
                </tr>
              </thead>
              <tbody>
                @for (c of credits(); track c.id) {
                  <tr class="animate-in">
                    <td>
                      <div class="client-info">
                        <div class="avatar outfit">{{ c.clientName[0] }}</div>
                        <span class="client-name">{{ c.clientName }}</span>
                      </div>
                    </td>
                    <td class="amount outfit">{{ c.amount | number:'1.3-3' }} <small>TND</small></td>
                    <td><span class="badge-neutral">{{ c.durationMonths }} mois</span></td>
                    <td class="outfit font-bold color-primary">{{ c.monthlyPayment | number:'1.3-3' }} <small>TND</small></td>
                    <td class="color-gray">{{ c.createdAt | date:'dd MMM yyyy' }}</td>
                    <td>
                      <div class="flex gap-1 justify-end">
                        <button class="btn btn-primary btn-sm btn-success-hover" (click)="approve(c.id)">✓ Approuver</button>
                        <button class="btn btn-ghost btn-sm btn-danger-hover" (click)="reject(c.id)">✕ Rejeter</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <div class="empty-icon">📂</div>
                        <p class="outfit">Aucun dossier en attente de décision.</p>
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
    .premium-table-wrapper { width: 100%; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.75rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }
    
    .client-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 32px; height: 32px; background: var(--primary-light); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; }
    .client-name { font-weight: 600; color: var(--primary); }

    .amount { font-weight: 700; color: var(--primary); }
    .amount small { font-size: 0.7rem; opacity: 0.6; }

    .badge-neutral { background: var(--gray-100); color: var(--gray-600); padding: 0.25rem 0.6rem; border-radius: 5px; font-size: 0.75rem; font-weight: 600; }
    
    .btn-success-hover:hover { background: var(--success) !important; border-color: var(--success) !important; color: white !important; }
    .btn-danger-hover:hover { background: var(--danger) !important; border-color: var(--danger) !important; color: white !important; }

    .empty-state { padding: 5rem 2rem; text-align: center; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; }
    .empty-state p { color: var(--gray-400); font-weight: 600; }

    .color-gray { color: var(--gray-500); font-size: 0.85rem; }
    .color-primary { color: var(--primary); }
    .font-bold { font-weight: 700; }
    .justify-end { justify-content: flex-end; }
  `]
})
export class EmployeeCreditsComponent implements OnInit {
  credits = signal<CreditRequest[]>([]);
  msg = signal('');
  navItems = EMPLOYEE_NAV;
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getPendingCreditsEmployee().subscribe({ next: r => { if (r.data?.content) this.credits.set(r.data.content); }, error: () => {} }); }
  approve(id: number) { this.api.approveCreditEmployee(id).subscribe({ next: () => { this.msg.set('Credit approuve'); this.load(); }, error: () => this.msg.set('Erreur') }); }
  reject(id: number) { this.api.rejectCreditEmployee(id, 'Refuse').subscribe({ next: () => { this.msg.set('Credit rejete'); this.load(); }, error: () => this.msg.set('Erreur') }); }
}
