import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { EMPLOYEE_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { DailyReport } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-employee-reports',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Rapports d'Activité</h1>
          <p class="subtitle outfit">Synthèse opérationnelle et transmission des journaux d'audit.</p>
        </div>

        @if (success()) { <div class="alert alert-success animate-in">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error animate-in">{{ error() }}</div> }

        <!-- Premium Intelligence Card -->
        <div class="card intelligence-card mb-3">
          <div class="card-glow"></div>
          <div class="flex-between align-start relative">
            <div>
              <h3 class="outfit color-white">Génération d'Intelligence Automatisée</h3>
              <p class="size-sm color-gray-400 mt-1">Compile l'intégralité des flux transactionnels, décisions de crédit et mouvements de balance du jour dans un rapport analytique structuré pour l'administration.</p>
            </div>
            <div class="intelligence-badge outfit">Système IA Actif</div>
          </div>
          <div class="flex gap-1 align-end mt-2 relative">
            <div class="form-group mb-0">
              <label class="outfit size-xs color-accent uppercase">Date de référence</label>
              <input type="date" [(ngModel)]="autoDate" name="autoDate" [max]="today" class="premium-input-dark">
            </div>
            <button class="btn btn-accent outfit" (click)="onAutoGenerate()" [disabled]="loading()">
              {{ loading() ? 'Compilation...' : 'GÉNÉRER LE RAPPORT FLASH' }}
            </button>
          </div>
        </div>

        <div class="report-grid">
          <!-- Journal Manuel -->
          <div class="card premium-card">
            <h3 class="outfit mb-1">Journal Manuel</h3>
            <p class="size-xs color-gray-500 mb-2">Consignez des observations spécifiques ou des incidents non-systémiques.</p>
            <form (ngSubmit)="onSubmit()" class="premium-form">
              <div class="form-group">
                <label class="outfit">Titre du rapport</label>
                <input type="text" [(ngModel)]="form.title" name="title" required class="premium-input" placeholder="Ex: Incident réseau agence...">
              </div>
              <div class="form-group mt-1">
                <label class="outfit">Contenu détaillé</label>
                <textarea [(ngModel)]="form.content" name="content" rows="6" required class="premium-textarea" placeholder="Description détaillée..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-block outfit mt-2" [disabled]="loading()">TRANSMETTRE LE JOURNAL</button>
            </form>
          </div>

          <!-- Archives des Rapports -->
          <div class="card premium-card no-padding overflow-hidden">
            <div class="card-header-premium outfit">
              Historique des Transmissions ({{ reports().length }})
            </div>
            <div class="report-list-container">
              @for (r of reports(); track r.id) {
                <div class="report-entry animate-in" [class.reviewed]="r.status==='REVIEWED'">
                  <div class="flex-between mb-1">
                    <span class="report-title outfit">{{ r.title }}</span>
                    <span class="status-pill" [class]="'st-' + r.status.toLowerCase()">{{ statusFr(r.status) }}</span>
                  </div>
                  <div class="report-meta outfit">
                    <span class="date">{{ r.reportDate | date:'dd MMM yyyy' }}</span>
                    @if (r.rating) { <span class="rating">Note : {{ r.rating }}/5</span> }
                    @if (r.reviewedByName) { <span class="reviewer">✓ {{ r.reviewedByName }}</span> }
                  </div>
                  @if (r.reviewComment) {
                    <div class="review-comment-box outfit">
                      <span class="size-xs uppercase opacity-50 block mb-1">Retour administrateur :</span>
                      {{ r.reviewComment }}
                    </div>
                  }
                  <button class="btn-toggle-content" (click)="toggle(r.id)">
                    {{ expanded() === r.id ? 'Masquer' : 'Examiner le contenu' }}
                  </button>
                  @if (expanded() === r.id) {
                    <div class="report-content-view animate-in">
                      <pre>{{ r.content }}</pre>
                    </div>
                  }
                </div>
              } @empty {
                <div class="empty-reports">
                  <div class="empty-icon">📁</div>
                  <p class="outfit">Aucune transmission enregistrée.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .intelligence-card { background: var(--primary); padding: 2.5rem; position: relative; overflow: hidden; border: none; }
    .card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(197,165,114,0.1) 0%, transparent 70%); }
    .intelligence-badge { background: var(--accent); color: var(--primary); padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    
    .premium-input-dark { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem 1rem; border-radius: var(--radius-sm); outline: none; }
    .premium-input-dark:focus { border-color: var(--accent); background: rgba(255,255,255,0.1); }

    .report-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; margin-top: 1.5rem; }
    
    .card-header-premium { background: var(--gray-50); padding: 1.25rem 1.5rem; border-bottom: 2px solid var(--gray-100); font-weight: 800; font-size: 0.85rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; }
    
    .report-list-container { max-height: 700px; overflow-y: auto; }
    .report-entry { padding: 1.5rem; border-bottom: 1px solid var(--gray-50); transition: background 0.05s; }
    .report-entry:hover { background: var(--gray-50); }
    .report-entry.reviewed { border-left: 4px solid var(--success); }
    
    .report-title { font-weight: 700; color: var(--primary); font-size: 1rem; }
    .report-meta { display: flex; gap: 1.5rem; margin-top: 0.5rem; font-size: 0.75rem; color: var(--gray-400); font-weight: 600; }
    
    .status-pill { font-size: 0.6rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 4px; text-transform: uppercase; }
    .st-submitted { background: var(--info-light); color: var(--info); }
    .st-reviewed { background: var(--success-light); color: var(--success); }
    .st-draft { background: var(--gray-100); color: var(--gray-500); }

    .review-comment-box { background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-top: 1rem; font-size: 0.85rem; border-left: 2px solid var(--accent); color: var(--primary); }
    
    .btn-toggle-content { background: none; border: none; color: var(--accent); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; cursor: pointer; margin-top: 1rem; padding: 0; }
    .report-content-view { background: var(--primary); color: white; padding: 1.5rem; border-radius: 8px; margin-top: 1rem; font-family: 'Inter', sans-serif; font-size: 0.85rem; line-height: 1.6; }
    .report-content-view pre { margin: 0; white-space: pre-wrap; word-break: break-word; }

    .empty-reports { padding: 5rem 2rem; text-align: center; opacity: 0.3; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  `]
})
export class EmployeeReportsComponent implements OnInit {
  form = { reportDate: '', title: '', content: '' };
  autoDate = '';
  reports = signal<DailyReport[]>([]);
  loading = signal(false);
  success = signal('');
  error = signal('');
  expanded = signal<number | null>(null);
  navItems = EMPLOYEE_NAV;
  statusFr = statusFr;
  today = new Date().toISOString().slice(0, 10);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.autoDate = this.today;
    this.form.reportDate = this.today;
    this.loadReports();
  }

  loadReports() {
    this.api.getMyReports().subscribe({
      next: r => { if (r.data?.content) this.reports.set(r.data.content); },
      error: () => {}
    });
  }

  onAutoGenerate() {
    if (!this.autoDate) return;
    this.loading.set(true);
    this.api.autoGenerateDailyReport(this.autoDate).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Rapport automatique généré et envoyé.');
        this.loadReports();
        setTimeout(() => this.success.set(''), 4000);
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.message || 'Erreur lors de la génération');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  onSubmit() {
    if (!this.form.title || !this.form.content || !this.form.reportDate) return;
    this.loading.set(true);
    this.api.createDailyReport(this.form).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Rapport manuel soumis.');
        this.form = { reportDate: this.today, title: '', content: '' };
        this.loadReports();
        setTimeout(() => this.success.set(''), 4000);
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.message || 'Erreur lors de la soumission');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  toggle(id: number) {
    this.expanded.set(this.expanded() === id ? null : id);
  }
}
