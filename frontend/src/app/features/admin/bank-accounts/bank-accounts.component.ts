import { Component, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { DatePipe, DecimalPipe } from '@angular/common';

interface AdminBankAccount {
  id: number;
  accountNumber: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
}

@Component({
  selector: 'app-admin-bank-accounts',
  imports: [SidebarComponent, DatePipe, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1>Comptes bancaires</h1>
          <p style="color:#737373; font-size:0.9rem;">Activer ou desactiver les comptes bancaires des clients. Un compte desactive ne peut plus effectuer de virements.</p>
        </div>

        @if (msg()) {
          <div class="alert" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div>
        }

        <!-- Filter tabs -->
        <div class="card mb-3" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-sm" [class.btn-primary]="filter()===''" (click)="filter.set('')">Tous ({{ accounts().length }})</button>
          <button class="btn btn-sm" [class.btn-primary]="filter()==='ACTIVE'" (click)="filter.set('ACTIVE')">Actifs ({{ countByStatus('ACTIVE') }})</button>
          <button class="btn btn-sm" [class.btn-primary]="filter()==='DISABLED'" (click)="filter.set('DISABLED')">Desactives ({{ countByStatus('DISABLED') }})</button>
        </div>

        <!-- Confirm dialog -->
        @if (confirmAccount()) {
          <div class="overlay" (click)="confirmAccount.set(null)">
            <div class="dialog" (click)="$event.stopPropagation()">
              <h3>{{ confirmAction() === 'deactivate' ? 'Desactiver le compte' : 'Activer le compte' }}</h3>
              <p>Compte : <strong>{{ confirmAccount()!.accountNumber }}</strong></p>
              <p>Client : <strong>{{ confirmAccount()!.clientName }}</strong></p>
              @if (confirmAction() === 'deactivate') {
                <p style="color: var(--danger, #e74c3c); font-size: 0.88rem; margin-top: 0.75rem;">
                  Le client ne pourra plus effectuer de virements (simple, groupe, permanent) depuis ce compte tant qu'il reste desactive.
                </p>
              } @else {
                <p style="color: #2ecc71; font-size: 0.88rem; margin-top: 0.75rem;">
                  Le client pourra de nouveau effectuer des virements depuis ce compte.
                </p>
              }
              <div class="flex gap-1" style="margin-top: 1.25rem;">
                <button class="btn btn-secondary" (click)="confirmAccount.set(null)">Annuler</button>
                <button class="btn"
                        [class.btn-danger]="confirmAction() === 'deactivate'"
                        [class.btn-primary]="confirmAction() === 'activate'"
                        (click)="onConfirm()" [disabled]="processing()">
                  {{ processing() ? 'Traitement...' : (confirmAction() === 'deactivate' ? 'Desactiver' : 'Activer') }}
                </button>
              </div>
            </div>
          </div>
        }

        <div class="card">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>N° Compte</th>
                  <th>IBAN</th>
                  <th>Client</th>
                  <th>Solde</th>
                  <th>Statut</th>
                  <th>Cree le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (a of filtered(); track a.id) {
                  <tr>
                    <td><strong>{{ a.accountNumber }}</strong></td>
                    <td style="font-family: monospace; font-size: 0.8rem;">{{ a.iban }}</td>
                    <td>
                      <div>{{ a.clientName }}</div>
                      <div style="font-size: 0.75rem; color: #888;">{{ a.clientEmail }}</div>
                    </td>
                    <td><strong>{{ a.balance | number:'1.3-3' }}</strong> <span style="color:#888;">{{ a.currency }}</span></td>
                    <td>
                      <span class="badge"
                            [class.badge-success]="a.status==='ACTIVE'"
                            [class.badge-danger]="a.status==='DISABLED'"
                            [class.badge-warning]="a.status==='CLOSED'">
                        {{ statusLabel(a.status) }}
                      </span>
                    </td>
                    <td>{{ a.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="flex gap-1">
                      @if (a.status === 'ACTIVE') {
                        <button class="btn btn-secondary btn-sm" (click)="openConfirm(a, 'deactivate')">Desactiver</button>
                      } @else if (a.status === 'DISABLED') {
                        <button class="btn btn-primary btn-sm" (click)="openConfirm(a, 'activate')">Activer</button>
                      }
                    </td>
                  </tr>
                }
                @if (filtered().length === 0) {
                  <tr><td colspan="7" style="text-align:center; padding:2rem; color:#888;">Aucun compte trouve</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .dialog {
      background: #fff; border-radius: 14px; padding: 2rem; max-width: 460px; width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .dialog h3 { margin: 0 0 1rem; font-size: 1.25rem; }
    .dialog p { margin: 0 0 0.4rem; }
    .btn-danger { background: #e74c3c; color: #fff; border: none; }
    .btn-danger:hover:not(:disabled) { background: #c0392b; }
  `]
})
export class AdminBankAccountsComponent implements OnInit {
  accounts = signal<AdminBankAccount[]>([]);
  filter = signal<string>('');
  msg = signal('');
  isError = signal(false);
  confirmAccount = signal<AdminBankAccount | null>(null);
  confirmAction = signal<'activate' | 'deactivate'>('deactivate');
  processing = signal(false);
  navItems = ADMIN_NAV;

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getAdminBankAccounts().subscribe({
      next: (r) => {
        if (r.data?.content) this.accounts.set(r.data.content);
      },
      error: (e) => this.showMsg(e.error?.message || 'Erreur de chargement', true)
    });
  }

  filtered(): AdminBankAccount[] {
    const f = this.filter();
    return f ? this.accounts().filter(a => a.status === f) : this.accounts();
  }

  countByStatus(status: string): number {
    return this.accounts().filter(a => a.status === status).length;
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'ACTIVE': return 'Actif';
      case 'DISABLED': return 'Desactive';
      case 'CLOSED': return 'Ferme';
      default: return s;
    }
  }

  openConfirm(account: AdminBankAccount, action: 'activate' | 'deactivate') {
    this.confirmAccount.set(account);
    this.confirmAction.set(action);
  }

  onConfirm() {
    const account = this.confirmAccount();
    if (!account) return;
    const action = this.confirmAction();
    this.processing.set(true);

    const obs = action === 'deactivate'
      ? this.api.deactivateBankAccount(account.id)
      : this.api.activateBankAccount(account.id);

    obs.subscribe({
      next: () => {
        this.processing.set(false);
        this.confirmAccount.set(null);
        this.showMsg(action === 'deactivate'
          ? `Compte ${account.accountNumber} desactive`
          : `Compte ${account.accountNumber} active`);
        this.load();
      },
      error: (e) => {
        this.processing.set(false);
        this.confirmAccount.set(null);
        this.showMsg(e.error?.message || 'Erreur', true);
      }
    });
  }

  showMsg(text: string, error = false) {
    this.msg.set(text);
    this.isError.set(error);
    setTimeout(() => this.msg.set(''), 5000);
  }
}
