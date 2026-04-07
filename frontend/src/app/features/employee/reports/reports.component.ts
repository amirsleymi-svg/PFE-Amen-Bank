import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { DailyReport } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-employee-reports',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Rapports journaliers</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
          <div class="card" style="flex:1; min-width:300px;">
            <h3 class="mb-2">Nouveau rapport</h3>
            <form (ngSubmit)="onSubmit()">
              <div class="form-group"><label>Date</label><input type="date" [(ngModel)]="form.reportDate" name="date" required></div>
              <div class="form-group"><label>Titre</label><input type="text" [(ngModel)]="form.title" name="title" required></div>
              <div class="form-group"><label>Contenu</label><textarea [(ngModel)]="form.content" name="content" rows="5" required></textarea></div>
              <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Soumettre</button>
            </form>
          </div>
          <div class="card" style="flex:1; min-width:300px;">
            <h3 class="mb-2">Mes rapports</h3>
            @for (r of reports(); track r.id) {
              <div style="padding:0.75rem 0; border-bottom:1px solid var(--gray-200);">
                <div class="flex-between"><strong>{{ r.title }}</strong><span class="badge badge-info">{{ r.status }}</span></div>
                <div style="font-size:0.8125rem; color:var(--gray-500);">{{ r.reportDate | date:'dd/MM/yyyy' }}</div>
              </div>
            } @empty { <p style="color:var(--gray-400);">Aucun rapport</p> }
          </div>
        </div>
      </main>
    </div>
  `
})
export class EmployeeReportsComponent implements OnInit {
  form = { reportDate: '', title: '', content: '' };
  reports = signal<DailyReport[]>([]);
  loading = signal(false); success = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.loadReports(); }
  loadReports() { this.api.getMyReports().subscribe(r => { if (r.data?.content) this.reports.set(r.data.content); }); }
  onSubmit() {
    this.loading.set(true);
    this.api.createDailyReport(this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set('Rapport soumis.'); this.loadReports(); this.form = { reportDate: '', title: '', content: '' }; },
      error: () => this.loading.set(false)
    });
  }
}
