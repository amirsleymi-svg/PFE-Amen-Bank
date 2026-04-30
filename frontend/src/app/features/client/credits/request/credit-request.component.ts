import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../../shared/nav-items';
import { ApiService } from '../../../../core/services/api.service';
import { CreditSimulation } from '../../../../core/models/api.models';

@Component({
  selector: 'app-credit-request',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1>Demande de credit</h1>
          <p class="subtitle">Ajustez les parametres et verifiez la mensualite avant de soumettre votre demande.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <div class="req-grid">
          <!-- Interactive form -->
          <div class="card">
            <h3 class="mb-2">Parametres du credit</h3>

            <div class="form-group">
              <label>Montant <span class="muted">(TND)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="amount" name="amount" min="1000" step="500" (ngModelChange)="liveSimulate()">
                <input type="range" min="1000" max="500000" step="500" [(ngModel)]="amount" (ngModelChange)="liveSimulate()">
              </div>
              <div class="range-hint"><span>1 000</span><span>500 000</span></div>
            </div>

            <div class="form-group">
              <label>Duree <span class="muted">(mois)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="duration" name="duration" min="6" max="360" (ngModelChange)="liveSimulate()">
                <input type="range" min="6" max="360" step="1" [(ngModel)]="duration" (ngModelChange)="liveSimulate()">
              </div>
              <div class="range-hint"><span>6 mois</span><span>{{ (duration/12).toFixed(1) }} ans</span><span>30 ans</span></div>
            </div>

            <div class="form-group">
              <label>Taux annuel <span class="muted">(%)</span></label>
              <div class="input-with-slider">
                <input type="number" [(ngModel)]="interestRate" name="rate" min="0.5" max="25" step="0.25" (ngModelChange)="liveSimulate()">
                <input type="range" min="0.5" max="25" step="0.25" [(ngModel)]="interestRate" (ngModelChange)="liveSimulate()">
              </div>
              <div class="range-hint"><span>0.5%</span><span>ref. Amen ~7.5%</span><span>25%</span></div>
            </div>

            <div class="form-group">
              <label>Objet du credit</label>
              <textarea [(ngModel)]="purpose" name="purpose" rows="3" placeholder="Ex: achat vehicule, renovation, etudes..."></textarea>
            </div>

            <button type="button" class="btn btn-primary btn-block" (click)="submitRequest()" [disabled]="loading() || !result()">
              {{ loading() ? 'Envoi...' : 'Soumettre la demande' }}
            </button>
          </div>

          <!-- Live preview -->
          @if (result(); as r) {
            <div class="card summary-card">
              <h3 class="mb-2">Apercu de la mensualite</h3>
              <div class="summary-grid">
                <div class="summary-cell">
                  <span class="cell-label">Mensualite</span>
                  <span class="cell-value primary">{{ r.monthlyPayment | number:'1.3-3' }} TND</span>
                </div>
                <div class="summary-cell">
                  <span class="cell-label">Cout total</span>
                  <span class="cell-value">{{ r.totalCost | number:'1.3-3' }} TND</span>
                </div>
                <div class="summary-cell">
                  <span class="cell-label">Total interets</span>
                  <span class="cell-value danger">{{ r.totalInterest | number:'1.3-3' }} TND</span>
                </div>
                <div class="summary-cell">
                  <span class="cell-label">Duree</span>
                  <span class="cell-value">{{ r.durationMonths }} mois</span>
                </div>
              </div>
              <div class="ratio-bar">
                <div class="ratio-principal" [style.width.%]="principalRatio()"></div>
                <div class="ratio-interest" [style.width.%]="interestRatio()"></div>
              </div>
              <div class="ratio-legend">
                <span><i class="dot dot-p"></i> Capital {{ principalRatio().toFixed(1) }}%</span>
                <span><i class="dot dot-i"></i> Interets {{ interestRatio().toFixed(1) }}%</span>
              </div>
              <p class="hint">Cet apercu est indicatif. Le taux definitif sera valide par votre conseiller Amen.</p>
            </div>
          } @else {
            <div class="card summary-card empty">
              <p class="muted">Saisissez des parametres valides pour obtenir un apercu de la mensualite.</p>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .subtitle { color:#6b7280; font-size:0.9rem; margin:0.25rem 0 1rem; }
    .muted { color:#9ca3af; font-weight:normal; font-size:0.85em; }
    .hint { font-size:0.78rem; color:#6b7280; margin:0.75rem 0 0; }

    .req-grid { display:grid; grid-template-columns:minmax(280px, 1fr) minmax(280px, 1fr); gap:1.25rem; }
    @media (max-width: 900px) { .req-grid { grid-template-columns: 1fr; } }

    .form-group { margin-bottom:1.1rem; }
    .input-with-slider { display:flex; flex-direction:column; gap:0.4rem; }
    .input-with-slider input[type=number] {
      padding:0.55rem 0.75rem; border:1px solid #d1d5db; border-radius:8px; font-size:1rem; font-weight:600;
    }
    .input-with-slider input[type=range] { accent-color:#3b82f6; }
    .range-hint { display:flex; justify-content:space-between; font-size:0.7rem; color:#9ca3af; margin-top:0.15rem; }
    textarea {
      width:100%; padding:0.55rem 0.75rem; border:1px solid #d1d5db; border-radius:8px;
      font-family:inherit; font-size:0.95rem; resize:vertical;
    }

    .summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem; }
    .summary-cell {
      padding:0.75rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
      display:flex; flex-direction:column; gap:0.25rem;
    }
    .cell-label { font-size:0.7rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
    .cell-value { font-size:1.1rem; font-weight:700; color:#111827; }
    .cell-value.primary { color:#2563eb; font-size:1.25rem; }
    .cell-value.danger { color:#dc2626; }

    .ratio-bar { display:flex; height:12px; border-radius:6px; overflow:hidden; margin:0.75rem 0 0.35rem; background:#f3f4f6; }
    .ratio-principal { background:#3b82f6; }
    .ratio-interest { background:#f59e0b; }
    .ratio-legend { display:flex; justify-content:space-between; font-size:0.75rem; color:#4b5563; }
    .dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:0.35rem; }
    .dot-p { background:#3b82f6; }
    .dot-i { background:#f59e0b; }
    .summary-card.empty { display:flex; align-items:center; justify-content:center; min-height:200px; }
  `]
})
export class CreditRequestComponent {
  amount = 10000;
  duration = 24;
  interestRate = 7.5;
  purpose = '';
  result = signal<CreditSimulation | null>(null);
  loading = signal(false);
  success = signal('');
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

  private isValid(): boolean {
    return this.amount >= 1000 && this.duration >= 6 && this.interestRate > 0;
  }

  private runSimulation() {
    this.api.simulateCredit(this.amount, this.duration, this.interestRate).subscribe({
      next: r => { if (r.data) this.result.set(r.data); },
      error: () => this.result.set(null)
    });
  }

  submitRequest() {
    if (!this.isValid()) {
      this.error.set('Parametres invalides.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.api.requestCredit({
      amount: this.amount,
      durationMonths: this.duration,
      purpose: this.purpose
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Demande soumise avec succes. Un conseiller Amen vous contactera prochainement.');
        this.purpose = '';
      },
      error: e => {
        this.loading.set(false);
        this.error.set(e?.error?.message || 'Erreur lors de la soumission de la demande.');
      }
    });
  }
}
