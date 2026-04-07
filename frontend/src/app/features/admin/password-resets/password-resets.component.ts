import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { PasswordResetRequest } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-password-resets',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Demandes de reinitialisation</h1></div>
        @if (msg()) { <div class="alert alert-success">{{ msg() }}</div> }
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>Utilisateur</th><th>Email</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr>
                    <td>{{ r.userName }}</td><td>{{ r.userEmail }}</td>
                    <td>{{ r.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="flex gap-1">
                      <button class="btn btn-primary btn-sm" (click)="approve(r.id)">Approuver</button>
                      <button class="btn btn-danger btn-sm" (click)="reject(r.id)">Rejeter</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="4" class="text-center" style="padding:2rem;">Aucune demande</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `
})
export class AdminPasswordResetsComponent implements OnInit {
  requests = signal<PasswordResetRequest[]>([]);
  msg = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getPasswordResetRequests().subscribe(r => { if (r.data?.content) this.requests.set(r.data.content); }); }
  approve(id: number) { this.api.approvePasswordReset(id).subscribe(() => { this.msg.set('Reset approuve'); this.load(); }); }
  reject(id: number) { this.api.rejectPasswordReset(id).subscribe(() => { this.msg.set('Reset rejete'); this.load(); }); }
}
