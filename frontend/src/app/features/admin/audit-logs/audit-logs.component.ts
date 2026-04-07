import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { AuditLog } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-audit-logs',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div><h1>Journaux d'audit</h1></div>
          @if (logs().length) {
            <button class="btn btn-danger" (click)="showConfirmAll.set(true)">Supprimer tout</button>
          }
        </div>

        @if (msg()) { <div class="alert" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <!-- Confirm delete all dialog -->
        @if (showConfirmAll()) {
          <div class="overlay" (click)="showConfirmAll.set(false)">
            <div class="dialog" (click)="$event.stopPropagation()">
              <h3>Supprimer tous les logs</h3>
              <p>Etes-vous sur de vouloir supprimer <strong>tous les journaux d'audit</strong> ({{ logs().length }} entrees) ?</p>
              <p style="color: var(--danger, #e74c3c); font-size: 0.85rem;">Cette action est irreversible.</p>
              <div class="flex gap-1" style="margin-top: 1rem;">
                <button class="btn btn-secondary" (click)="showConfirmAll.set(false)">Annuler</button>
                <button class="btn btn-danger" (click)="deleteAll()" [disabled]="deleting()">
                  {{ deleting() ? 'Suppression...' : 'Tout supprimer' }}
                </button>
              </div>
            </div>
          </div>
        }

        <div class="card"><div class="table-container"><table>
          <thead><tr><th>Utilisateur</th><th>Action</th><th>Entite</th><th>Details</th><th>IP</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (l of logs(); track l.id) {
              <tr>
                <td>{{ l.userName }}</td>
                <td><span class="badge badge-neutral">{{ l.action }}</span></td>
                <td>{{ l.entityType }}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ l.details }}</td>
                <td>{{ l.ipAddress }}</td>
                <td>{{ l.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <button class="btn btn-danger btn-sm" (click)="deleteLog(l.id)">Supprimer</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center" style="padding:2rem;">Aucun log</td></tr>
            }
          </tbody>
        </table></div></div>
      </main>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog {
      background: #fff; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .dialog h3 { margin: 0 0 0.75rem; }
    .dialog p { margin: 0 0 0.5rem; }
    .btn-danger { background: var(--danger, #e74c3c); color: #fff; border: none; }
    .btn-danger:hover:not(:disabled) { opacity: 0.9; }
  `]
})
export class AuditLogsComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  msg = signal('');
  isError = signal(false);
  showConfirmAll = signal(false);
  deleting = signal(false);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getAuditLogs().subscribe(r => {
      if (r.data?.content) this.logs.set(r.data.content);
    });
  }

  showMsg(text: string, error = false) {
    this.msg.set(text);
    this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  deleteLog(id: number) {
    this.api.deleteAuditLog(id).subscribe({
      next: () => { this.showMsg('Log supprime'); this.load(); },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  deleteAll() {
    this.deleting.set(true);
    this.api.deleteAllAuditLogs().subscribe({
      next: () => {
        this.deleting.set(false);
        this.showConfirmAll.set(false);
        this.showMsg('Tous les logs ont ete supprimes');
        this.load();
      },
      error: (e) => {
        this.deleting.set(false);
        this.showConfirmAll.set(false);
        this.showMsg(e.error?.message || 'Erreur', true);
      }
    });
  }
}
