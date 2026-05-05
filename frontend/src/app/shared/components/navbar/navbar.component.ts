import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Notification } from '../../../core/models/api.models'; // ADDED

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <header class="navbar glass-style">
      <div class="nav-left">
        <!-- Optional: search or breadcrumbs could go here -->
      </div>
      <div class="nav-right">
        <div class="notification-wrapper">
          <button class="notif-btn" (click)="toggleDropdown()" [class.has-unread]="unreadCount() > 0">
            <span class="bell-icon">🔔</span>
            @if (unreadCount() > 0) {
              <span class="badge pulse-animation">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
            }
          </button>

          @if (showDropdown()) {
            <div class="notif-dropdown animate-in">
              <div class="dropdown-header">
                <h3 class="outfit">Notifications</h3>
                <button class="mark-all-btn outfit" (click)="markAllRead()" [disabled]="unreadCount() === 0">
                  Tout marquer lu
                </button>
              </div>
              <div class="dropdown-body">
                @if (loading()) {
                  <div class="notif-loading"><span class="spinner"></span></div>
                } @else if (notifications().length === 0) {
                  <div class="notif-empty outfit">Aucune notification</div>
                } @else {
                  @for (n of notifications(); track n.id) {
                    <div class="notif-item" [class.unread]="!n.isRead" (click)="navigateToNotif(n)">
                      <div class="notif-dot" [class]="'priority-' + n.priority?.toLowerCase()"></div>
                      <div class="notif-main">
                        <div class="notif-title outfit">{{ n.title }}</div>
                        <div class="notif-msg outfit">{{ n.message }}</div>
                        <div class="notif-time outfit">{{ n.createdAt | date:'shortTime' }}</div>
                      </div>
                    </div>
                  }
                }
              </div>
              <div class="dropdown-footer">
                <a routerLink="/client/notifications" (click)="showDropdown.set(false)" class="outfit">Voir tout</a>
              </div>
            </div>
            <div class="dropdown-overlay" (click)="showDropdown.set(false)"></div>
          }
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
    .dropdown-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-50);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dropdown-header h3 { font-size: 1rem; margin: 0; }
    .mark-all-btn { background: none; border: none; color: var(--accent); font-size: 0.75rem; font-weight: 700; cursor: pointer; }
    .dropdown-body { max-height: 400px; overflow-y: auto; }
    .notif-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-50);
      display: flex;
      gap: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .notif-item:hover { background: var(--gray-50); }
    .notif-item.unread { background: rgba(0, 61, 110, 0.02); }
    .notif-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: var(--gray-300); }
    .notif-dot.priority-high { background: var(--danger); box-shadow: 0 0 5px var(--danger); }
    .notif-main { flex: 1; min-width: 0; }
    .notif-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin-bottom: 2px; }
    .notif-msg { font-size: 0.8rem; color: var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-time { font-size: 0.7rem; color: var(--gray-400); margin-top: 4px; }
    .dropdown-footer { padding: 0.75rem; text-align: center; border-top: 1px solid var(--gray-50); }
    .dropdown-footer a { color: var(--primary); font-size: 0.8rem; font-weight: 700; text-decoration: none; }
    .dropdown-overlay { position: fixed; inset: 0; z-index: 100; }
  `]
})
export class NavbarComponent implements OnInit {
  showDropdown = signal(false);
  notifications = signal<any[]>([]);
  unreadCount = signal(0); // IMPROVED
  loading = signal(false);

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private wsService: NotificationWebsocketService
  ) { 
    // Bind to BehaviorSubject - ADDED
    this.wsService.unreadCount$.subscribe(count => this.unreadCount.set(count));
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
      this.wsService.unreadCount.set(0);
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    });
  }

  navigateToNotif(n: any) {
    if (!n.isRead) {
      this.api.markAsRead(n.id).subscribe(() => {
        this.wsService.unreadCount.update(c => Math.max(0, c - 1));
        n.isRead = true;
      });
    }
    this.showDropdown.set(false);
    // Navigation logic could be added here based on notification type
  }
}
