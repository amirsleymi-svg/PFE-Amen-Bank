import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { RegistrationRequest } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-registrations',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Demandes d'inscription</h1></div>
        @if (msg()) { <div class="alert alert-success">{{ msg() }}</div> }
        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>Nom</th><th>Email</th><th>Telephone</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr>
                    <td>{{ r.firstName }} {{ r.lastName }}</td><td>{{ r.email }}</td><td>{{ r.phone }}</td>
                    <td>{{ r.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="flex gap-1">
                      <button class="btn btn-primary btn-sm" (click)="approve(r.id)">Approuver</button>
                      <button class="btn btn-danger btn-sm" (click)="reject(r.id)">Rejeter</button>
                    </td>
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
export class AdminRegistrationsComponent implements OnInit {
  requests = signal<RegistrationRequest[]>([]);
  msg = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getRegistrationRequests().subscribe(r => { if (r.data?.content) this.requests.set(r.data.content); }); }
  approve(id: number) { this.api.approveRegistration(id).subscribe(() => { this.msg.set('Inscription approuvee'); this.load(); }); }
  reject(id: number) { this.api.rejectRegistration(id, 'Refuse').subscribe(() => { this.msg.set('Inscription rejetee'); this.load(); }); }
}
