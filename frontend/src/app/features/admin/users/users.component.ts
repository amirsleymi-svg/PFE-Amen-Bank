import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ADMIN_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/api.models';
import { statusFr } from '../../../shared/display-labels';

@Component({
  selector: 'app-admin-users',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div>
            <h1 class="outfit">Répertoire des utilisateurs</h1>
            <p class="subtitle outfit">Gestion des accès, rôles et permissions administratives.</p>
          </div>
          <button class="btn btn-primary outfit" (click)="showCreate = !showCreate">
            {{ showCreate ? 'Fermer' : '+ Nouvel Utilisateur' }}
          </button>
        </div>

        @if (msg()) {
          <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div>
        }

        @if (showCreate) {
          <div class="card premium-card animate-in mb-3">
            <h3 class="outfit mb-2">Création de profil</h3>
            <form (ngSubmit)="onCreate()" class="premium-form">
              <div class="form-grid">
                <div class="form-group">
                  <label class="outfit">Prénom</label>
                  <input [(ngModel)]="newUser.firstName" name="fn" required class="premium-input" placeholder="Ex: Jean">
                </div>
                <div class="form-group">
                  <label class="outfit">Nom</label>
                  <input [(ngModel)]="newUser.lastName" name="ln" required class="premium-input" placeholder="Ex: Dupont">
                </div>
              </div>
              <div class="form-group mt-1">
                <label class="outfit">Adresse e-mail professionnelle</label>
                <input type="email" [(ngModel)]="newUser.email" name="email" required class="premium-input" placeholder="email@amenbank.com.tn">
              </div>
              <div class="form-grid mt-1">
                <div class="form-group">
                  <label class="outfit">Identifiant</label>
                  <input [(ngModel)]="newUser.username" name="un" required class="premium-input" placeholder="Identifiant unique">
                </div>
                <div class="form-group">
                  <label class="outfit">Téléphone</label>
                  <input [(ngModel)]="newUser.phone" name="phone" class="premium-input" placeholder="+216 XX XXX XXX">
                </div>
              </div>
              <div class="form-group mt-1">
                <label class="outfit">Rôle attribué</label>
                <select [(ngModel)]="newUser.role" name="role" required class="premium-select">
                  <option value="EMPLOYEE">Employé opérationnel</option>
                  @if (isRootAdmin()) { <option value="ADMIN">Administrateur système</option> }
                </select>
                <p class="form-hint">Un e-mail d'activation sera envoyé automatiquement au nouvel utilisateur.</p>
              </div>
              <button type="submit" class="btn btn-primary btn-block outfit mt-2">CONFIRMER LA CREATION</button>
            </form>
          </div>
        }

        @if (confirmDeleteUser()) {
          <div class="overlay animate-in" (click)="confirmDeleteUser.set(null)">
            <div class="dialog glass-style-dark" (click)="$event.stopPropagation()">
              <h3 class="outfit color-white">Suppression de Compte</h3>
              <p class="mb-2">Confirmez-vous la suppression de l'utilisateur <strong>{{ confirmDeleteUser()!.firstName }} {{ confirmDeleteUser()!.lastName }}</strong> ?</p>
              <div class="warning-box mb-2">
                <p class="size-xs text-danger uppercase font-bold">Action irréversible</p>
                <p class="size-xs color-gray-400">Toutes les données historiques et accès liés seront révoqués immédiatement.</p>
              </div>
              <div class="flex gap-1">
                <button class="btn btn-ghost" (click)="confirmDeleteUser.set(null)">Annuler</button>
                <button class="btn btn-danger" (click)="onConfirmDelete()" [disabled]="deleting()">
                  {{ deleting() ? 'Suppression...' : 'Confirmer la suppression' }}
                </button>
              </div>
            </div>
          </div>
        }

        @if (roleChangeUser()) {
          <div class="overlay animate-in" (click)="roleChangeUser.set(null)">
            <div class="dialog glass-style" (click)="$event.stopPropagation()">
              <h3 class="outfit">Modification de rôle</h3>
              <p class="mb-2">Utilisateur : <span class="font-bold">{{ roleChangeUser()!.firstName }} {{ roleChangeUser()!.lastName }}</span></p>
              <div class="form-group mb-2">
                <label class="outfit size-xs uppercase color-gray-400">Nouveau privilege</label>
                <select [(ngModel)]="selectedNewRole" class="premium-select">
                  <option value="CLIENT">Client standard</option>
                  <option value="EMPLOYEE">Employé de banque</option>
                  @if (isRootAdmin()) { <option value="ADMIN">Administrateur</option> }
                </select>
              </div>
              <div class="flex gap-1">
                <button class="btn btn-ghost" (click)="roleChangeUser.set(null)">Annuler</button>
                <button class="btn btn-primary" (click)="onConfirmRoleChange()" [disabled]="changingRole() || selectedNewRole === roleChangeUser()!.role">
                  {{ changingRole() ? 'Mise à jour...' : 'Confirmer le rôle' }}
                </button>
              </div>
            </div>
          </div>
        }

        <div class="card premium-card no-padding overflow-hidden">
          <div class="table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th class="outfit">Identité</th>
                  <th class="outfit">Coordonnées</th>
                  <th class="outfit">Rôle / Accès</th>
                  <th class="outfit">Statut</th>
                  <th class="outfit">Création</th>
                  <th class="outfit text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr class="animate-in">
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar outfit">{{ u.firstName[0] }}{{ u.lastName[0] }}</div>
                        <div class="user-info">
                          <span class="user-name">{{ u.firstName }} {{ u.lastName }}</span>
                          <span class="user-handle">{{ u.username }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span class="email">{{ u.email }}</span>
                        <span class="phone">{{ u.phone || '-' }}</span>
                      </div>
                    </td>
                    <td><span class="badge-role" [class]="'role-' + u.role.toLowerCase()">{{ roleLabel(u.role) }}</span></td>
                    <td>
                      <span class="status-indicator" [class]="'st-' + u.status.toLowerCase()">
                        <span class="dot"></span> {{ statusFr(u.status) }}
                      </span>
                    </td>
                    <td class="color-gray size-xs">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
                    <td>
                      <div class="flex gap-1 justify-end">
                        @if (canChangeRole(u)) {
                          <button class="btn btn-ghost btn-sm outfit font-bold" (click)="openRoleChange(u)">RÔLE</button>
                        }
                        @if (canDeleteUser(u)) {
                          <button class="btn btn-ghost btn-danger-text btn-sm" (click)="confirmDeleteUser.set(u)">x</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6"><div class="empty-state outfit">Aucun utilisateur trouve.</div></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .premium-card { border: 1px solid var(--gray-100); box-shadow: var(--shadow); }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { background: var(--gray-50); padding: 1.25rem; font-size: 0.7rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; border-bottom: 2px solid var(--gray-100); text-align: left; }
    .premium-table td { padding: 1.25rem; border-bottom: 1px solid var(--gray-50); vertical-align: middle; }
    .user-cell, .contact-cell { display: flex; flex-direction: column; gap: 0.25rem; }
    .user-cell { flex-direction: row; align-items: center; gap: 0.75rem; }
    .user-avatar { width: 36px; height: 36px; border-radius: 12px; background: var(--primary); color: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 800; }
    .user-name, .email { font-weight: 700; color: var(--primary); }
    .user-handle, .phone { font-size: 0.75rem; color: var(--gray-400); }
    .badge-role, .status-indicator { font-size: 0.7rem; font-weight: 800; padding: 0.25rem 0.7rem; border-radius: 999px; text-transform: uppercase; }
    .role-admin { background: var(--danger-light); color: var(--danger); }
    .role-employee { background: var(--info-light); color: var(--info); }
    .role-client { background: var(--success-light); color: var(--success); }
    .status-indicator { background: var(--gray-100); color: var(--gray-600); display: inline-flex; align-items: center; gap: 0.4rem; }
    .dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }
    .btn-danger-text { color: var(--danger) !important; }
    .glass-style, .glass-style-dark { border-radius: var(--radius-lg); padding: 2rem; max-width: 520px; }
    .glass-style-dark { background: var(--primary); color: white; border: 1px solid var(--primary-light); }
    .warning-box { background: rgba(231, 76, 60, 0.15); border: 1px solid var(--danger); padding: 1rem; border-radius: var(--radius); }
    .empty-state { padding: 3rem; text-align: center; color: var(--gray-400); }
    @media (max-width: 800px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  msg = signal('');
  isError = signal(false);
  showCreate = false;
  confirmDeleteUser = signal<User | null>(null);
  deleting = signal(false);
  roleChangeUser = signal<User | null>(null);
  selectedNewRole = '';
  changingRole = signal(false);
  newUser: any = { firstName: '', lastName: '', email: '', username: '', phone: '', role: 'EMPLOYEE' };

  navItems = ADMIN_NAV;
  statusFr = statusFr;
  constructor(private api: ApiService, private auth: AuthService) {}

  isRootAdmin() { return !!this.auth.user()?.rootAdmin; }
  isSelf(u: User) { return this.auth.user()?.id === u.id; }
  canManageAdminTargets() { return this.isRootAdmin(); }
  canChangeRole(u: User) { return !this.isSelf(u) && (this.canManageAdminTargets() || u.role !== 'ADMIN'); }
  canDeleteUser(u: User) { return !this.isSelf(u) && (this.canManageAdminTargets() || u.role !== 'ADMIN'); }

  ngOnInit() { this.load(); }

  load() {
    this.api.getUsers().subscribe({
      next: r => { if (r.data?.content) this.users.set(r.data.content); },
      error: () => {}
    });
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'CLIENT': return 'Client';
      case 'EMPLOYEE': return 'Employé';
      case 'ADMIN': return 'Administrateur';
      default: return role;
    }
  }

  showMsg(text: string, error = false) {
    this.msg.set(text);
    this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  onCreate() {
    this.api.createUser(this.newUser).subscribe({
      next: () => {
        this.showMsg('Utilisateur créé. Un e-mail d\'activation lui a été envoyé.');
        this.showCreate = false;
        this.newUser = { firstName: '', lastName: '', email: '', username: '', phone: '', role: 'EMPLOYEE' };
        this.load();
      },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  openRoleChange(user: User) {
    if (!this.canChangeRole(user)) {
      this.showMsg('Vous n\'avez pas les droits pour changer ce rôle', true);
      return;
    }
    this.roleChangeUser.set(user);
    this.selectedNewRole = user.role;
  }

  onConfirmRoleChange() {
    const user = this.roleChangeUser();
    if (!user || this.selectedNewRole === user.role) return;
    this.changingRole.set(true);
    this.api.changeUserRole(user.id, this.selectedNewRole).subscribe({
      next: () => {
        this.changingRole.set(false);
        this.roleChangeUser.set(null);
        this.showMsg(`Rôle de ${user.firstName} ${user.lastName} changé en ${this.roleLabel(this.selectedNewRole)}`);
        this.load();
      },
      error: (e) => {
        this.changingRole.set(false);
        this.roleChangeUser.set(null);
        this.showMsg(e.error?.message || 'Erreur lors du changement de rôle', true);
      }
    });
  }

  onConfirmDelete() {
    const user = this.confirmDeleteUser();
    if (!user) return;
    this.deleting.set(true);
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDeleteUser.set(null);
        this.showMsg(`Utilisateur ${user.firstName} ${user.lastName} supprimé`);
        this.load();
      },
      error: (e) => {
        this.deleting.set(false);
        this.confirmDeleteUser.set(null);
        this.showMsg(e.error?.message || 'Erreur lors de la suppression', true);
      }
    });
  }
}
