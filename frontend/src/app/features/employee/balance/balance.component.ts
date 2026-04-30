import { Component, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { EMPLOYEE_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-employee-balance',
  imports: [SidebarComponent, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Crédit de Compte Manuel</h1>
          <p class="subtitle outfit">Ajustement opérationnel des soldes clients avec validation immédiate.</p>
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <div class="operation-panel card premium-card">
          <!-- Step 1: Client -->
          <div class="step-container">
            <div class="step-header">
              <span class="step-num outfit">01</span>
              <div class="step-info">
                <h3 class="outfit">Identification Client</h3>
                <p class="outfit size-xs color-gray-400">Recherchez et sélectionnez le titulaire du compte.</p>
              </div>
            </div>
            
            <div class="form-group mt-1">
              @if (loadingClients()) {
                <div class="state-loader"><span class="premium-spinner-sm"></span></div>
              } @else {
                <select (change)="onClientChange($any($event.target).value)" class="premium-select">
                  <option value="">-- Sélectionner un client --</option>
                  @for (c of clients(); track c.id) {
                    <option [value]="c.id" [selected]="selectedClientId() == c.id">{{ c.name }}</option>
                  }
                </select>
              }
            </div>

            @if (selectedClient(); as client) {
              <div class="client-detail-card animate-in">
                <div class="detail-avatar outfit">{{ initials(client.name) }}</div>
                <div class="detail-text">
                  <div class="detail-name outfit">{{ client.name }}</div>
                  <div class="detail-sub outfit">{{ client.email }}</div>
                </div>
                <div class="detail-badge outfit">{{ client.accounts?.length ?? 0 }} COMPTES</div>
              </div>
            }
          </div>

          <!-- Step 2: Account -->
          <div class="step-container" [class.disabled]="!selectedClientId()">
            <div class="step-header">
              <span class="step-num outfit">02</span>
              <div class="step-info">
                <h3 class="outfit">Sélection du Compte</h3>
                <p class="outfit size-xs color-gray-400">Choisissez le compte bancaire à créditer.</p>
              </div>
            </div>

            <div class="form-group mt-1">
              <select (change)="onAccountChange($any($event.target).value)" [disabled]="!selectedClientId()" class="premium-select">
                <option value="">
                  @if (!selectedClientId()) { En attente du client... }
                  @else if (accounts().length === 0) { Aucun compte actif trouvé }
                  @else { -- Choisir le compte cible -- }
                </option>
                @for (a of accounts(); track a.id) {
                  <option [value]="a.id" [selected]="selectedAccountId() == a.id">
                    {{ a.accountNumber }} — {{ a.balance | number:'1.3-3' }} TND
                  </option>
                }
              </select>
            </div>

            @if (selectedAccount(); as acc) {
              <div class="balance-preview-box animate-in">
                <div class="prev-row">
                  <span class="prev-label outfit">SOLDE ACTUEL</span>
                  <span class="prev-val outfit">{{ acc.balance | number:'1.3-3' }} TND</span>
                </div>
                @if (amount() > 0) {
                  <div class="prev-row mt-0-5 border-top-glow pt-0-5">
                    <span class="prev-label outfit">AJUSTEMENT</span>
                    <span class="prev-val outfit color-accent">+ {{ amount() | number:'1.3-3' }} TND</span>
                  </div>
                  <div class="prev-row mt-0-5">
                    <span class="prev-label outfit">NOUVEAU SOLDE</span>
                    <span class="prev-val outfit color-primary font-bold">{{ (+acc.balance + amount()) | number:'1.3-3' }} TND</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Step 3: Amount -->
          <div class="step-container" [class.disabled]="!selectedAccountId()">
            <div class="step-header">
              <span class="step-num outfit">03</span>
              <div class="step-info">
                <h3 class="outfit">Montant du Crédit</h3>
                <p class="outfit size-xs color-gray-400">Saisissez le montant exact à ajouter en TND.</p>
              </div>
            </div>

            <div class="form-group mt-1">
              <input type="number" [value]="amount() || ''" (input)="amount.set(+$any($event.target).value || 0)"
                     min="0.001" step="0.001" placeholder="0.000" class="premium-input text-center font-bold size-xl" [disabled]="!selectedAccountId()">
            </div>
          </div>

          <button class="btn btn-primary btn-block btn-lg mt-1 outfit" [disabled]="!canSubmit() || loading()" (click)="onSubmit()">
            @if (loading()) { <span class="premium-spinner-sm mr-1"></span> EXÉCUTION... }
            @else if (canSubmit()) { CONFIRMER LE CRÉDIT DE {{ amount() | number:'1.3-3' }} TND }
            @else { {{ disabledReason() || 'VALIDER L\\'OPÉRATION' }} }
          </button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .operation-panel { max-width: 600px; padding: 2.5rem; }
    
    .step-container { margin-bottom: 2rem; position: relative; }
    .step-container.disabled { opacity: 0.4; pointer-events: none; }
    .step-header { display: flex; gap: 1rem; align-items: flex-start; }
    .step-num { font-size: 1.5rem; font-weight: 900; color: var(--accent); opacity: 0.3; line-height: 1; }
    .step-info h3 { font-size: 1rem; font-weight: 800; color: var(--primary); margin: 0; }
    .step-info p { margin-top: 2px; }

    .state-loader { padding: 1rem; text-align: center; }
    .premium-spinner-sm { width: 18px; height: 18px; border: 2px solid var(--gray-200); border-top-color: var(--accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }

    .client-detail-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--gray-50); border: 1px solid var(--gray-100); border-radius: 12px; margin-top: 1rem; }
    .detail-avatar { width: 40px; height: 40px; background: var(--primary); color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; }
    .detail-text { flex: 1; min-width: 0; }
    .detail-name { font-weight: 800; color: var(--primary); font-size: 0.9rem; }
    .detail-sub { font-size: 0.75rem; color: var(--gray-400); }
    .detail-badge { font-size: 0.6rem; font-weight: 900; background: var(--gray-100); color: var(--gray-500); padding: 0.2rem 0.5rem; border-radius: 4px; }

    .balance-preview-box { background: white; border: 1px solid var(--gray-100); border-radius: 12px; padding: 1.25rem; margin-top: 1rem; }
    .prev-row { display: flex; justify-content: space-between; align-items: center; }
    .prev-label { font-size: 0.7rem; font-weight: 800; color: var(--gray-400); letter-spacing: 0.05em; }
    .prev-val { font-size: 1rem; font-weight: 700; color: var(--primary); }
    .border-top-glow { border-top: 1px dashed var(--gray-200); }

    .size-xl { font-size: 2rem !important; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class EmployeeBalanceComponent implements OnInit {
  navItems = EMPLOYEE_NAV;

  clients      = signal<any[]>([]);
  accounts     = signal<any[]>([]);
  selectedClientId  = signal<number | null>(null);
  selectedAccountId = signal<number | null>(null);
  amount       = signal<number>(0);
  loading      = signal(false);
  loadingClients = signal(false);
  msg          = signal('');
  isError      = signal(false);

  selectedClient  = computed(() => this.clients().find(c => c.id === this.selectedClientId()) ?? null);
  selectedAccount = computed(() => this.accounts().find(a => a.id === this.selectedAccountId()) ?? null);
  canSubmit       = computed(() =>
    !this.loading() &&
    this.selectedClientId() != null &&
    this.selectedAccountId() != null &&
    this.amount() > 0
  );

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadClients(); }

  loadClients() {
    this.loadingClients.set(true);
    this.api.getClientsWithAccounts().subscribe({
      next: r => {
        this.loadingClients.set(false);
        this.clients.set(r.data || []);
      },
      error: () => {
        this.loadingClients.set(false);
        this.showMsg('Impossible de charger les clients.', true);
      }
    });
  }

  onClientChange(value: string) {
    const id = value ? +value : null;
    this.selectedClientId.set(id);
    this.selectedAccountId.set(null);
    const client = this.clients().find(c => c.id === id);
    this.accounts.set(client?.accounts || []);
  }

  onAccountChange(value: string) {
    this.selectedAccountId.set(value ? +value : null);
  }

  disabledReason(): string {
    if (!this.selectedClientId()) return 'Selectionnez un client';
    if (!this.selectedAccountId()) return 'Selectionnez un compte';
    if (this.amount() <= 0) return 'Saisissez un montant > 0';
    return '';
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  showMsg(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 5000);
  }

  onSubmit() {
    if (!this.canSubmit()) return;
    const client = this.selectedClient();
    const accId  = this.selectedAccountId()!;
    const amt    = this.amount();
    this.loading.set(true);
    this.api.increaseBalance(accId, amt).subscribe({
      next: () => {
        this.loading.set(false);
        this.showMsg(`Solde de ${client?.name ?? 'client'} augmente de ${amt} TND. Notification envoyee.`);
        this.selectedClientId.set(null);
        this.selectedAccountId.set(null);
        this.amount.set(0);
        this.accounts.set([]);
        this.loadClients();
      },
      error: e => {
        this.loading.set(false);
        this.showMsg(e.error?.message || 'Erreur lors de la mise a jour.', true);
      }
    });
  }
}
