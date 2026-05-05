import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { DailyReport } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-admin-reports',
  imports: [SidebarComponent, DatePipe, FormsModule],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Supervision des Rapports</h1>
          <p class="subtitle outfit">Validation et notation des synthèses opérationnelles journalières.</p>
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <!-- Premium KPI Grid -->
        <div class="analytics-grid mb-3">
          <div class="stat-card premium-surface">
            <span class="stat-label outfit">Volume Global</span>
            <div class="stat-value outfit">{{ reports().length }}</div>
            <div class="stat-footer outfit">Historique complet</div>
          </div>
          <div class="stat-card warning-surface">
            <span class="stat-label outfit">En attente d'examen</span>
            <div class="stat-value outfit text-warning">{{ submittedCount() }}</div>
            <div class="stat-footer outfit">À valider</div>
          </div>
          <div class="stat-card success-surface">
            <span class="stat-label outfit">Synthèses validées</span>
            <div class="stat-value outfit text-success">{{ reviewedCount() }}</div>
            <div class="stat-footer outfit">Examens terminés</div>
          </div>
          <div class="stat-card accent-gradient">
            <span class="stat-label outfit">Soumis Aujourd'hui</span>
            <div class="stat-value outfit">{{ todayCount() }}</div>
            <div class="stat-footer outfit">Flux récents</div>
          </div>
        </div>

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Émetteur</th>
                  <th class="outfit">Référence</th>
                  <th class="outfit">Statut</th>
                  <th class="outfit">Score</th>
                  <th class="outfit">Superviseur</th>
                  <th class="outfit">Transmission</th>
                  <th class="outfit text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (r of reports(); track r.id) {
                  <tr class="report-row animate-in" [class.is-reviewed]="r.status==='REVIEWED'">
                    <td>
                      <div class="user-cell">
                        <div class="avatar-sm outfit">{{ r.employeeName[0] }}</div>
                        <span class="font-bold color-primary">{{ r.employeeName }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="report-info">
                        <span class="report-title outfit">{{ r.title }}</span>
                        <span class="report-date">{{ r.reportDate | date:'dd MMM yyyy' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [class]="'st-' + r.status.toLowerCase()">{{ statusFr(r.status) }}</span>
                    </td>
                    <td>
                      @if (r.rating) { 
                        <div class="rating-display">
                          @for (star of [1,2,3,4,5]; track star) {
                            <span class="star" [class.filled]="r.rating >= star">★</span>
                          }
                        </div>
                      } @else { <span class="color-gray-400 size-xs">Non noté</span> }
                    </td>
                    <td class="color-gray-600 size-sm">{{ r.reviewedByName || '—' }}</td>
                    <td class="color-gray-400 size-xs">{{ r.createdAt | date:'dd/MM HH:mm' }}</td>
                    <td>
                      <div class="flex gap-1 justify-end">
                        <button class="btn btn-ghost btn-sm outfit font-bold" (click)="selected.set(r)">VOIR</button>
                        @if (r.status !== 'REVIEWED') {
                          <button class="btn btn-accent btn-sm outfit font-bold" (click)="openReview(r)">EXAMINER</button>
                        }
                        <button class="btn btn-ghost btn-danger-text btn-sm" (click)="confirmDelete.set(r)">✕</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7">
                      <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p class="outfit">Aucun rapport disponible pour examen.</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Forensic View Dialog -->
        @if (selected(); as s) {
          <div class="overlay animate-in" (click)="selected.set(null)">
            <div class="dialog dialog-lg premium-surface shadow-2xl" (click)="$event.stopPropagation()">
              <div class="flex-between align-start mb-2">
                <div>
                  <h2 class="outfit color-white mb-0-5">{{ s.title }}</h2>
                  <div class="flex gap-1 align-center">
                    <span class="badge-status outfit" [class]="'st-' + s.status.toLowerCase()">{{ statusFr(s.status) }}</span>
                    <span class="color-gray-400 size-xs outfit">Soumis par {{ s.employeeName }} le {{ s.reportDate | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>
                <button class="btn-close-premium" (click)="selected.set(null)">✕</button>
              </div>

              <div class="dialog-grid mt-2">
                <div class="report-main-content">
                  <div class="content-header outfit size-xs uppercase color-accent font-bold mb-1">Corps du rapport</div>
                  <div class="content-body outfit color-gray-200">{{ s.content }}</div>
                </div>

                <div class="report-side-meta">
                  @if (s.reviewComment) {
                    <div class="review-feedback-box mb-2">
                      <div class="flex-between align-center mb-1">
                        <span class="outfit size-xs uppercase font-bold color-success">Examen finalisé</span>
                        @if (s.rating) { 
                          <div class="rating-compact">⭐ {{ s.rating }}/5</div>
                        }
                      </div>
                      <p class="review-text outfit">{{ s.reviewComment }}</p>
                      <div class="reviewer-tag outfit mt-1">Supervisé par : {{ s.reviewedByName }}</div>
                    </div>
                  } @else {
                    <div class="pending-notice outfit">
                      ⚠️ Ce rapport est en attente d'examen administratif.
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Interactive Review Dialog -->
        @if (reviewing(); as r) {
          <div class="overlay animate-in" (click)="reviewing.set(null)">
            <div class="dialog glass-style-dark" (click)="$event.stopPropagation()">
              <h3 class="outfit color-white mb-1">Examen Qualitatif</h3>
              <p class="color-gray-400 size-sm mb-2">Validation de la synthèse soumise par {{ r.employeeName }}</p>
              
              <div class="form-group mb-2">
                <label class="outfit size-xs uppercase color-gray-400">Commentaire de supervision</label>
                <textarea [(ngModel)]="reviewForm.comment" rows="4" class="premium-textarea" placeholder="Rédigez votre retour détaillé ici..."></textarea>
              </div>

              <div class="form-group mb-3">
                <label class="outfit size-xs uppercase color-gray-400">Évaluation de la performance (1-5)</label>
                <div class="rating-selector mt-1">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button type="button" 
                      class="star-button" 
                      [class.active]="(reviewForm.rating || 0) >= n" 
                      (click)="reviewForm.rating = n">★</button>
                  }
                </div>
              </div>

              <div class="flex gap-1">
                <button class="btn btn-ghost flex-1" (click)="reviewing.set(null)">ANNULER</button>
                <button class="btn btn-primary flex-1" (click)="submitReview()" [disabled]="submitting() || !reviewForm.comment">
                  {{ submitting() ? 'TRAITEMENT...' : 'VALIDER L\\'EXAMEN' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Deletion Shield -->
        @if (confirmDelete(); as r) {
          <div class="overlay animate-in" (click)="confirmDelete.set(null)">
            <div class="dialog glass-style-dark text-center" (click)="$event.stopPropagation()">
              <div class="danger-icon mb-1">🗑️</div>
              <h3 class="outfit color-white">Supprimer le rapport ?</h3>
              <p class="color-gray-400 mb-2">Vous êtes sur le point de supprimer définitivement la synthèse du <strong>{{ r.reportDate | date:'dd/MM/yyyy' }}</strong>.</p>
              <div class="flex gap-1">
                <button class="btn btn-ghost flex-1" (click)="confirmDelete.set(null)">RETOUR</button>
                <button class="btn btn-danger flex-1" (click)="doDelete()" [disabled]="deleting()">
                  {{ deleting() ? 'SUPPRESSION...' : 'CONFIRMER' }}
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .stat-card { padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
    .stat-label { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; }
    .stat-value { font-size: 2.25rem; font-weight: 800; margin: 0.5rem 0; }
    .stat-footer { font-size: 0.65rem; opacity: 0.5; }

    .premium-surface { background: var(--primary); color: white; }
    .warning-surface { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
    .success-surface { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
    .accent-gradient { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); color: white; }

    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .avatar-sm { width: 32px; height: 32px; background: var(--accent); color: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; }
    
    .report-info { display: flex; flex-direction: column; }
    .report-title { font-weight: 700; color: var(--primary); font-size: 0.9rem; }
    .report-date { font-size: 0.75rem; color: var(--gray-400); }

    .status-pill { font-size: 0.65rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 4px; text-transform: uppercase; }
    .st-submitted { background: var(--info-light); color: var(--info); }
    .st-reviewed { background: var(--success-light); color: var(--success); }
    .st-draft { background: var(--gray-100); color: var(--gray-500); }

    .rating-display { color: #fbbf24; font-size: 0.8rem; }
    .star { opacity: 0.2; margin-right: 2px; }
    .star.filled { opacity: 1; }

    .glass-style-dark { background: var(--primary); color: white; border-radius: 20px; padding: 2.5rem; max-width: 500px; border: 1px solid var(--primary-light); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .premium-textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 1rem; border-radius: 12px; resize: none; outline: none; transition: border-color 0.2s; }
    .premium-textarea:focus { border-color: var(--accent); }

    .rating-selector { display: flex; gap: 0.5rem; }
    .star-button { background: none; border: none; font-size: 1.5rem; color: rgba(255,255,255,0.1); cursor: pointer; transition: transform 0.05s, color 0.2s; }
    .star-button.active { color: #fbbf24; }
    .star-button:hover { transform: scale(1.2); }

    .dialog-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; }
    .content-body { background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; min-height: 200px; line-height: 1.6; }
    .review-feedback-box { background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 1.25rem; border-radius: 12px; }
    .reviewer-tag { font-size: 0.7rem; opacity: 0.5; }
  `]
})
export class AdminReportsComponent implements OnInit {
  reports = signal<DailyReport[]>([]);
  selected = signal<DailyReport | null>(null);
  reviewing = signal<DailyReport | null>(null);
  confirmDelete = signal<DailyReport | null>(null);
  reviewForm: { comment: string; rating: number | null } = { comment: '', rating: null };
  submitting = signal(false);
  deleting = signal(false);
  msg = signal('');
  isError = signal(false);
  navItems = ADMIN_NAV;
  statusFr = statusFr;

  submittedCount = computed(() => this.reports().filter(r => r.status === 'SUBMITTED').length);
  reviewedCount = computed(() => this.reports().filter(r => r.status === 'REVIEWED').length);
  todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.reports().filter(r => (r.createdAt || '').slice(0, 10) === today).length;
  });

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getDailyReports().subscribe({
      next: r => { if (r.data?.content) this.reports.set(r.data.content); },
      error: () => {}
    });
  }

  flash(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  openReview(r: DailyReport) {
    this.reviewForm = { comment: '', rating: null };
    this.reviewing.set(r);
  }

  submitReview() {
    const r = this.reviewing();
    if (!r) return;
    this.submitting.set(true);
    this.api.reviewReport(r.id, this.reviewForm.comment || undefined, this.reviewForm.rating ?? undefined).subscribe({
      next: () => {
        this.submitting.set(false);
        this.reviewing.set(null);
        this.flash('Rapport examiné avec succès');
        this.load();
      },
      error: (e) => {
        this.submitting.set(false);
        this.flash(e.error?.message || 'Erreur', true);
      }
    });
  }

  doDelete() {
    const r = this.confirmDelete();
    if (!r) return;
    this.deleting.set(true);
    this.api.deleteDailyReport(r.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDelete.set(null);
        this.flash('Rapport supprimé');
        this.load();
      },
      error: (e) => {
        this.deleting.set(false);
        this.confirmDelete.set(null);
        this.flash(e.error?.message || 'Erreur', true);
      }
    });
  }
}
