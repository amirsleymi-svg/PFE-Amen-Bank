import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { SecurityIncident, SuspiciousUser, BlockedIp } from '../../../core/models/api.models';
import { securityActionFr, statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-admin-security',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header">
          <h1>Sécurité — accès non autorisés</h1>
          <p class="subtitle">Détectez les tentatives d'accès suspectes et bloquez les comptes concernés.</p>
        </div>

        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi kpi-total"><span class="kpi-label">Incidents (24h)</span><span class="kpi-value">{{ incidents().length }}</span></div>
          <div class="kpi kpi-failed"><span class="kpi-label">Connexions rejetées</span><span class="kpi-value">{{ failedCount() }}</span></div>
          <div class="kpi kpi-unauth"><span class="kpi-label">Tokens invalides</span><span class="kpi-value">{{ unauthorizedCount() }}</span></div>
          <div class="kpi kpi-suspects"><span class="kpi-label">Comptes suspects</span><span class="kpi-value">{{ suspects().length }}</span></div>
          <div class="kpi kpi-blocked"><span class="kpi-label">IP bloquees</span><span class="kpi-value">{{ blockedIps().length }}</span></div>
        </div>

        <!-- Suspects card -->
        <div class="card">
          <div class="card-head">
            <div>
              <h3 style="margin:0;">Comptes suspects</h3>
              <p class="muted">Utilisateurs ayant franchi le seuil d'incidents sur la fenêtre sélectionnée.</p>
            </div>
            <div class="filters">
              <label>Fenêtre (h)
                <input type="number" [(ngModel)]="hours" min="1" max="168" (ngModelChange)="load()">
              </label>
              <label>Seuil
                <input type="number" [(ngModel)]="threshold" min="1" max="50" (ngModelChange)="load()">
              </label>
              <button class="btn btn-secondary" (click)="load()">Actualiser</button>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Adresse e-mail</th>
                  <th>Statut</th>
                  <th class="text-right">Connexions rejetées</th>
                  <th class="text-right">Accès non autorisés</th>
                  <th>Dernière tentative</th>
                  <th>IP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (s of suspects(); track s.userId) {
                  <tr [class.row-critical]="totalIncidents(s) >= 10">
                    <td>{{ s.username }}</td>
                    <td>{{ s.email }}</td>
                    <td>
                      <span class="badge"
                        [class.badge-success]="s.status==='ACTIVE'"
                        [class.badge-warning]="s.status==='LOCKED'"
                        [class.badge-danger]="s.status==='DISABLED'"
                        [class.badge-info]="s.status==='ANONYMOUS'">{{ statusFr(s.status) }}</span>
                    </td>
                    <td class="text-right">{{ s.failedLoginCount }}</td>
                    <td class="text-right danger">{{ s.unauthorizedCount }}</td>
                    <td>{{ s.lastIncidentAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td><code>{{ s.lastIp || '—' }}</code></td>
                    <td>
                      @if (s.userId && s.status !== 'DISABLED') {
                        <button class="btn btn-danger btn-sm" (click)="block(s)" [disabled]="blocking() === s.userId">
                          {{ blocking() === s.userId ? 'Blocage...' : '🛑 Bloquer' }}
                        </button>
                      } @else if (s.status === 'DISABLED') {
                        <span class="muted">Déjà bloqué</span>
                      } @else if (s.status === 'ANONYMOUS') {
                        @if (s.lastIp && !isIpBlocked(s.lastIp)) {
                          <button class="btn btn-danger btn-sm" (click)="blockIpFromSuspect(s)" [disabled]="blockingIp() === s.lastIp">
                            {{ blockingIp() === s.lastIp ? 'Blocage...' : '🛑 Bloquer IP' }}
                          </button>
                        } @else if (s.lastIp && isIpBlocked(s.lastIp)) {
                          <span class="muted">IP déjà bloquée</span>
                        } @else {
                          <span class="muted">IP inconnue</span>
                        }
                      } @else {
                        <span class="muted">—</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="text-center" style="padding:1.5rem;color:#9ca3af;">Aucun compte suspect sur la fenêtre sélectionnée.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Blocked IPs card -->
        <div class="card" style="margin-top:1.25rem;">
          <div class="card-head">
            <div>
              <h3 style="margin:0;">Adresses IP bloquées</h3>
              <p class="muted">Les requêtes provenant de ces IP sont rejetées avant authentification.</p>
            </div>
            <form class="ip-form" (submit)="submitManualBlock($event)">
              <input type="text" [(ngModel)]="newIp" name="newIp" placeholder="IP (ex: 192.168.1.10)" required>
              <input type="text" [(ngModel)]="newIpReason" name="newIpReason" placeholder="Motif (optionnel)">
              <button type="submit" class="btn btn-danger btn-sm" [disabled]="blockingIp() === newIp">
                {{ blockingIp() === newIp ? 'Blocage...' : '🛑 Bloquer IP' }}
              </button>
            </form>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Motif</th>
                  <th>Bloquée par</th>
                  <th>Le</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (b of blockedIps(); track b.id) {
                  <tr>
                    <td><code>{{ b.ipAddress }}</code></td>
                    <td>{{ b.reason || '—' }}</td>
                    <td>{{ b.blockedByName || '—' }}</td>
                    <td>{{ b.blockedAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" (click)="unblockIp(b)" [disabled]="unblocking() === b.id">
                        {{ unblocking() === b.id ? 'Déblocage...' : 'Débloquer' }}
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-center" style="padding:1.5rem;color:#9ca3af;">Aucune IP bloquée.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Incidents log -->
        <div class="card" style="margin-top:1.25rem;">
          <div class="card-head">
            <h3 style="margin:0;">Journal des incidents</h3>
            <p class="muted">Événements de sécurité récents triés du plus récent au plus ancien.</p>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Utilisateur</th>
                  <th>IP</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                @for (i of incidents(); track i.id) {
                  <tr>
                    <td>{{ i.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td><span class="action-chip" [class]="'chip-' + i.action">{{ securityActionFr(i.action) }}</span></td>
                    <td>{{ i.userEmail || '(anonyme)' }}</td>
                    <td><code>{{ i.ipAddress || '—' }}</code></td>
                    <td class="details-cell" [title]="i.details">{{ i.details }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-center" style="padding:1.5rem;color:#9ca3af;">Aucun incident</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .subtitle { color:#6b7280; font-size:0.9rem; margin:0.25rem 0 0; }
    .muted { color:#9ca3af; font-size:0.85rem; margin:0.2rem 0 0; }

    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:0.75rem; margin-bottom:1.25rem; }
    .kpi { background:#fff; border:1px solid #e5e7eb; border-left:4px solid #6b7280; border-radius:10px; padding:0.85rem 1rem; display:flex; flex-direction:column; gap:0.2rem; }
    .kpi-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; font-weight:600; }
    .kpi-value { font-size:1.35rem; font-weight:700; color:#111827; }
    .kpi-total { border-left-color:#3b82f6; }
    .kpi-failed { border-left-color:#f59e0b; }
    .kpi-unauth { border-left-color:#dc2626; }
    .kpi-suspects { border-left-color:#7c3aed; }
    .kpi-blocked { border-left-color:#991b1b; }

    .card-head { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem; margin-bottom:0.85rem; }
    .filters { display:flex; gap:0.6rem; align-items:flex-end; }
    .filters label { display:flex; flex-direction:column; font-size:0.7rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.03em; }
    .filters input { width:80px; padding:0.4rem 0.55rem; border:1px solid #d1d5db; border-radius:6px; margin-top:0.15rem; font-size:0.9rem; }

    .text-right { text-align:right; }
    .danger { color:#dc2626; font-weight:600; }
    .row-critical { background:#fef2f2; }

    .action-chip {
      display:inline-block; padding:0.15rem 0.55rem; border-radius:6px;
      font-size:0.7rem; font-weight:600; letter-spacing:0.03em;
      background:#f3f4f6; color:#374151;
    }
    .chip-LOGIN_FAILED { background:#fef3c7; color:#92400e; }
    .chip-UNAUTHORIZED_ACCESS { background:#fee2e2; color:#991b1b; }
    .chip-ACCOUNT_LOCKED { background:#e0e7ff; color:#3730a3; }
    .chip-BLOCK_SUSPICIOUS_USER { background:#ede9fe; color:#5b21b6; }
    .chip-LOGIN_BLOCKED_LOCKED, .chip-LOGIN_BLOCKED_DISABLED { background:#fee2e2; color:#991b1b; }

    .details-cell { max-width:380px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.82rem; color:#4b5563; }
    code { font-family:monospace; font-size:0.8rem; background:#f3f4f6; padding:0.05rem 0.35rem; border-radius:4px; color:#374151; }

    .btn-sm { padding:0.35rem 0.7rem; font-size:0.78rem; }
    .btn-danger { background:#dc2626; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; }
    .btn-danger:hover:not(:disabled) { background:#b91c1c; }
    .btn-danger:disabled { opacity:0.55; cursor:not-allowed; }
    .btn-secondary { background:#f3f4f6; color:#374151; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; font-weight:600; padding:0.35rem 0.7rem; font-size:0.78rem; }
    .btn-secondary:hover:not(:disabled) { background:#e5e7eb; }
    .btn-secondary:disabled { opacity:0.55; cursor:not-allowed; }

    .ip-form { display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; }
    .ip-form input { padding:0.4rem 0.6rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.85rem; }
    .ip-form input[name="newIp"] { width:180px; font-family:monospace; }
    .ip-form input[name="newIpReason"] { width:220px; }
  `]
})
export class AdminSecurityComponent implements OnInit {
  hours = 24;
  threshold = 3;
  newIp = '';
  newIpReason = '';
  incidents = signal<SecurityIncident[]>([]);
  suspects = signal<SuspiciousUser[]>([]);
  blockedIps = signal<BlockedIp[]>([]);
  blocking = signal<number | null>(null);
  blockingIp = signal<string | null>(null);
  unblocking = signal<number | null>(null);
  success = signal('');
  error = signal('');
  navItems = ADMIN_NAV;
  statusFr = statusFr;
  securityActionFr = securityActionFr;

  failedCount = computed(() =>
    this.incidents().filter(i => i.action === 'LOGIN_FAILED').length);
  unauthorizedCount = computed(() =>
    this.incidents().filter(i => i.action === 'UNAUTHORIZED_ACCESS').length);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getSecurityIncidents(0, 100).subscribe({
      next: r => { if (r.data?.content) this.incidents.set(r.data.content); },
      error: () => this.incidents.set([])
    });
    this.api.getSuspiciousUsers(this.hours, this.threshold).subscribe({
      next: r => { if (r.data) this.suspects.set(r.data); },
      error: () => this.suspects.set([])
    });
    this.api.getBlockedIps().subscribe({
      next: r => { if (r.data) this.blockedIps.set(r.data); },
      error: () => this.blockedIps.set([])
    });
  }

  isIpBlocked(ip: string): boolean {
    return this.blockedIps().some(b => b.ipAddress === ip && b.active);
  }

  totalIncidents(s: SuspiciousUser): number {
    return (s.failedLoginCount || 0) + (s.unauthorizedCount || 0);
  }

  flash(ok = '', err = '') {
    this.success.set(ok);
    this.error.set(err);
    setTimeout(() => { this.success.set(''); this.error.set(''); }, 4000);
  }

  block(s: SuspiciousUser) {
    if (!s.userId) return;
    const reason = prompt(`Bloquer ${s.email} ?\nMotif (optionnel) :`, 'Tentatives d\'accès non autorisées');
    if (reason === null) return;
    this.blocking.set(s.userId);
    this.api.blockSuspiciousUser(s.userId, reason).subscribe({
      next: () => {
        this.blocking.set(null);
        this.flash(`Compte ${s.email} bloqué avec succès.`);
        this.load();
      },
      error: e => {
        this.blocking.set(null);
        this.flash('', e?.error?.message || 'Impossible de bloquer ce compte.');
      }
    });
  }

  blockIpFromSuspect(s: SuspiciousUser) {
    if (!s.lastIp) return;
    const reason = prompt(`Bloquer l'adresse IP ${s.lastIp} ?\nMotif :`, 'Tentatives d\'accès anonymes non autorisées');
    if (reason === null) return;
    this.doBlockIp(s.lastIp, reason);
  }

  submitManualBlock(event: Event) {
    event.preventDefault();
    const ip = this.newIp.trim();
    if (!ip) return;
    this.doBlockIp(ip, this.newIpReason.trim() || 'Blocage manuel par administrateur');
  }

  private doBlockIp(ip: string, reason: string) {
    this.blockingIp.set(ip);
    this.api.blockIp(ip, reason).subscribe({
      next: () => {
        this.blockingIp.set(null);
        this.newIp = '';
        this.newIpReason = '';
        this.flash(`IP ${ip} bloquée avec succès.`);
        this.load();
      },
      error: e => {
        this.blockingIp.set(null);
        this.flash('', e?.error?.message || 'Impossible de bloquer cette IP.');
      }
    });
  }

  unblockIp(b: BlockedIp) {
    if (!confirm(`Débloquer l'IP ${b.ipAddress} ?`)) return;
    this.unblocking.set(b.id);
    this.api.unblockIp(b.id).subscribe({
      next: () => {
        this.unblocking.set(null);
        this.flash(`IP ${b.ipAddress} débloquée.`);
        this.load();
      },
      error: e => {
        this.unblocking.set(null);
        this.flash('', e?.error?.message || 'Impossible de débloquer cette IP.');
      }
    });
  }
}
