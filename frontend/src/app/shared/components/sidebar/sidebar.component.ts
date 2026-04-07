import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">Amen Bank</div>
        <div class="user-info">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
        <div class="user-info" style="font-size: 0.75rem; opacity: 0.6;">{{ auth.user()?.role }}</div>
      </div>
      <nav class="sidebar-nav">
        @for (item of items(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
      <div class="sidebar-footer">
        <a class="nav-item" (click)="auth.logout()" style="cursor:pointer">
          <span>🚪</span>
          <span>Deconnexion</span>
        </a>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  items = input<NavItem[]>([]);
  constructor(public auth: AuthService) {}
}
