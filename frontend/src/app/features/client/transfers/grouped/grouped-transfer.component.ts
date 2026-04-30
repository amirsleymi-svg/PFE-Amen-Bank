import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../../shared/nav-items';
import { ApiService } from '../../../../core/services/api.service';
import { BankAccount } from '../../../../core/models/api.models';
import { DecimalPipe } from '@angular/common';

interface Beneficiary { beneficiaryName: string; beneficiaryIban: string; amount: number | null; }

@Component({
  selector: 'app-grouped-transfer',
  imports: [SidebarComponent, FormsModule, DecimalPipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1 class="outfit">Virement groupé</h1>
          <p>Gérez vos paiements en masse avec précision et sécurité.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        @if (importMsg()) { <div class="alert alert-info">{{ importMsg() }}</div> }

        <div class="card premium-card" style="max-width:900px;">
          <form (ngSubmit)="onSubmit()">
            <div class="form-group mb-3">
              <label class="outfit">Compte de prélèvement</label>
              <div class="select-wrapper">
                <select [(ngModel)]="sourceAccountId" name="source" required>
                  @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.accountNumber }} — {{ a.balance | number:'1.3-3' }} TND</option> }
                </select>
              </div>
            </div>

            <div class="import-zone mb-3">
              <div class="import-header outfit">
                <h3>Importation intelligente</h3>
                <p>Automatisez la saisie via vos fichiers CSV ou PDF</p>
              </div>
              <div class="import-actions">
                <label class="btn btn-primary btn-sm">
                  <span>📥 Importer CSV</span>
                  <input type="file" accept=".csv,text/csv" (change)="onCsvSelected($event)" hidden>
                </label>
                <label class="btn btn-primary btn-sm">
                  <span>📄 Importer PDF</span>
                  <input type="file" accept="application/pdf,.pdf" (change)="onPdfSelected($event)" hidden>
                </label>
                <button type="button" class="btn btn-ghost btn-sm" (click)="downloadCsvTemplate()">Modèle CSV</button>
              </div>
            </div>

            <div class="section-head flex-between mb-2">
              <h3 class="outfit">Liste des bénéficiaires ({{ beneficiaries.length }})</h3>
              <button type="button" class="btn btn-accent btn-sm" (click)="addBeneficiary()">+ Ajouter manuellement</button>
            </div>

            <div class="beneficiary-list">
              <div class="beneficiary-header grid-header outfit">
                <span>Nom du bénéficiaire</span>
                <span>IBAN</span>
                <span>Montant (TND)</span>
                <span></span>
              </div>
              @for (b of beneficiaries; track $index) {
                <div class="beneficiary-row animate-in">
                  <input type="text" [(ngModel)]="b.beneficiaryName" [name]="'name'+$index" placeholder="Ex: Ahmed Ben Salah" class="premium-input" required>
                  <input type="text" [(ngModel)]="b.beneficiaryIban" [name]="'iban'+$index" placeholder="TN59..." class="premium-input iban-font" required>
                  <div class="amount-field">
                    <input type="number" [(ngModel)]="b.amount" [name]="'amt'+$index" step="0.001" min="0.001" placeholder="0.000" class="premium-input outfit" required>
                  </div>
                  <button type="button" class="btn-remove" (click)="removeBeneficiary($index)" aria-label="Supprimer">✕</button>
                </div>
              }
            </div>

            <div class="summary-footer mt-3">
              <div class="summary-item">
                <span class="label">Total à transférer</span>
                <span class="value outfit">{{ totalAmount() | number:'1.3-3' }} <small>TND</small></span>
              </div>
              <div class="summary-item">
                <span class="label">Nombre de transactions</span>
                <span class="value outfit">{{ beneficiaries.length }}</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg mt-2" [disabled]="loading() || !beneficiaries.length">
              {{ loading() ? 'Initialisation du transfert...' : 'Confirmer et envoyer' }}
            </button>
          </form>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .premium-card { padding: 2.5rem; border: 1px solid var(--gray-100); }
    
    .import-zone {
      padding: 1.5rem;
      background: var(--gray-50);
      border: 2px dashed var(--gray-200);
      border-radius: var(--radius);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .import-header h3 { font-size: 0.9rem; font-weight: 800; color: var(--primary); margin-bottom: 0.25rem; }
    .import-header p { font-size: 0.8rem; color: var(--gray-500); }
    .import-actions { display: flex; gap: 0.75rem; }

    .grid-header {
      display: grid;
      grid-template-columns: 1.5fr 2fr 1.2fr 40px;
      gap: 1rem;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--gray-400);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .beneficiary-row {
      display: grid;
      grid-template-columns: 1.5fr 2fr 1.2fr 40px;
      gap: 1rem;
      padding: 0.5rem 0;
      align-items: center;
    }

    .premium-input {
      width: 100%;
      background: white;
      border: 1px solid var(--gray-100);
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .premium-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.1); outline: none; }
    .iban-font { font-family: monospace; letter-spacing: 0.05em; }

    .btn-remove {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: none;
      background: var(--gray-100);
      color: var(--gray-400);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-remove:hover { background: var(--danger-light); color: var(--danger); }

    .summary-footer {
      background: var(--primary);
      color: white;
      padding: 1.5rem 2rem;
      border-radius: var(--radius);
      display: flex;
      gap: 3rem;
      box-shadow: var(--shadow-lg);
    }
    .summary-item { display: flex; flex-direction: column; }
    .summary-item .label { font-size: 0.7rem; color: var(--accent); font-weight: 700; text-transform: uppercase; }
    .summary-item .value { font-size: 1.5rem; font-weight: 700; }
    .summary-item .value small { font-size: 0.8rem; opacity: 0.7; }
  `]
})
export class GroupedTransferComponent implements OnInit {
  accounts = signal<BankAccount[]>([]);
  sourceAccountId: any = null;
  beneficiaries: Beneficiary[] = [{ beneficiaryName: '', beneficiaryIban: '', amount: null }];
  loading = signal(false);
  success = signal('');
  error = signal('');
  importMsg = signal('');

  navItems = CLIENT_NAV;
  constructor(private api: ApiService) { }

  ngOnInit() {
    this.api.getAccounts().subscribe({
      next: r => { if (r.data?.length) { this.accounts.set(r.data); this.sourceAccountId = r.data[0].id; } },
      error: () => { }
    });
  }

  addBeneficiary() { this.beneficiaries.push({ beneficiaryName: '', beneficiaryIban: '', amount: null }); }
  removeBeneficiary(i: number) { this.beneficiaries.splice(i, 1); }

  totalAmount(): number {
    return this.beneficiaries.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }

  downloadCsvTemplate() {
    const content = 'nom,iban,montant\nAhmed Ben Salah,TN5910006000000000001234,150.000\nFatma Trabelsi,TN5910006000000000005678,200.500\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'beneficiaires_modele.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = this.parseCsv(reader.result as string);
        this.applyImport(rows, 'CSV');
      } catch (e: any) {
        this.error.set('CSV invalide : ' + (e?.message || 'format incorrect'));
      }
    };
    reader.onerror = () => this.error.set('Impossible de lire le fichier CSV');
    reader.readAsText(file, 'utf-8');
    input.value = '';
  }

  async onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importMsg.set('Lecture du PDF en cours...');
    try {
      const text = await this.extractPdfText(file);
      const rows = this.parseCsv(text);
      this.applyImport(rows, 'PDF');
    } catch (e: any) {
      this.error.set('PDF invalide : ' + (e?.message || 'impossible d\'extraire les donnees'));
      this.importMsg.set('');
    }
    input.value = '';
  }

  private async extractPdfText(file: File): Promise<string> {
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer, disableWorker: true, isEvalSupported: false }).promise;
    const lines: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const rowsByY = new Map<number, string[]>();
      for (const item of content.items as any[]) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        if (!rowsByY.has(y)) rowsByY.set(y, []);
        rowsByY.get(y)!.push(item.str);
      }
      const sortedY = [...rowsByY.keys()].sort((a, b) => b - a);
      for (const y of sortedY) lines.push(rowsByY.get(y)!.join(' ').trim());
    }
    return lines.join('\n');
  }

  private parseCsv(text: string): Beneficiary[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (!lines.length) throw new Error('fichier vide');

    const splitLine = (line: string): string[] => {
      const parts = line.includes(';') && !line.includes(',') ? line.split(';') : line.split(/[,\t]/);
      return parts.map(p => p.trim().replace(/^"|"$/g, ''));
    };

    const first = splitLine(lines[0]).map(c => c.toLowerCase());
    const hasHeader = first.some(c => /nom|name|iban|montant|amount/.test(c));
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const beneficiaries: Beneficiary[] = [];
    for (const line of dataLines) {
      const cols = splitLine(line);
      if (cols.length < 3) continue;
      const amountRaw = cols[2].replace(/\s/g, '').replace(',', '.');
      const amount = Number(amountRaw);
      if (!cols[0] || !cols[1] || isNaN(amount) || amount <= 0) continue;
      beneficiaries.push({
        beneficiaryName: cols[0],
        beneficiaryIban: cols[1].replace(/\s/g, '').toUpperCase(),
        amount,
      });
    }
    if (!beneficiaries.length) throw new Error('aucune ligne valide trouvee');
    return beneficiaries;
  }

  private applyImport(rows: Beneficiary[], source: 'CSV' | 'PDF') {
    const empty = this.beneficiaries.length === 1
      && !this.beneficiaries[0].beneficiaryName
      && !this.beneficiaries[0].beneficiaryIban
      && !this.beneficiaries[0].amount;
    this.beneficiaries = empty ? rows : [...this.beneficiaries, ...rows];
    this.importMsg.set(`${rows.length} beneficiaire(s) importe(s) depuis le ${source}.`);
    this.error.set('');
    setTimeout(() => this.importMsg.set(''), 4000);
  }

  onSubmit() {
    if (!this.beneficiaries.length) { this.error.set('Ajoutez au moins un beneficiaire'); return; }
    this.loading.set(true); this.error.set(''); this.success.set('');
    this.api.groupedTransfer({ sourceAccountId: this.sourceAccountId, beneficiaries: this.beneficiaries }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Virement groupe initie avec succes.');
        this.beneficiaries = [{ beneficiaryName: '', beneficiaryIban: '', amount: null }];
      },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.message || 'Erreur'); }
    });
  }
}
