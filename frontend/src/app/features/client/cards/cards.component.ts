import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { AccountCard, BankAccount, CardTransferDirection } from '../../../core/models/api.models';

@Component({
  selector: 'app-cards',
  imports: [SidebarComponent, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1 class="outfit">Cartes Bancaires</h1>
            <p class="subtitle outfit">Gérez vos moyens de paiement et plafonds en temps réel.</p>
          </div>
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <div class="card premium-card mb-3">
          <div class="flex-between align-center">
            <div>
              <h3 class="outfit mb-1">Nouvelle Carte</h3>
              <p class="size-xs color-gray-500">Générez une carte liée à l'un de vos comptes bancaires actifs.</p>
            </div>
          </div>
          <div class="flex gap-1 mt-2 align-end wrap">
            <div class="form-group flex-1 min-w-300 mb-0">
              <label class="outfit size-xs uppercase color-gray-400">Sélectionner le compte source</label>
              <select [(ngModel)]="requestAccountId" name="reqAcc" class="premium-select">
                <option [ngValue]="null">-- Choisir un compte --</option>
                @for (a of eligibleAccounts(); track a.id) {
                  <option [ngValue]="a.id">{{ a.accountNumber }} ({{ a.balance | number:'1.3-3' }} TND)</option>
                }
              </select>
            </div>
            <button class="btn btn-primary outfit" (click)="onRequest()" [disabled]="!requestAccountId || loading()">
              {{ loading() ? 'Génération...' : 'DEMANDER LA CARTE' }}
            </button>
          </div>
          @if (eligibleAccounts().length === 0) {
            <p class="size-xs color-gray-400 mt-1 italic">Tous vos comptes actifs disposent déjà d'une carte associée.</p>
          }
        </div>

        @if (confirmDelete()) {
          <div class="overlay animate-in" (click)="confirmDelete.set(null)">
            <div class="dialog glass-style-dark" (click)="$event.stopPropagation()">
              <h3 class="outfit color-white">Révocation de Carte</h3>
              <p class="mb-2">Confirmez-vous la suppression définitive de la carte <strong>{{ confirmDelete()!.cardNumberMasked }}</strong> ?</p>
              @if (confirmDelete()!.balance > 0) {
                <div class="warning-box mb-2">
                  <p class="size-xs color-accent font-bold uppercase">Restitution de fonds</p>
                  <p class="size-xs color-gray-300">Le solde de {{ confirmDelete()!.balance | number:'1.3-3' }} TND sera crédité sur {{ confirmDelete()!.accountIban }}.</p>
                </div>
              }
              <div class="flex gap-1">
                <button class="btn btn-ghost" (click)="confirmDelete.set(null)">Annuler</button>
                <button class="btn btn-danger" (click)="onDelete()">CONFIRMER LA SUPPRESSION</button>
              </div>
            </div>
          </div>
        }

        @if (transferCard()) {
          <div class="overlay animate-in" (click)="closeTransfer()">
            <div class="dialog glass-style" (click)="$event.stopPropagation()">
              <h3 class="outfit">Rechargement Express</h3>
              <div class="card-preview-mini mb-2">
                <div class="preview-number outfit">{{ transferCard()!.cardNumberMasked }}</div>
                <div class="preview-balance outfit">{{ transferCard()!.balance | number:'1.3-3' }} TND</div>
              </div>
              <div class="form-group mb-2">
                <label class="outfit size-xs uppercase color-gray-400">Montant à transférer (TND)</label>
                <input type="number" min="0.001" step="0.001" [(ngModel)]="transferAmount" name="amt" class="premium-input text-center size-xl font-bold" placeholder="0.000">
              </div>
              <div class="flex gap-1">
                <button class="btn btn-ghost" (click)="closeTransfer()">Annuler</button>
                <button class="btn btn-primary flex-1 outfit" (click)="onTransfer()" [disabled]="!transferAmount || transferAmount <= 0">CONFIRMER LE RECHARGEMENT</button>
              </div>
            </div>
          </div>
        }

        <div class="cards-grid">
          @for (c of cards(); track c.id) {
            <div class="virtual-card-wrapper animate-in">
              <div class="virtual-card" [class]="'theme-' + (c.id % 3)">
                <div class="card-noise"></div>
                <div class="card-glow"></div>
                <div class="card-header-v flex-between">
                  <div class="bank-logo-v outfit">AMEN BANK</div>
                  <div class="contactless-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12.09c-2.97-.38-5.57-2.1-6.87-4.57.11-.63.33-1.23.63-1.78.3-.55.7-1.04 1.17-1.45.24-.2.52-.36.82-.47.3-.11.61-.17.93-.17.32 0 .63.06.93.17.3.11.58.27.82.47.47.41.87.9 1.17 1.45.3.55.52 1.15.63 1.78-1.3 2.47-3.9 4.19-6.87 4.57z"/></svg>
                  </div>
                </div>
                <div class="chip"></div>
                <div class="card-number-v outfit">{{ c.cardNumberMasked }}</div>
                <div class="flex-between align-end">
                  <div class="card-holder-v">
                    <div class="label outfit">Valid Thru</div>
                    <div class="value outfit">{{ c.expiryDate | date:'MM/yy' }}</div>
                  </div>
                  <div class="card-type-v outfit">PREMIUM</div>
                </div>
              </div>
              
              <div class="card-management-panel">
                <div class="flex-between align-center mb-1">
                  <div class="panel-balance">
                    <span class="label outfit">SOLDE CARTE</span>
                    <span class="val outfit">{{ c.balance | number:'1.3-3' }} <small>TND</small></span>
                  </div>
                  <span class="status-indicator-v" [class]="'st-' + c.status.toLowerCase()">{{ statusLabel(c.status) }}</span>
                </div>
                <div class="panel-actions">
                  @if (c.status === 'ACTIVE') {
                    <button class="btn btn-primary btn-sm flex-1 outfit" (click)="openTransfer(c)">RECHARGER</button>
                    <button class="btn btn-ghost btn-sm outfit" (click)="deactivate(c.id)">BLOQUER</button>
                  }
                  @if (c.status === 'DISABLED') {
                    <button class="btn btn-accent btn-sm flex-1 outfit" (click)="activate(c.id)">ACTIVER</button>
                  }
                  @if (c.status !== 'EXPIRED') {
                    <button class="btn btn-ghost btn-danger-text btn-sm" (click)="confirmDelete.set(c)">✕</button>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state-full col-span-full">
              <div class="empty-icon">💳</div>
              <p class="outfit">Aucune carte active. Commandez votre première carte ci-dessus.</p>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2rem; }
    
    .virtual-card {
      height: 220px; border-radius: 18px; padding: 1.5rem; position: relative; overflow: hidden;
      display: flex; flex-direction: column; justify-content: space-between;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); color: white;
    }
    .theme-0 { background: linear-gradient(135deg, #001529 0%, #003d6e 100%); }
    .theme-1 { background: linear-gradient(135deg, #001529 0%, #1a2a3a 100%); }
    .theme-2 { background: linear-gradient(135deg, #002c52 0%, #001529 100%); }

    .card-noise { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.1; background: url('https://www.transparenttextures.com/patterns/brushed-alum.png'); }
    .card-glow { position: absolute; top: -50%; right: -20%; width: 150%; height: 150%; background: radial-gradient(circle, rgba(197,165,114,0.1) 0%, transparent 70%); }
    
    .bank-logo-v { font-weight: 900; letter-spacing: 2px; font-size: 0.9rem; color: var(--accent); }
    .chip { width: 45px; height: 35px; background: linear-gradient(135deg, #e0c38c 0%, #c5a572 100%); border-radius: 6px; margin-top: 1rem; position: relative; }
    .chip::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); opacity: 0.2; }
    
    .card-number-v { font-size: 1.5rem; letter-spacing: 4px; margin-top: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-weight: 700; }
    .card-holder-v .label { font-size: 0.5rem; text-transform: uppercase; opacity: 0.6; font-weight: 800; margin-bottom: 2px; }
    .card-holder-v .value { font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; }
    .card-type-v { font-size: 0.7rem; font-weight: 900; color: var(--accent); letter-spacing: 2px; }

    .card-management-panel { background: white; padding: 1.5rem; border-radius: 0 0 18px 18px; border: 1px solid var(--gray-100); border-top: none; margin-top: -10px; z-index: -1; padding-top: 25px; box-shadow: var(--shadow); }
    .panel-balance { display: flex; flex-direction: column; }
    .panel-balance .label { font-size: 0.6rem; color: var(--gray-400); font-weight: 800; }
    .panel-balance .val { font-size: 1.25rem; font-weight: 800; color: var(--primary); }
    .panel-balance .val small { font-size: 0.7rem; color: var(--gray-400); }

    .status-indicator-v { font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; }
    .st-active { background: var(--success-light); color: var(--success); }
    .st-disabled { background: var(--danger-light); color: var(--danger); }
    .st-expired { background: var(--gray-100); color: var(--gray-500); }

    .panel-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .btn-danger-text { color: var(--danger) !important; }
    
    .card-preview-mini { background: var(--primary); color: white; padding: 1rem; border-radius: 8px; text-align: center; }
    .preview-number { font-size: 1.25rem; letter-spacing: 2px; }
    .preview-balance { font-size: 0.8rem; color: var(--accent); font-weight: 700; }

    .empty-state-full { padding: 5rem 2rem; text-align: center; background: var(--gray-50); border-radius: 18px; border: 2px dashed var(--gray-200); }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.2; }
  `]
})
export class CardsComponent implements OnInit {
  cards = signal<AccountCard[]>([]);
  accounts = signal<BankAccount[]>([]);
  msg = signal('');
  isError = signal(false);
  loading = signal(false);
  confirmDelete = signal<AccountCard | null>(null);

  requestAccountId: number | null = null;

  transferCard = signal<AccountCard | null>(null);
  transferDirection: CardTransferDirection = 'ACCOUNT_TO_CARD';
  transferAmount: number | null = null;

  constructor(private api: ApiService) {}
  navItems = CLIENT_NAV;

  ngOnInit() { this.load(); }

  load() {
    this.api.getClientCards().subscribe({ next: r => { if (r.data) this.cards.set(r.data); }, error: () => {} });
    this.api.getAccounts().subscribe({ next: r => { if (r.data) this.accounts.set(r.data); }, error: () => {} });
  }

  eligibleAccounts(): BankAccount[] {
    const usedAccountIds = new Set(this.cards().map(c => c.accountId));
    return this.accounts().filter(a => a.status === 'ACTIVE' && !usedAccountIds.has(a.id));
  }

  statusLabel(s: string): string {
    switch (s) { case 'ACTIVE': return 'Active'; case 'DISABLED': return 'Desactivee'; case 'EXPIRED': return 'Expiree'; default: return s; }
  }

  showMsg(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 5000);
  }

  onRequest() {
    if (!this.requestAccountId) return;
    this.loading.set(true);
    this.api.requestCard(this.requestAccountId).subscribe({
      next: (r) => {
        this.loading.set(false);
        const c = r.data;
        this.showMsg(c
          ? `Votre carte bancaire est creee avec succes : ${c.cardNumberMasked} (expire ${c.expiryDate})`
          : 'Carte creee');
        this.requestAccountId = null;
        this.load();
      },
      error: (e) => { this.loading.set(false); this.showMsg(e.error?.message || 'Erreur', true); }
    });
  }

  openTransfer(card: AccountCard) {
    this.transferCard.set(card);
    this.transferDirection = 'ACCOUNT_TO_CARD';
    this.transferAmount = null;
  }

  closeTransfer() {
    this.transferCard.set(null);
    this.transferAmount = null;
  }

  onTransfer() {
    const card = this.transferCard();
    if (!card || !this.transferAmount || this.transferAmount <= 0) return;
    this.api.cardTransfer(card.id, this.transferDirection, this.transferAmount).subscribe({
      next: () => { this.closeTransfer(); this.showMsg('Carte rechargee avec succes'); this.load(); },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  activate(id: number) {
    this.api.activateCard(id).subscribe({
      next: () => { this.showMsg('Carte activee'); this.load(); },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  deactivate(id: number) {
    this.api.deactivateCard(id).subscribe({
      next: () => { this.showMsg('Carte desactivee'); this.load(); },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  onDelete() {
    const card = this.confirmDelete();
    if (!card) return;
    this.api.deleteCard(card.id).subscribe({
      next: () => { this.confirmDelete.set(null); this.showMsg('Carte supprimee'); this.load(); },
      error: (e) => { this.confirmDelete.set(null); this.showMsg(e.error?.message || 'Erreur', true); }
    });
  }
}
