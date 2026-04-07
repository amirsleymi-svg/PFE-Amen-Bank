import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-credit-request',
  imports: [SidebarComponent, FormsModule],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Demande de credit</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="card" style="max-width:500px;">
          <form (ngSubmit)="onSubmit()">
            <div class="form-group"><label>Montant (TND)</label><input type="number" [(ngModel)]="form.amount" name="amount" min="1000" required></div>
            <div class="form-group"><label>Duree (mois)</label><input type="number" [(ngModel)]="form.durationMonths" name="duration" min="6" required></div>
            <div class="form-group"><label>Objet du credit</label><textarea [(ngModel)]="form.purpose" name="purpose" rows="3"></textarea></div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Soumettre</button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class CreditRequestComponent {
  form = { amount: 10000, durationMonths: 24, purpose: '' };
  loading = signal(false); success = signal(''); error = signal('');
  constructor(private api: ApiService) {}
  onSubmit() {
    this.loading.set(true); this.error.set('');
    this.api.requestCredit(this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set('Demande soumise avec succes.'); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
