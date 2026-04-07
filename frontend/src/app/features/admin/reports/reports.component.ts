import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { DailyReport } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-reports',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Rapports journaliers</h1></div>
        <div class="card"><div class="table-container"><table>
          <thead><tr><th>Employe</th><th>Date</th><th>Titre</th><th>Statut</th></tr></thead>
          <tbody>
            @for (r of reports(); track r.id) {
              <tr><td>{{ r.employeeName }}</td><td>{{ r.reportDate | date:'dd/MM/yyyy' }}</td><td>{{ r.title }}</td><td><span class="badge badge-info">{{ r.status }}</span></td></tr>
            } @empty { <tr><td colspan="4" class="text-center" style="padding:2rem;">Aucun rapport</td></tr> }
          </tbody>
        </table></div></div>
      </main>
    </div>
  `
})
export class AdminReportsComponent implements OnInit {
  reports = signal<DailyReport[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getDailyReports().subscribe(r => { if (r.data?.content) this.reports.set(r.data.content); }); }
}
