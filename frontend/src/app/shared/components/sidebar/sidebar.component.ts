import { Component, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../logo/logo.component';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <button type="button" class="mobile-toggle" (click)="toggle()" [attr.aria-expanded]="open()" aria-label="Menu">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>

    @if (open()) {
      <div class="sidebar-backdrop" (click)="close()"></div>
    }

    <aside class="sidebar" [class.open]="open()">
      <div class="sidebar-header">
        <div class="logo-area">
          <app-logo [size]="32" variant="light" />
        </div>
        <div class="user-card premium-card">
          <div class="user-avatar">{{ initials() }}</div>
          <div class="user-details">
            <div class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
            <div class="user-role">{{ roleLabel() }}</div>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        @for (item of items(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" (click)="close()">
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>
      <div class="sidebar-footer">
        <a class="nav-item logout" (click)="auth.logout()">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span class="nav-label">Déconnexion</span>
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .logo-area { 
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      margin-bottom: 1.5rem;
    }
    .user-card {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%); 
      border-radius: var(--radius);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .user-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--accent); color: var(--primary-dark);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(197, 160, 89, 0.2);
    }
    .user-details { min-width: 0; }
    .user-name {
      font-size: 0.9rem; font-weight: 600; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: 'Outfit', sans-serif;
    }
    .user-role { 
      font-size: 0.7rem; color: var(--accent); 
      font-weight: 700; margin-top: 2px; 
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .nav-icon {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; flex-shrink: 0;
      font-size: 1.1rem;
    }
    .nav-label { font-size: 0.9rem; font-weight: 500; }
    .logout { cursor: pointer; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 0.5rem; padding-top: 1rem !important; }
    .logout:hover { color: var(--danger) !important; background: rgba(239, 68, 68, 0.05) !important; }

    /* Mobile hamburger */
    .mobile-toggle {
      display:none;
      position:fixed; top:1rem; left:1rem; z-index:110;
      width:44px; height:44px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);
      background: var(--primary-dark); color:#fff; cursor:pointer;
      flex-direction:column; align-items:center; justify-content:center; gap:5px;
      box-shadow: var(--shadow-lg);
    }
    .mobile-toggle .bar { width:22px; height:2px; background: var(--accent); border-radius:2px; }
    .sidebar-backdrop {
      display:none;
      position:fixed; inset:0; background:rgba(2, 12, 27, 0.7); 
      backdrop-filter: blur(4px); z-index:95;
    }

    @media (max-width: 900px) {
      .mobile-toggle { display:flex; }
      .sidebar-backdrop { display:block; }
    }
  `]
})
export class SidebarComponent {
  items = input<NavItem[]>([]);
  open = signal(false);

  constructor(public auth: AuthService, private router: Router) {
    this.router.events.subscribe(e => { if (e instanceof NavigationEnd) this.open.set(false); });
  }

  toggle() { this.open.update(v => !v); }
  close() { this.open.set(false); }

  initials(): string {
    const u = this.auth.user();
    if (!u) return '';
    return (u.firstName?.[0] || '') + (u.lastName?.[0] || '');
  }

  roleLabel(): string {
    switch (this.auth.user()?.role) {
      case 'CLIENT': return 'Client';
      case 'EMPLOYEE': return 'Employe';
      case 'ADMIN': return 'Administrateur';
      default: return '';
    }
  }
}
