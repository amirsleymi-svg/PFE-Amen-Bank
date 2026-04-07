import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../../core/services/api.service';
import { CreditSimulation } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-simulate',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Simulation de credit</h1></div>
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
          <div class="card" style="flex:1; min-width:300px;">
            <form (ngSubmit)="onSimulate()">
              <div class="form-group"><label>Montant (TND)</label><input type="number" [(ngModel)]="amount" name="amount" min="1000" required></div>
              <div class="form-group"><label>Duree (mois)</label><input type="number" [(ngModel)]="duration" name="duration" min="6" required></div>
              <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Simuler</button>
            </form>
          </div>
          @if (result()) {
            <div class="card" style="flex:1; min-width:300px;">
              <h3 class="mb-2">Resultat de la simulation</h3>
              <div class="mb-1"><span style="color:var(--gray-500)">Montant:</span> <strong>{{ result()!.amount | number:'1.3-3' }} TND</strong></div>
              <div class="mb-1"><span style="color:var(--gray-500)">Duree:</span> <strong>{{ result()!.durationMonths }} mois</strong></div>
              <div class="mb-1"><span style="color:var(--gray-500)">Taux:</span> <strong>{{ result()!.interestRate }}%</strong></div>
              <div class="mb-1"><span style="color:var(--gray-500)">Mensualite:</span> <strong class="amount">{{ result()!.monthlyPayment | number:'1.3-3' }} TND</strong></div>
              <div class="mb-1"><span style="color:var(--gray-500)">Cout total:</span> <strong>{{ result()!.totalCost | number:'1.3-3' }} TND</strong></div>
              <div><span style="color:var(--gray-500)">Total interets:</span> <strong style="color:var(--danger)">{{ result()!.totalInterest | number:'1.3-3' }} TND</strong></div>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class SimulateComponent {
  amount: number = 10000; duration: number = 24;
  result = signal<CreditSimulation | null>(null);
  loading = signal(false);
  constructor(private api: ApiService) {}
  onSimulate() {
    this.loading.set(true);
    this.api.simulateCredit(this.amount, this.duration).subscribe({
      next: (r) => { this.loading.set(false); if (r.data) this.result.set(r.data); },
      error: () => this.loading.set(false)
    });
  }
}
