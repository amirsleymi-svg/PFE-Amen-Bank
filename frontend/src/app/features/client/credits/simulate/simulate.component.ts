import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../../shared/nav-items';
import { ApiService } from '../../../../core/services/api.service';
import { CreditSimulation } from '../../../../core/models/api.models';
import { DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-simulate',
  imports: [SidebarComponent, FormsModule, DecimalPipe, DatePipe, UpperCasePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Simulation de crédit premium</h1>
          <p class="subtitle">Optimisez votre financement avec notre simulateur haute précision.</p>
        </div>

        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <div class="sim-grid">
          <!-- Interactive form card -->
          <div class="card premium-card sim-form">
            <div class="card-header outfit">
              <h3>Paramètres du prêt</h3>
            </div>

            <div class="form-group">
              <label class="outfit">Montant du financement <span class="muted">(TND)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="amount" name="amount" min="1000" step="500" (ngModelChange)="liveSimulate()" class="premium-input outfit">
                <input type="range" min="1000" max="500000" step="500" [(ngModel)]="amount" (ngModelChange)="liveSimulate()" class="premium-range">
              </div>
              <div class="range-hint outfit"><span>1 000</span><span>500 000</span></div>
            </div>

            <div class="form-group">
              <label class="outfit">Durée du crédit <span class="muted">(mois)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="duration" name="duration" min="6" max="360" (ngModelChange)="liveSimulate()" class="premium-input outfit">
                <input type="range" min="6" max="360" step="1" [(ngModel)]="duration" (ngModelChange)="liveSimulate()" class="premium-range">
              </div>
              <div class="range-hint outfit"><span>6 mois</span><span>{{ (duration/12) | number:'1.0-1' }} ans</span><span>360 mois</span></div>
            </div>

            <div class="form-group">
              <label class="outfit">Taux d'intérêt annuel <span class="muted">(%)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="interestRate" name="rate" min="0.5" max="25" step="0.25" (ngModelChange)="liveSimulate()" class="premium-input outfit">
                <input type="range" min="0.5" max="25" step="0.25" [(ngModel)]="interestRate" (ngModelChange)="liveSimulate()" class="premium-range">
              </div>
              <div class="range-hint outfit"><span>0.5%</span><span>Taux Amen ~7.5%</span><span>25%</span></div>
            </div>

            <button class="btn btn-primary btn-block btn-lg mt-1" (click)="recalculateNow()" [disabled]="loading()">
              {{ loading() ? 'Calcul des échéances...' : 'Actualiser la simulation' }}
            </button>
          </div>

          <!-- Summary card -->
          @if (result(); as r) {
            <div class="card premium-card sim-summary">
              <div class="card-header outfit">
                <h3>Résumé financier</h3>
              </div>
              <div class="summary-highlight mb-3">
                <span class="label outfit">Mensualité estimée</span>
                <span class="value outfit accent-text">{{ r.monthlyPayment | number:'1.3-3' }} <small>TND</small></span>
              </div>

              <div class="summary-grid">
                <div class="summary-cell glass-style">
                  <span class="cell-label outfit">Coût total</span>
                  <span class="cell-value outfit">{{ r.totalCost | number:'1.3-3' }}</span>
                </div>
                <div class="summary-cell glass-style">
                  <span class="cell-label outfit">Total intérêts</span>
                  <span class="cell-value outfit danger-text">{{ r.totalInterest | number:'1.3-3' }}</span>
                </div>
              </div>

              <div class="ratio-section mt-3">
                <div class="flex-between mb-1">
                  <span class="outfit font-bold size-sm uppercase">Répartition du coût</span>
                  <span class="outfit size-sm color-accent">{{ interestRatio() | number:'1.0-1' }}% Intérêts</span>
                </div>
                <div class="ratio-bar-premium" [title]="'Capital vs intérêts'">
                  <div class="ratio-principal" [style.width.%]="principalRatio()"></div>
                  <div class="ratio-interest" [style.width.%]="interestRatio()"></div>
                </div>
              </div>

              <div class="summary-actions mt-3">
                <button class="btn btn-ghost btn-sm" (click)="exportCsv()" [disabled]="!r.schedule?.length">📥 CSV</button>
                <button class="btn btn-ghost btn-sm" (click)="printSchedule()" [disabled]="!r.schedule?.length">🖨️ PDF</button>
                <button class="btn btn-accent btn-sm" (click)="onApply()">Demander ce crédit</button>
              </div>
            </div>
          }
        </div>

        <!-- Amortization schedule -->
        @if (result()?.schedule?.length) {
          <div class="card premium-card mt-3 schedule-card" id="printable-schedule">
            <div class="schedule-head flex-between mb-3">
              <div>
                <h3 class="outfit mb-1">Échéancier détaillé</h3>
                <p class="muted outfit">{{ result()!.durationMonths }} mensualités — Capital {{ result()!.amount | number:'1.3-3' }} TND</p>
              </div>
              <div class="badge badge-dark outfit">TAUX: {{ result()!.interestRate | number:'1.2-2' }}%</div>
            </div>
            <div class="table-container premium-table-wrapper">
              <table class="premium-table">
                <thead>
                  <tr>
                    <th class="outfit">N°</th>
                    <th class="outfit">Échéance</th>
                    <th class="text-right outfit">Mensualité</th>
                    <th class="text-right outfit">Capital</th>
                    <th class="text-right outfit">Intérêts</th>
                    <th class="text-right outfit">Solde restant</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of result()!.schedule; track row.month) {
                    <tr [class.year-mark]="row.month % 12 === 0">
                      <td class="font-bold">{{ row.month }}</td>
                      <td>{{ row.dueDate | date:'MMM yyyy' | uppercase }}</td>
                      <td class="text-right font-bold">{{ row.payment | number:'1.3-3' }}</td>
                      <td class="text-right">{{ row.principalPart | number:'1.3-3' }}</td>
                      <td class="text-right danger-text">{{ row.interestPart | number:'1.3-3' }}</td>
                      <td class="text-right font-bold color-primary">{{ row.remainingBalance | number:'1.3-3' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .subtitle { color: var(--gray-500); font-size: 0.95rem; margin-bottom: 2rem; }
    .muted { color: var(--gray-400); font-weight: normal; font-size: 0.8rem; }

    .sim-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
    @media (max-width: 1000px) { .sim-grid { grid-template-columns: 1fr; } }

    .premium-card { padding: 2.5rem; border: 1px solid var(--gray-100); box-shadow: var(--shadow-lg); }
    
    .input-with-slider { display: flex; flex-direction: column; gap: 0.75rem; }
    .premium-input {
      background: var(--gray-50); border: 1px solid var(--gray-200);
      padding: 1rem; border-radius: var(--radius); font-size: 1.25rem; font-weight: 700; color: var(--primary);
    }
    .premium-range {
      accent-color: var(--accent); height: 6px; border-radius: 3px; cursor: pointer;
    }
    .range-hint { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--gray-400); font-weight: 600; margin-top: 0.25rem; }

    .summary-highlight {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      padding: 2rem; border-radius: var(--radius); text-align: center; color: white;
      box-shadow: var(--shadow-md); border: 1px solid var(--primary-light);
    }
    .summary-highlight .label { font-size: 0.8rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 0.5rem; }
    .summary-highlight .value { font-size: 2.5rem; font-weight: 800; line-height: 1; }
    .summary-highlight .value small { font-size: 1rem; opacity: 0.6; }

    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .summary-cell { padding: 1.25rem; border-radius: var(--radius); border: 1px solid var(--gray-100); background: var(--white); }
    .cell-label { font-size: 0.7rem; color: var(--gray-500); text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 0.5rem; }
    .cell-value { font-size: 1.25rem; font-weight: 700; color: var(--primary); }

    .ratio-bar-premium { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--gray-100); }
    .ratio-principal { background: var(--primary); }
    .ratio-interest { background: var(--accent); }

    .summary-actions { display: flex; gap: 0.75rem; }
    .summary-actions .btn { flex: 1; height: 44px; }

    .premium-table-wrapper { border-radius: var(--radius); border: 1px solid var(--gray-100); overflow: hidden; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.75rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gray-50); font-size: 0.9rem; }
    .premium-table tr.year-mark { background: rgba(197, 160, 89, 0.05); }

    .accent-text { color: var(--accent) !important; }
    .danger-text { color: var(--danger) !important; }
    .color-primary { color: var(--primary); }
    .font-bold { font-weight: 700; }
    .size-sm { font-size: 0.75rem; }
    .uppercase { text-transform: uppercase; }

    @media print {
      app-sidebar, .sim-form, .summary-actions, .page-header { display: none !important; }
      .main-content { padding: 0 !important; margin: 0 !important; }
      .premium-card { box-shadow: none; border: 1px solid #eee; }
      .table-container { max-height: none !important; }
    }
  `]
})


export class SimulateComponent {
  amount = 10000;
  duration = 24;
  interestRate = 7.5;
  result = signal<CreditSimulation | null>(null);
  loading = signal(false);
  error = signal('');
  navItems = CLIENT_NAV;

  private debounce: any = null;

  principalRatio = computed(() => {
    const r = this.result();
    if (!r || !r.totalCost) return 0;
    return (r.amount / r.totalCost) * 100;
  });
  interestRatio = computed(() => 100 - this.principalRatio());

  constructor(private api: ApiService) {
    this.liveSimulate();
  }

  liveSimulate() {
    if (!this.isValid()) return;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.runSimulation(), 250);
  }

  recalculateNow() {
    if (!this.isValid()) {
      this.error.set('Vérifiez les paramètres (montant >= 1000, durée >= 6, taux > 0).');
      return;
    }
    clearTimeout(this.debounce);
    this.runSimulation();
  }

  private isValid(): boolean {
    return this.amount >= 1000 && this.duration >= 6 && this.interestRate > 0;
  }

  private runSimulation() {
    this.loading.set(true);
    this.error.set('');
    this.api.simulateCredit(this.amount, this.duration, this.interestRate).subscribe({
      next: r => {
        this.loading.set(false);
        if (r.data) this.result.set(r.data);
      },
      error: e => {
        this.loading.set(false);
        this.error.set(e?.error?.message || 'Erreur lors de la simulation.');
      }
    });
  }

  exportCsv() {
    const r = this.result();
    if (!r?.schedule?.length) return;
    const header = 'Mois;Échéance;Mensualité;Capital;Intérêts;Capital restant';
    const rows = r.schedule.map(s =>
      `${s.month};${new Date(s.dueDate).toLocaleDateString('fr-FR')};${s.payment};${s.principalPart};${s.interestPart};${s.remainingBalance}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echeancier-${r.amount}-TND-${r.durationMonths}-mois.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printSchedule() {
    window.print();
  }

  onApply() {
    console.log('Demander ce crédit clicked');
  }
}
