import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { BankAccount } from '../../../core/models/api.models';

@Component({
  selector: 'app-card-link',
  imports: [SidebarComponent, FormsModule],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header"><h1>Lier une carte bancaire</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="card" style="max-width:450px;">
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Compte</label>
              <select [(ngModel)]="form.accountId" name="account" required>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }}</option> }
              </select>
            </div>
            <div class="form-group"><label>Numero de carte</label><input type="text" [(ngModel)]="form.cardNumber" name="card" placeholder="XXXX XXXX XXXX XXXX" required></div>
            <div class="form-group"><label>Date d'expiration (MM/YY)</label><input type="text" [(ngModel)]="form.expiryDate" name="expiry" placeholder="MM/YY" required></div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">Lier la carte</button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class CardLinkComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  form: any = { accountId: null, cardNumber: '', expiryDate: '' };
  loading = signal(false); success = signal(''); error = signal('');
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getAccounts().subscribe(r => { if (r.data?.length) { this.accounts.set(r.data); this.form.accountId = r.data[0].id; } }); }
  onSubmit() {
    this.loading.set(true); this.error.set('');
    this.api.linkCard(this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set('Carte liee avec succes.'); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
