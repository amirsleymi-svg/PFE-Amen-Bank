import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-users',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="[]" />
      <main class="main-content">
        <div class="page-header flex-between">
          <div><h1>Gestion des utilisateurs</h1></div>
          <button class="btn btn-primary" (click)="showCreate = !showCreate">+ Nouveau</button>
        </div>
        @if (msg()) { <div class="alert" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }
        @if (showCreate) {
          <div class="card mb-3" style="max-width:500px;">
            <h3 class="mb-2">Creer un utilisateur</h3>
            <form (ngSubmit)="onCreate()">
              <div class="grid-2">
                <div class="form-group"><label>Prenom</label><input [(ngModel)]="newUser.firstName" name="fn" required></div>
                <div class="form-group"><label>Nom</label><input [(ngModel)]="newUser.lastName" name="ln" required></div>
              </div>
              <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="newUser.email" name="email" required></div>
              <div class="form-group"><label>Identifiant</label><input [(ngModel)]="newUser.username" name="un" required></div>
              <div class="form-group"><label>Mot de passe</label><input type="password" [(ngModel)]="newUser.password" name="pw" required></div>
              <div class="form-group">
                <label>Telephone</label><input [(ngModel)]="newUser.phone" name="phone" placeholder="+216 XX XXX XXX">
              </div>
              <div class="form-group">
                <label>Role</label>
                <select [(ngModel)]="newUser.role" name="role" required>
                  <option value="CLIENT">Client</option><option value="EMPLOYEE">Employe</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Creer</button>
            </form>
          </div>
        }

        <!-- Confirm delete dialog -->
        @if (confirmDeleteUser()) {
          <div class="overlay" (click)="confirmDeleteUser.set(null)">
            <div class="dialog" (click)="$event.stopPropagation()">
              <h3>Confirmer la suppression</h3>
              <p>Etes-vous sur de vouloir supprimer l'utilisateur <strong>{{ confirmDeleteUser()!.firstName }} {{ confirmDeleteUser()!.lastName }}</strong> ({{ confirmDeleteUser()!.role }}) ?</p>
              <p style="color: var(--danger, #e74c3c); font-size: 0.85rem;">Cette action est irreversible. Toutes les donnees associees seront supprimees.</p>
              <div class="flex gap-1" style="margin-top: 1rem;">
                <button class="btn btn-secondary" (click)="confirmDeleteUser.set(null)">Annuler</button>
                <button class="btn btn-danger" (click)="onConfirmDelete()" [disabled]="deleting()">
                  {{ deleting() ? 'Suppression...' : 'Supprimer' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Confirm role change dialog -->
        @if (roleChangeUser()) {
          <div class="overlay" (click)="roleChangeUser.set(null)">
            <div class="dialog" (click)="$event.stopPropagation()">
              <h3>Changer le role</h3>
              <p>Utilisateur : <strong>{{ roleChangeUser()!.firstName }} {{ roleChangeUser()!.lastName }}</strong></p>
              <p>Role actuel : <span class="badge badge-info">{{ roleChangeUser()!.role }}</span></p>
              <div class="form-group" style="margin-top: 1rem;">
                <label>Nouveau role</label>
                <select [(ngModel)]="selectedNewRole" class="role-select">
                  <option value="CLIENT">Client</option>
                  <option value="EMPLOYEE">Employe</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <div class="flex gap-1" style="margin-top: 1rem;">
                <button class="btn btn-secondary" (click)="roleChangeUser.set(null)">Annuler</button>
                <button class="btn btn-primary" (click)="onConfirmRoleChange()"
                        [disabled]="changingRole() || selectedNewRole === roleChangeUser()!.role">
                  {{ changingRole() ? 'Changement...' : 'Confirmer' }}
                </button>
              </div>
            </div>
          </div>
        }

        <div class="card">
          <div class="table-container">
            <table>
              <thead><tr><th>Nom</th><th>Email</th><th>Role</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>{{ u.firstName }} {{ u.lastName }}</td>
                    <td>{{ u.email }}</td>
                    <td>
                      <span class="badge" [class.badge-info]="u.role==='CLIENT'" [class.badge-warning]="u.role==='EMPLOYEE'" [class.badge-admin]="u.role==='ADMIN'">{{ roleLabel(u.role) }}</span>
                    </td>
                    <td><span class="badge" [class.badge-success]="u.status==='ACTIVE'" [class.badge-warning]="u.status==='PENDING'" [class.badge-danger]="u.status==='DISABLED'||u.status==='LOCKED'">{{ u.status }}</span></td>
                    <td>{{ u.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="flex gap-1">
                      @if (u.role !== 'ADMIN') {
                        <button class="btn btn-outline btn-sm" (click)="openRoleChange(u)">Role</button>
                      }
                      @if (u.status !== 'ACTIVE') { <button class="btn btn-primary btn-sm" (click)="activate(u.id)">Activer</button> }
                      @if (u.status === 'ACTIVE') { <button class="btn btn-secondary btn-sm" (click)="deactivate(u.id)">Desactiver</button> }
                      @if (u.role !== 'ADMIN') {
                        <button class="btn btn-danger btn-sm" (click)="confirmDeleteUser.set(u)">Supprimer</button>
                      }
                    </td>
                  </tr>
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
    }
    .dialog {
      background: #fff; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .dialog h3 { margin: 0 0 0.75rem; }
    .dialog p { margin: 0 0 0.5rem; }
    .btn-danger { background: var(--danger, #e74c3c); color: #fff; border: none; }
    .btn-danger:hover:not(:disabled) { opacity: 0.9; }
    .btn-outline {
      background: transparent; color: var(--primary, #003D6E);
      border: 1px solid var(--primary, #003D6E); border-radius: 6px;
    }
    .btn-outline:hover { background: var(--primary, #003D6E); color: #fff; }
    .badge-admin { background: #8e44ad; color: #fff; }
    .role-select {
      width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #ddd;
      border-radius: 8px; font-size: 0.95rem;
    }
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
  newUser: any = { firstName: '', lastName: '', email: '', username: '', password: '', phone: '', role: 'CLIENT' };

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getUsers().subscribe(r => {
      if (r.data?.content) this.users.set(r.data.content);
    });
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'CLIENT': return 'Client';
      case 'EMPLOYEE': return 'Employe';
      case 'ADMIN': return 'Admin';
      default: return role;
    }
  }

  showMsg(text: string, error = false) {
    this.msg.set(text);
    this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  activate(id: number) {
    this.api.activateUser(id).subscribe(() => { this.showMsg('Utilisateur active'); this.load(); });
  }

  deactivate(id: number) {
    this.api.deactivateUser(id).subscribe(() => { this.showMsg('Utilisateur desactive'); this.load(); });
  }

  onCreate() {
    this.api.createUser(this.newUser).subscribe({
      next: () => {
        this.showMsg('Utilisateur cree avec succes');
        this.showCreate = false;
        this.newUser = { firstName: '', lastName: '', email: '', username: '', password: '', phone: '', role: 'CLIENT' };
        this.load();
      },
      error: (e) => this.showMsg(e.error?.message || 'Erreur', true)
    });
  }

  openRoleChange(user: User) {
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
        this.showMsg(`Role de ${user.firstName} ${user.lastName} change en ${this.roleLabel(this.selectedNewRole)}`);
        this.load();
      },
      error: (e) => {
        this.changingRole.set(false);
        this.roleChangeUser.set(null);
        this.showMsg(e.error?.message || 'Erreur lors du changement de role', true);
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
        this.showMsg(`Utilisateur ${user.firstName} ${user.lastName} supprime`);
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
