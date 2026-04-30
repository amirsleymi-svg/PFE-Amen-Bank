import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { RegistrationRequest } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-registrations',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1 class="outfit">Inscriptions Clients</h1>
            <p class="subtitle outfit">Validation et audit des nouvelles demandes d'accès à la plateforme.</p>
          </div>
          <div class="stats-mini glass-style outfit">
            <span class="label">EN ATTENTE</span>
            <span class="val">{{ requests().length }}</span>
          </div>
        </div>

        @if (msg()) { <div class="alert alert-success animate-in">{{ msg() }}</div> }

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Candidat</th>
                  <th class="outfit">Coordonnées</th>
                  <th class="outfit">Date de Demande</th>
                  <th class="outfit">État</th>
                  <th class="outfit text-right">Décision</th>
                </tr>
              </thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr class="animate-in">
                    <td>
                      <div class="user-info">
                        <div class="avatar-sm outfit">{{ r.firstName[0] }}{{ r.lastName[0] }}</div>
                        <div class="name-box">
                          <div class="name-full outfit">{{ r.firstName }} {{ r.lastName }}</div>
                          <div class="id-ref outfit">REF: #REG{{ r.id }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="contact-box">
                        <div class="email outfit">{{ r.email }}</div>
                        <div class="phone outfit">{{ r.phone }}</div>
                      </div>
                    </td>
                    <td>
                      <div class="date-box">
                        <div class="date-val outfit">{{ r.createdAt | date:'dd MMM yyyy' }}</div>
                        <div class="time-val outfit">{{ r.createdAt | date:'HH:mm' }}</div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-warning outfit">NOUVEAU</span>
                    </td>
                    <td class="text-right">
                      <div class="action-group">
                        <button class="btn btn-primary btn-sm outfit" (click)="approve(r.id)">APPROUVER</button>
                        <button class="btn btn-ghost btn-danger-text btn-sm outfit" (click)="reject(r.id)">REJETER</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5">
                      <div class="empty-state">
                        <div class="empty-icon">✅</div>
                        <p class="outfit">Toutes les demandes ont été traitées.</p>
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
    .stats-mini { padding: 0.5rem 1rem; border-radius: 10px; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--accent-light); }
    .stats-mini .label { font-size: 0.6rem; font-weight: 800; color: var(--gray-400); }
    .stats-mini .val { font-size: 1.1rem; font-weight: 900; color: var(--primary); }

    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; text-align: left; border-bottom: 2px solid var(--gray-100); }
    .premium-table td { padding: 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }

    .user-info { display: flex; align-items: center; gap: 1rem; }
    .avatar-sm { width: 36px; height: 36px; background: var(--primary); color: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; }
    .name-full { font-size: 0.9rem; font-weight: 700; color: var(--primary); }
    .id-ref { font-size: 0.65rem; color: var(--gray-400); font-weight: 600; }

    .contact-box { font-size: 0.8rem; line-height: 1.4; }
    .contact-box .email { color: var(--primary); font-weight: 600; }
    .contact-box .phone { color: var(--gray-400); font-size: 0.75rem; }

    .date-box { font-size: 0.8rem; }
    .date-val { color: var(--primary); font-weight: 600; }
    .time-val { color: var(--gray-400); font-size: 0.7rem; }

    .action-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .btn-danger-text { color: var(--danger) !important; }

    .empty-state { padding: 5rem 2rem; text-align: center; opacity: 0.5; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  `]
})
export class AdminRegistrationsComponent implements OnInit {
  requests = signal<RegistrationRequest[]>([]);
  msg = signal('');
  navItems = ADMIN_NAV;
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getRegistrationRequests().subscribe({ next: r => { if (r.data?.content) this.requests.set(r.data.content); }, error: () => {} }); }
  approve(id: number) { this.api.approveRegistration(id).subscribe({ next: () => { this.msg.set('Inscription approuvee'); this.load(); }, error: () => this.msg.set('Erreur') }); }
  reject(id: number) { this.api.rejectRegistration(id, 'Refuse').subscribe({ next: () => { this.msg.set('Inscription rejetee'); this.load(); }, error: () => this.msg.set('Erreur') }); }
}
