import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Notification } from '../../../core/models/api.models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <header class="navbar glass-style">
      <div class="nav-left">
        <h2 class="outfit current-page-title">{{ getPageTitle() }}</h2>
      </div>
      <div class="nav-right">
        <div class="notification-wrapper">
          <button class="notif-btn" (click)="toggleDropdown()" [class.has-unread]="unreadCount() > 0" [attr.aria-label]="getAriaLabel()">
            <span class="bell-icon">
              @if (isClient()) { 🔔 }
              @else {
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-top: -4px;">
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              }
            </span>
            @if (unreadCount() > 0) {
              <span class="badge pulse-animation">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
            }
          </button>

          @if (showDropdown()) {
            <div class="notif-dropdown animate-in shadow-premium" [class.alert-mode]="isStaff()">
              <div class="dropdown-header">
                <h3 class="outfit">{{ getNotifTitle() }}</h3>
                <div class="header-actions">
                  <button class="mark-all-btn outfit" (click)="markAllRead()" [disabled]="unreadCount() === 0">
                    Tout marquer lu
                  </button>
                  <button class="clear-all-btn outfit" (click)="deleteAll()" [disabled]="notifications().length === 0">
                    Nettoyer tout
                  </button>
                </div>
              </div>
              <div class="dropdown-body">
                @if (loading()) {
                  <div class="notif-loading"><span class="spinner"></span></div>
                } @else if (notifications().length === 0) {
                  <div class="notif-empty outfit">Aucune {{ isClient() ? 'notification' : 'alerte' }}</div>
                } @else {
                  @for (n of notifications(); track n.id) {
                    <div class="notif-item" [class.unread]="!n.isRead" [class.staff-alert]="isStaff()" [class.email-notif]="isEmailService(n)" (click)="acknowledgeNotif(n)">
                      <div class="notif-dot" [class]="'priority-' + priorityClass(n)"></div>
                      <div class="notif-main">
                        <div class="notif-title outfit">
                          {{ n.title }}
                          @if (isEmailService(n)) { <span class="service-tag">Email Service</span> }
                        </div>
                        <div class="notif-msg outfit">{{ n.message }}</div>
                        <div class="notif-time outfit">{{ n.createdAt | date:'shortTime' }}</div>
                      </div>
                      <button class="delete-notif-btn" (click)="deleteNotif($event, n.id)" title="Supprimer uniquement cette notification">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </div>
                  }
                }
              </div>
              @if (isClient()) {
                <div class="dropdown-footer">
                  <a routerLink="/client/notifications" (click)="showDropdown.set(false)" class="outfit">Voir toutes les notifications</a>
                </div>
              } @else {
                <div class="dropdown-footer staff-footer outfit">
                  Espace alertes dédié
                </div>
              }
            </div>
            <div class="dropdown-overlay" (click)="showDropdown.set(false)"></div>
          }
        </div>
        
        <div class="nav-divider"></div>
        
        <div class="user-pill outfit">
          <span class="user-name">{{ auth.user()?.firstName }}</span>
          <div class="user-avatar-mini">{{ initials() }}</div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 70px;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      position: sticky;
      top: 1rem;
      z-index: 90;
    }
    .notif-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      position: relative;
      padding: 8px;
      border-radius: 12px;
      transition: background 0.2s;
    }
    .notif-btn:hover { background: rgba(0,0,0,0.05); }
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #ff4d4f;
      color: white;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      border: 2px solid white;
    }
    .pulse-animation {
      animation: pulse-red 2s infinite;
    }
    @keyframes pulse-red {
      0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(255, 77, 79, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
    }
    .notif-dropdown {
      position: absolute;
      top: 60px;
      right: 0;
      width: 350px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      border: 1px solid var(--gray-100);
      overflow: hidden;
      z-index: 101;
    }
    .notif-dropdown.alert-mode { border-top: 3px solid var(--danger); }
    .dropdown-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-50);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dropdown-header h3 { font-size: 1rem; margin: 0; }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }
    .mark-all-btn, .clear-all-btn { background: none; border: none; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
    .mark-all-btn { color: var(--accent); }
    .clear-all-btn { color: var(--danger); opacity: 0.8; }
    .mark-all-btn:hover, .clear-all-btn:hover { opacity: 1; text-decoration: underline; }
    .mark-all-btn:disabled, .clear-all-btn:disabled { opacity: 0.3; cursor: not-allowed; text-decoration: none; }
    .dropdown-body { max-height: 400px; overflow-y: auto; }
    .notif-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-50);
      display: flex;
      gap: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }
    .notif-item:hover .delete-notif-btn { opacity: 1; }
    .delete-notif-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      color: var(--gray-400);
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      transition: all 0.2s;
      cursor: pointer;
    }
    .delete-notif-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
      opacity: 1;
    }
    .notif-item:hover { background: var(--gray-50); }
    .notif-item.unread { background: rgba(0, 61, 110, 0.02); }
    .notif-item.staff-alert.unread { background: rgba(239, 68, 68, 0.035); }
    .notif-item.email-notif.unread { background: rgba(197, 160, 89, 0.04); }
    .notif-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: var(--gray-300); }
    .notif-dot.priority-high { background: var(--danger); box-shadow: 0 0 5px var(--danger); }
    .notif-dot.priority-critical { background: var(--danger); box-shadow: 0 0 0 3px var(--danger-light); }
    .notif-dot.priority-normal { background: var(--accent); }
    .notif-dot.priority-email { background: var(--accent); }
    .notif-main { flex: 1; min-width: 0; }
    .notif-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; }
    .service-tag { font-size: 0.6rem; background: var(--primary); color: var(--accent); padding: 1px 4px; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
    .notif-msg { font-size: 0.8rem; color: var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-time { font-size: 0.7rem; color: var(--gray-400); margin-top: 4px; }
    .dropdown-footer { padding: 0.75rem; text-align: center; border-top: 1px solid var(--gray-50); }
    .dropdown-footer a { color: var(--primary); font-size: 0.8rem; font-weight: 700; text-decoration: none; }
    .staff-footer { color: var(--gray-500); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .user-pill {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.4rem 0.4rem 0.4rem 1rem;
      background: var(--gray-50); border-radius: 100px;
      border: 1px solid var(--gray-100);
    }
    .user-name { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
    .user-avatar-mini {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--primary); color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 800;
    }
    .shadow-premium { box-shadow: 0 15px 50px rgba(0,0,0,0.12); }
    .current-page-title { font-size: 1.1rem; color: var(--primary); margin: 0; font-weight: 800; }
  `]
})
export class NavbarComponent implements OnInit {
  showDropdown = signal(false);
  notifications = signal<any[]>([]);
  unreadCount = signal(0); // IMPROVED
  loading = signal(false);

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private wsService: NotificationWebsocketService
  ) { 
    this.wsService.unreadCount$.subscribe(count => this.unreadCount.set(count));
  }

  isClient() { return this.auth.user()?.role === 'CLIENT'; }
  isStaff() { return this.auth.user()?.role === 'ADMIN' || this.auth.user()?.role === 'EMPLOYEE'; }
  
  initials() { 
    const u = this.auth.user();
    return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : '';
  }

  getPageTitle() {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' ? 'Espace Admin' : role === 'EMPLOYEE' ? 'Espace Employé' : 'Amen Bank';
  }

  getNotifTitle() {
    const role = this.auth.user()?.role;
    if (role === 'ADMIN') return 'Alertes & supervision';
    if (role === 'EMPLOYEE') return 'Demandes en attente';
    return 'Notifications client';
  }

  getAriaLabel() {
    const role = this.auth.user()?.role;
    if (role === 'ADMIN') return 'Alertes & supervision';
    if (role === 'EMPLOYEE') return 'Demandes en attente';
    return 'Notifications';
  }

  ngOnInit() {
    this.wsService.notification$.subscribe((n: Notification) => { // IMPROVED
      this.notifications.update(list => [n, ...list.slice(0, 9)]);
    });
  }

  toggleDropdown() {
    this.showDropdown.update(v => !v);
    if (this.showDropdown()) {
      this.fetchRecent();
    }
  }

  fetchRecent() {
    this.loading.set(true);
    this.api.getNotifications(0).subscribe({
      next: r => {
        this.loading.set(false);
        const content = r.data?.content ?? r.data ?? [];
        this.notifications.set(content.slice(0, 10));
      },
      error: () => this.loading.set(false)
    });
  }

  markAllRead() {
    this.api.markAllAsRead().subscribe(() => {
      this.wsService.setUnreadCount(0);
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    });
  }

  acknowledgeNotif(n: any) {
    if (!n.isRead) {
      this.api.markAsRead(n.id).subscribe(() => {
        this.wsService.adjustUnreadCount(-1);
        n.isRead = true;
      });
    }
    this.showDropdown.set(false);
  }

  deleteNotif(event: MouseEvent, id: number) {
    event.stopPropagation();
    const notif = this.notifications().find(n => n.id === id);
    this.api.deleteNotification(id).subscribe(() => {
      if (notif && !notif.isRead) {
        this.wsService.adjustUnreadCount(-1);
      }
      this.notifications.update(list => list.filter(n => n.id !== id));
    });
  }

  deleteAll() {
    if (confirm('Voulez-vous vraiment supprimer définitivement ces notifications du centre de notifications ? (Le contenu associé ne sera pas impacté)')) {
      this.api.deleteAllNotifications().subscribe(() => {
        this.wsService.setUnreadCount(0);
        this.notifications.set([]);
      });
    }
  }

  priorityClass(n: any): 'normal' | 'high' | 'critical' | 'email' {
    if (this.isEmailService(n)) return 'email';
    const text = `${n?.type || ''} ${n?.title || ''} ${n?.message || ''}`.toUpperCase();
    if (text.includes('CRITICAL') || text.includes('FRAUD') || text.includes('GELER') || text.includes('BLOQUE')) {
      return 'critical';
    }
    if (this.isStaff() || text.includes('VALIDER') || text.includes('ATTENTE') || text.includes('SECUR')) {
      return 'high';
    }
    return 'normal';
  }

  isEmailService(n: any): boolean {
    const text = `${n?.title || ''} ${n?.message || ''}`.toLowerCase();
    return /(code.*verification|otp|email|reinitialisation|activation|identifiant)/.test(text);
  }
}
