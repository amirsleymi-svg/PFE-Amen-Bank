import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { PasswordResetRequest, PasswordResetStats } from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-password-resets',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1>Suivi des reinitialisations de mot de passe</h1>
          <p class="subtitle">Monitoring des demandes libre-service et des resets termines par les utilisateurs.</p>
        </div>

        @if (msg()) { <div class="alert" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi kpi-total">
            <span class="kpi-label">Total</span>
            <span class="kpi-value">{{ stats()?.total ?? 0 }}</span>
          </div>
          <div class="kpi kpi-pending">
            <span class="kpi-label">En attente</span>
            <span class="kpi-value">{{ stats()?.pending ?? 0 }}</span>
          </div>
          <div class="kpi kpi-approved">
            <span class="kpi-label">Lien envoye</span>
            <span class="kpi-value">{{ stats()?.approved ?? 0 }}</span>
            <span class="kpi-hint">attente de l'utilisateur</span>
          </div>
          <div class="kpi kpi-completed">
            <span class="kpi-label">Termines</span>
            <span class="kpi-value">{{ stats()?.completed ?? 0 }}</span>
            <span class="kpi-hint">mot de passe change</span>
          </div>
          <div class="kpi kpi-rejected">
            <span class="kpi-label">Rejetes</span>
            <span class="kpi-value">{{ stats()?.rejected ?? 0 }}</span>
          </div>
          <div class="kpi kpi-24h">
            <span class="kpi-label">Dernieres 24h</span>
            <span class="kpi-value">{{ stats()?.last24h ?? 0 }}</span>
          </div>
        </div>

        <!-- History card -->
        <div class="card">
          <div class="card-head">
            <div>
              <h3 style="margin:0;">Historique complet</h3>
              <p class="muted">Chaque ligne represente une demande. Le statut evolue automatiquement quand l'utilisateur termine la reinitialisation.</p>
            </div>
            <div class="filters">
              <label>Statut
                <select [(ngModel)]="filter" (ngModelChange)="load()">
                  <option value="ALL">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="APPROVED">Lien envoye</option>
                  <option value="COMPLETED">Termines</option>
                  <option value="REJECTED">Rejetes</option>
                </select>
              </label>
              <button class="btn btn-secondary" (click)="refresh()">Actualiser</button>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Statut</th>
                  <th>Demande</th>
                  <th>Lien envoye</th>
                  <th>Termine</th>
                  <th>Commentaire</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr>
                    <td>{{ r.userName }}</td>
                    <td>{{ r.userEmail }}</td>
                    <td>
                      <span class="source-chip" [class.src-self]="r.source === 'SELF_SERVICE'" [class.src-admin]="r.source === 'ADMIN'">
                        {{ r.source === 'SELF_SERVICE' ? 'Libre-service' : 'Admin' }}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge"
                        [class.st-pending]="r.status === 'PENDING'"
                        [class.st-approved]="r.status === 'APPROVED'"
                        [class.st-completed]="r.status === 'COMPLETED'"
                        [class.st-rejected]="r.status === 'REJECTED'">
                        {{ statusLabel(r.status) }}
                      </span>
                    </td>
                    <td>{{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ (r.reviewedAt | date:'dd/MM/yyyy HH:mm') || '—' }}</td>
                    <td>
                      @if (r.completedAt) {
                        <span class="completed-cell">{{ r.completedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      } @else if (r.status === 'APPROVED') {
                        <span class="muted">en attente…</span>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                    <td class="comment-cell" [title]="r.decisionComment">{{ r.decisionComment || '—' }}</td>
                    <td>
                      @if (r.status === 'PENDING') {
                        <div class="action-group">
                          <button class="btn btn-primary btn-sm" (click)="approve(r.id)">Approuver</button>
                          <button class="btn btn-danger btn-sm" (click)="reject(r.id)">Rejeter</button>
                        </div>
                      } @else if (r.status === 'COMPLETED' || r.status === 'REJECTED') {
                        <button class="btn btn-danger btn-sm" (click)="remove(r)" [disabled]="deleting() === r.id" title="Supprimer de l'historique">
                          {{ deleting() === r.id ? '…' : '🗑 Supprimer' }}
                        </button>
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="9" class="text-center" style="padding:2rem; color:#9ca3af;">Aucune demande pour ce filtre.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .subtitle { color:#6b7280; font-size:0.9rem; margin:0.25rem 0 0; }
    .muted { color:#9ca3af; font-size:0.85rem; }

    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:0.75rem; margin-bottom:1.25rem; }
    .kpi { background:#fff; border:1px solid #e5e7eb; border-left:4px solid #6b7280; border-radius:10px; padding:0.85rem 1rem; display:flex; flex-direction:column; gap:0.15rem; }
    .kpi-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; font-weight:600; }
    .kpi-value { font-size:1.45rem; font-weight:700; color:#111827; }
    .kpi-hint { font-size:0.7rem; color:#9ca3af; }
    .kpi-total { border-left-color:#3b82f6; }
    .kpi-pending { border-left-color:#f59e0b; }
    .kpi-approved { border-left-color:#8b5cf6; }
    .kpi-completed { border-left-color:#10b981; }
    .kpi-rejected { border-left-color:#dc2626; }
    .kpi-24h { border-left-color:#0ea5e9; }

    .card-head { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem; margin-bottom:0.85rem; }
    .filters { display:flex; gap:0.6rem; align-items:flex-end; }
    .filters label { display:flex; flex-direction:column; font-size:0.7rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.03em; }
    .filters select { padding:0.4rem 0.55rem; border:1px solid #d1d5db; border-radius:6px; margin-top:0.15rem; font-size:0.88rem; min-width:140px; }

    .source-chip { display:inline-block; padding:0.15rem 0.55rem; border-radius:6px; font-size:0.7rem; font-weight:600; }
    .source-chip.src-self { background:#e0f2fe; color:#075985; }
    .source-chip.src-admin { background:#fef3c7; color:#92400e; }

    .status-badge { display:inline-block; padding:0.2rem 0.55rem; border-radius:6px; font-size:0.72rem; font-weight:700; letter-spacing:0.02em; }
    .st-pending { background:#fef3c7; color:#92400e; }
    .st-approved { background:#ede9fe; color:#5b21b6; }
    .st-completed { background:#d1fae5; color:#065f46; }
    .st-rejected { background:#fee2e2; color:#991b1b; }

    .completed-cell { color:#059669; font-weight:600; }
    .comment-cell { max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.82rem; color:#4b5563; }
    .action-group { display:flex; gap:0.35rem; }
    .btn-sm { padding:0.3rem 0.6rem; font-size:0.75rem; }
  `]
})
export class AdminPasswordResetsComponent implements OnInit {
  requests = signal<PasswordResetRequest[]>([]);
  stats = signal<PasswordResetStats | null>(null);
  filter: 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' = 'ALL';
  msg = signal('');
  isError = signal(false);
  deleting = signal<number | null>(null);
  navItems = ADMIN_NAV;

  constructor(private api: ApiService) {}

  ngOnInit() { this.refresh(); }

  refresh() { this.load(); this.loadStats(); }

  load() {
    this.api.getPasswordResetRequests(0, this.filter).subscribe({
      next: r => { if (r.data?.content) this.requests.set(r.data.content); },
      error: () => this.requests.set([])
    });
  }

  loadStats() {
    this.api.getPasswordResetStats().subscribe({
      next: r => { if (r.data) this.stats.set(r.data); },
      error: () => {}
    });
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Lien envoye';
      case 'COMPLETED': return 'Termine';
      case 'REJECTED': return 'Rejete';
      default: return s;
    }
  }

  showMsg(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 3500);
  }

  approve(id: number) {
    this.api.approvePasswordReset(id).subscribe({
      next: () => { this.showMsg('Demande approuvee, lien envoye.'); this.refresh(); },
      error: e => this.showMsg(e?.error?.message || 'Erreur lors de l\'approbation.', true)
    });
  }

  reject(id: number) {
    this.api.rejectPasswordReset(id).subscribe({
      next: () => { this.showMsg('Demande rejetee.'); this.refresh(); },
      error: e => this.showMsg(e?.error?.message || 'Erreur lors du rejet.', true)
    });
  }

  remove(r: PasswordResetRequest) {
    if (!confirm(`Supprimer definitivement cette demande de reinitialisation pour ${r.userEmail} ?`)) return;
    this.deleting.set(r.id);
    this.api.deletePasswordResetRequest(r.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.showMsg('Demande supprimee de l\'historique.');
        this.refresh();
      },
      error: e => {
        this.deleting.set(null);
        this.showMsg(e?.error?.message || 'Impossible de supprimer cette demande.', true);
      }
    });
  }
}
