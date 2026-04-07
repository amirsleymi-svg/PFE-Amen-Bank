import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../../core/services/api.service';
import { BankAccount } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-permanent-transfer',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Virement permanent</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="card" style="max-width:500px;">
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Compte source</label>
              <select [(ngModel)]="form.sourceAccountId" name="source" required>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }} - {{ a.balance | number:'1.3-3' }} TND</option> }
              </select>
            </div>
            <div class="form-group"><label>IBAN destinataire</label><input type="text" [(ngModel)]="form.destinationIban" name="iban" required></div>
            <div class="form-group"><label>Montant (TND)</label><input type="number" [(ngModel)]="form.amount" name="amount" step="0.001" required></div>
            <div class="form-group">
              <label>Frequence</label>
              <select [(ngModel)]="form.frequency" name="freq" required>
                <option value="DAILY">Quotidien</option><option value="WEEKLY">Hebdomadaire</option>
                <option value="MONTHLY">Mensuel</option><option value="QUARTERLY">Trimestriel</option><option value="YEARLY">Annuel</option>
              </select>
            </div>
            <div class="grid-2">
              <div class="form-group"><label>Date debut</label><input type="date" [(ngModel)]="form.startDate" name="start" required></div>
              <div class="form-group"><label>Date fin (optionnel)</label><input type="date" [(ngModel)]="form.endDate" name="end"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Planifier</button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class PermanentTransferComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  form: any = { sourceAccountId: null, destinationIban: '', amount: null, frequency: 'MONTHLY', startDate: '', endDate: '' };
  loading = signal(false); success = signal(''); error = signal('');

  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getAccounts().subscribe(r => { if (r.data?.length) { this.accounts.set(r.data); this.form.sourceAccountId = r.data[0].id; } }); }

  onSubmit() {
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.permanentTransfer(this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set('Virement permanent planifie.'); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
