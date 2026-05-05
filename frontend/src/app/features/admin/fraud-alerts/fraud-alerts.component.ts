import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { FraudAlert } from '../../../core/models/api.models';
import { DatePipe, DecimalPipe } from '@angular/common';
import { fraudAlertTypeFr, severityFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-fraud-alerts',
  imports: [SidebarComponent, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1 class="outfit">Surveillance Anti-Fraude</h1>
            <p class="subtitle outfit">Analyse en temps réel et détection des anomalies transactionnelles.</p>
          </div>
          <div class="select-wrapper">
            <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="premium-select outfit">
              <option value="">Tous les statuts</option>
              <option value="OPEN">Ouvertes</option>
              <option value="INVESTIGATING">En investigation</option>
              <option value="RESOLVED">Résolues</option>
              <option value="DISMISSED">Rejetées</option>
            </select>
          </div>
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        @if (selectedAlert()) {
          <div class="overlay animate-in" (click)="selectedAlert.set(null)">
            <div class="dialog glass-style-dark" (click)="$event.stopPropagation()">
              <h3 class="outfit color-white">Gestion de l'alerte #{{ selectedAlert()!.id }}</h3>
              <div class="alert-summary mb-2">
                <div class="summary-line"><span class="k">Transaction :</span> <span class="v">{{ selectedAlert()!.transactionReference }}</span></div>
                <div class="summary-line"><span class="k">Montant :</span> <span class="v accent-text">{{ selectedAlert()!.transactionAmount | number:'1.3-3' }} TND</span></div>
                <div class="summary-line"><span class="k">Type :</span> <span class="v">{{ fraudAlertTypeFr(selectedAlert()!.alertType) }}</span></div>
              </div>

              <div class="form-group mb-2">
                <label class="outfit size-xs uppercase color-gray-400">Nouveau statut</label>
                <select [(ngModel)]="newStatus" class="premium-select-dark">
                  <option value="OPEN">Ouverte</option>
                  <option value="INVESTIGATING">En investigation</option>
                  <option value="RESOLVED">Résolue</option>
                  <option value="DISMISSED">Rejetée</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label class="outfit size-xs uppercase color-gray-400">Commentaire d'audit</label>
                <textarea [(ngModel)]="reviewComment" rows="3" class="premium-textarea" placeholder="Détails de l'investigation..."></textarea>
              </div>

              <div class="flex-column gap-1">
                <div class="flex gap-1">
                  <button class="btn btn-ghost flex-1" (click)="selectedAlert.set(null)" [disabled]="busy()">Annuler</button>
                  <button class="btn btn-primary flex-1" (click)="onUpdateStatus()" [disabled]="busy()">Mettre à jour</button>
                </div>
                
                @if (selectedAlert()!.status === 'OPEN' || selectedAlert()!.status === 'INVESTIGATING') {
                  <button class="btn btn-danger btn-block mt-1" (click)="askFreezeConfirm()" [disabled]="busy()">
                    ⚠️ CONFIRMER LA FRAUDE ET GELER LE CLIENT
                  </button>
                }
              </div>

              @if (freezeConfirmOpen()) {
                <div class="freeze-warning animate-in mt-2">
                  <h4 class="outfit mb-1">Action irréversible</h4>
                  <p class="size-xs color-warning mb-2">Le gel du client entraînera la suspension immédiate de tous ses accès, comptes et moyens de paiement.</p>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-sm" (click)="freezeConfirmOpen.set(false)" [disabled]="busy()">Annuler</button>
                    <button class="btn btn-danger btn-sm" (click)="onConfirmFreeze()" [disabled]="busy()">
                      {{ busy() ? 'Exécution...' : 'Confirmer le gel complet' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="card premium-card no-padding">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Réf. transaction</th>
                  <th class="outfit">Montant</th>
                  <th class="outfit">Type Alerte</th>
                  <th class="outfit">Sévérité</th>
                  <th class="outfit">Statut</th>
                  <th class="outfit">Date</th>
                  <th class="outfit text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (a of alerts(); track a.id) {
                  <tr class="animate-in">
                    <td class="font-bold color-primary">{{ a.transactionReference || '-' }}</td>
                    <td class="outfit">{{ a.transactionAmount | number:'1.3-3' }} <small>TND</small></td>
                    <td class="size-sm font-bold color-gray-600">{{ fraudAlertTypeFr(a.alertType) }}</td>
                    <td>
                      <span class="badge-severity" [class]="'sev-' + a.severity.toLowerCase()">{{ severityFr(a.severity) }}</span>
                    </td>
                    <td>
                      <span class="status-indicator-pill" [class]="'st-' + a.status.toLowerCase()">{{ statusLabel(a.status) }}</span>
                    </td>
                    <td class="color-gray size-xs">{{ a.detectedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <div class="flex justify-end">
                        <button class="btn btn-ghost btn-sm outfit font-bold" (click)="openManage(a)">GÉRER</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7">
                      <div class="empty-state">
                        <div class="empty-icon">🛡️</div>
                        <p class="outfit">Aucune alerte de fraude détectée.</p>
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
    .premium-card { border: 1px solid var(--gray-100); box-shadow: var(--shadow); overflow: hidden; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }

    .badge-severity { font-size: 0.6rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .sev-low { background: var(--info-light); color: var(--info); }
    .sev-medium { background: var(--warning-light); color: var(--warning); }
    .sev-high, .sev-critical { background: var(--danger); color: white; box-shadow: 0 0 10px rgba(231, 76, 60, 0.4); }

    .status-indicator-pill { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.4rem; }
    .st-open { background: var(--danger-light); color: var(--danger); }
    .st-investigating { background: var(--warning-light); color: var(--warning); }
    .st-resolved { background: var(--success-light); color: var(--success); }
    .st-dismissed { background: var(--gray-100); color: var(--gray-500); }

    .glass-style-dark { background: var(--primary); color: white; border-radius: var(--radius-lg); padding: 2.5rem; max-width: 550px; border: 1px solid var(--primary-light); }
    .alert-summary { background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.1); }
    .summary-line { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .summary-line:last-child { margin-bottom: 0; }
    .summary-line .k { opacity: 0.6; }
    .summary-line .v { font-weight: 700; }

    .premium-select-dark { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.75rem; border-radius: var(--radius); outline: none; }
    .premium-textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: var(--radius); resize: none; }

    .freeze-warning { background: rgba(231, 76, 60, 0.15); border: 1px solid var(--danger); padding: 1.25rem; border-radius: var(--radius); }
    .color-warning { color: var(--warning); }
    .empty-state { padding: 5rem 2rem; text-align: center; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.2; }
  `]
})
export class FraudAlertsComponent implements OnInit {
  alerts = signal<FraudAlert[]>([]);
  msg = signal('');
  isError = signal(false);
  filterStatus = '';
  selectedAlert = signal<FraudAlert | null>(null);
  newStatus = '';
  reviewComment = '';
  busy = signal(false);
  freezeConfirmOpen = signal(false);

  constructor(private api: ApiService) {}
  navItems = ADMIN_NAV;
  fraudAlertTypeFr = fraudAlertTypeFr;
  severityFr = severityFr;

  ngOnInit() { this.load(); }

  load() {
    this.api.getFraudAlerts(0, this.filterStatus || undefined).subscribe({ next: r => {
      if (r.data?.content) this.alerts.set(r.data.content);
    }, error: () => {} });
  }

  statusLabel(s: string): string {
    switch (s) { case 'OPEN': return 'Ouverte'; case 'INVESTIGATING': return 'Investigation'; case 'RESOLVED': return 'Résolue'; case 'DISMISSED': return 'Rejetée'; default: return s; }
  }

  showMsg(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  openManage(alert: FraudAlert) {
    this.selectedAlert.set(alert);
    this.newStatus = alert.status;
    this.reviewComment = '';
    this.freezeConfirmOpen.set(false);
  }

  askFreezeConfirm() {
    this.freezeConfirmOpen.set(true);
  }

  onConfirmFreeze() {
    const alert = this.selectedAlert();
    if (!alert) return;
    this.busy.set(true);
    this.api.confirmFraudAndFreeze(alert.id, this.reviewComment).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.freezeConfirmOpen.set(false);
        this.selectedAlert.set(null);
        const d = r.data;
        const detail = d
          ? ` : ${d.accountsDisabled} comptes, ${d.cardsDisabled} cartes, ${d.transactionsCancelled} transactions annulées`
          : '';
        this.showMsg('Client gelé' + detail);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.showMsg(e.error?.message || 'Erreur lors du gel du client', true);
      }
    });
  }

  onUpdateStatus() {
    const alert = this.selectedAlert();
    if (!alert) return;
    this.api.updateFraudAlertStatus(alert.id, this.newStatus, this.reviewComment).subscribe({
      next: () => { this.selectedAlert.set(null); this.showMsg('Statut mis à jour'); this.load(); },
      error: (e) => { this.selectedAlert.set(null); this.showMsg(e.error?.message || 'Erreur', true); }
    });
  }
}
