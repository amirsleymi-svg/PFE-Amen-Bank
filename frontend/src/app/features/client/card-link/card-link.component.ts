import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { BankAccount } from '../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-card-link',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header"><h1>Demander une carte bancaire</h1></div>
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="card" style="max-width:450px;">
          <p style="color:#666;font-size:0.9rem;margin-bottom:1rem;">
            Sélectionnez un compte actif pour générer une carte bancaire.
          </p>
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Compte</label>
              <select [(ngModel)]="selectedAccountId" name="account" required>
                <option [ngValue]="null" disabled>-- Choisir un compte --</option>
                @for (a of accounts(); track a.id) {
                  <option [ngValue]="a.id">{{ a.accountNumber }} - {{ a.balance | number:'1.3-3' }} TND</option>
                }
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading() || !selectedAccountId">
              {{ loading() ? 'Création...' : 'Demander la carte' }}
            </button>
          </form>
        </div>
      </main>
    </div>
  `
})
export class CardLinkComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  selectedAccountId: number | null = null;
  loading = signal(false);
  success = signal('');
  error = signal('');
  navItems = CLIENT_NAV;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAccounts().subscribe({
      next: r => {
        if (r.data?.length) {
          this.accounts.set(r.data.filter(a => a.status === 'ACTIVE'));
        }
      },
      error: () => {}
    });
  }

  onSubmit() {
    if (!this.selectedAccountId) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.api.requestCard(this.selectedAccountId).subscribe({
      next: (r) => {
        this.loading.set(false);
        const c = r.data;
        this.success.set(c
          ? `Carte créée avec succès : ${c.cardNumberMasked} (expire ${c.expiryDate})`
          : 'Carte créée avec succès.');
        this.selectedAccountId = null;
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.message || 'Erreur lors de la création de la carte');
      }
    });
  }
}
