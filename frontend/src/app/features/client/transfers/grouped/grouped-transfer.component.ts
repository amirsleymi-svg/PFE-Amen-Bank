import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../../core/services/api.service';
import { BankAccount } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-grouped-transfer',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Virement groupe</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="card" style="max-width:600px;">
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Compte source</label>
              <select [(ngModel)]="sourceAccountId" name="source" required>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }} - {{ a.balance | number:'1.3-3' }} TND</option> }
              </select>
            </div>
            <h3 class="mb-2">Beneficiaires</h3>
            @for (b of beneficiaries; track $index) {
              <div class="grid-2 mb-1" style="grid-template-columns: 1fr 1fr 100px auto;">
                <input type="text" [(ngModel)]="b.beneficiaryName" [name]="'name'+$index" placeholder="Nom">
                <input type="text" [(ngModel)]="b.beneficiaryIban" [name]="'iban'+$index" placeholder="IBAN">
                <input type="number" [(ngModel)]="b.amount" [name]="'amt'+$index" step="0.001" placeholder="Montant">
                <button type="button" class="btn btn-danger btn-sm" (click)="removeBeneficiary($index)">X</button>
              </div>
            }
            <button type="button" class="btn btn-secondary btn-sm mb-2" (click)="addBeneficiary()">+ Ajouter</button>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Envoyer</button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class GroupedTransferComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  sourceAccountId: any = null;
  beneficiaries: any[] = [{ beneficiaryName: '', beneficiaryIban: '', amount: null }];
  loading = signal(false);
  success = signal('');
  error = signal('');

  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getAccounts().subscribe(r => { if (r.data?.length) { this.accounts.set(r.data); this.sourceAccountId = r.data[0].id; } }); }
  addBeneficiary() { this.beneficiaries.push({ beneficiaryName: '', beneficiaryIban: '', amount: null }); }
  removeBeneficiary(i: number) { this.beneficiaries.splice(i, 1); }

  onSubmit() {
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.groupedTransfer({ sourceAccountId: this.sourceAccountId, beneficiaries: this.beneficiaries }).subscribe({
      next: () => { this.loading.set(false); this.success.set('Virement groupe initie avec succes.'); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
