import { Component, computed, signal, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { notificationTypeFr } from '../../../shared/display-labels';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';
import { Subscription } from 'rxjs';

interface Notif {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface RealtimeNotifEvent {
  id?: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

type Category = 'all' | 'virement' | 'credit' | 'compte' | 'solde' | 'email' | 'autre';
type ReadFilter = 'all' | 'unread';

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'all',      label: 'Toutes',      icon: '🔔' },
  { key: 'virement', label: 'Virements',   icon: '💸' },
  { key: 'credit',   label: 'Crédits',     icon: '💰' },
  { key: 'compte',   label: 'Compte',      icon: '🏦' },
  { key: 'solde',    label: 'Solde',       icon: '💵' },
  { key: 'email',    label: 'Service Email', icon: '📧' },
  { key: 'autre',    label: 'Autres',      icon: '📋' },
];

@Component({
  selector: 'app-client-notifications',
  imports: [SidebarComponent, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content">
        <div class="page-header notif-header">
          <div>
            <h1 class="outfit">Centre de Notifications</h1>
            <p class="subtitle outfit">Suivi en temps réel de vos opérations, alertes de sécurité et flux financiers.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-ghost outfit" (click)="refresh()" [disabled]="loading()">
              Actualiser
            </button>
            <button class="btn btn-ghost outfit color-danger" (click)="deleteAll()" [disabled]="items().length === 0 || marking()">
              Tout supprimer
            </button>
            <button class="btn btn-primary outfit" (click)="markAllRead()" [disabled]="unreadCount() === 0 || marking()">
              Tout marquer lu
            </button>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="category-tabs scroll-x">
          @for (c of categories; track c.key) {
            <button class="cat-chip outfit" [class.active]="category() === c.key" (click)="category.set(c.key)">
              <span class="cat-ico">{{ c.icon }}</span>
              <span class="cat-label">{{ c.label }}</span>
              <span class="count">{{ countByCategory(c.key) }}</span>
            </button>
          }
        </div>

        <div class="filter-strip flex-between align-center mb-1">
          <div class="read-filter">
            <button class="mini-chip outfit" [class.active]="readFilter() === 'all'" (click)="readFilter.set('all')">Toutes</button>
            <button class="mini-chip outfit" [class.active]="readFilter() === 'unread'" (click)="readFilter.set('unread')">
              Non lues
              @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
            </button>
          </div>
          <div class="unread-summary outfit size-xs color-gray-400">
            {{ unreadCount() }} notification{{ unreadCount() > 1 ? 's' : '' }} non lue{{ unreadCount() > 1 ? 's' : '' }}
          </div>
        </div>

        @if (msg()) { <div class="alert animate-in" [class.alert-success]="!isError()" [class.alert-error]="isError()">{{ msg() }}</div> }

        <div class="card premium-card no-padding overflow-hidden">
          @if (loading()) {
            <div class="loading-state">
              <span class="premium-spinner"></span>
              <p class="outfit">Synchronisation en cours...</p>
            </div>
          } @else if (visible().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🔔</div>
              <h3 class="outfit">{{ emptyTitle() }}</h3>
              <p class="outfit">Votre centre de messagerie est à jour.</p>
            </div>
          } @else {
            <ul class="notif-list">
              @for (n of visible(); track n.id) {
                <li class="notif-item animate-in" [class.unread]="!n.isRead" [class]="'type-' + typeClass(n.type)">
                  <div class="notif-indicator"></div>
                  <div class="notif-icon-box">
                    @switch (typeClass(n.type)) {
                      @case ('success') { <span class="ico">✅</span> }
                      @case ('warning') { <span class="ico">⚠️</span> }
                      @case ('error') { <span class="ico">🚫</span> }
                      @default { <span class="ico">ℹ️</span> }
                    }
                  </div>
                  <div class="notif-content">
                    <div class="notif-top flex-between mb-0-5">
                      <h4 class="outfit">{{ n.title }}</h4>
                      <time class="outfit">{{ n.createdAt | date:'dd MMM yyyy, HH:mm' }}</time>
                    </div>
                    <p class="outfit">{{ n.message }}</p>
                    <div class="notif-footer">
                      <div class="flex align-center gap-0-5">
                        <span class="type-tag outfit">{{ notificationTypeFr(n.type) }}</span>
                        @if (!n.isRead) {
                          <span class="unread-dot"></span>
                        }
                      </div>
                      <div class="notif-actions">
                        <button class="btn-action outfit view" (click)="viewDetails(n)">Voir</button>
                        @if (!n.isRead) {
                          <button class="btn-action outfit read" (click)="markRead(n)" [disabled]="marking()">Lu</button>
                        }
                        <button class="btn-action outfit delete" (click)="deleteNotif(n)" [disabled]="marking()">Supprimer</button>
                      </div>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .notif-header { margin-bottom: 2rem; }
    
    .category-tabs { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 1rem; border-bottom: 1px solid var(--gray-100); margin-bottom: 1.5rem; }
    .category-tabs::-webkit-scrollbar { height: 4px; }
    .category-tabs::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 4px; }

    .cat-chip { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 1rem; background: white; border: 1px solid var(--gray-100); border-radius: 10px; cursor: pointer; transition: all 0.05s; white-space: nowrap; }
    .cat-chip .count { background: var(--gray-50); color: var(--gray-400); padding: 0.1rem 0.5rem; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }
    .cat-chip:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--primary-light); }
    .cat-chip.active { background: var(--primary); color: white; border-color: var(--primary); }
    .cat-chip.active .count { background: var(--accent); color: var(--primary); }
    .cat-chip.active .cat-label { font-weight: 700; }

    .read-filter { display: flex; gap: 0.5rem; }
    .mini-chip { padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid var(--gray-100); background: white; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: var(--gray-400); }
    .mini-chip.active { background: var(--gray-50); color: var(--primary); border-color: var(--primary-light); }
    .mini-chip .badge { background: var(--danger); color: white; padding: 0 0.3rem; border-radius: 10px; font-size: 0.6rem; margin-left: 0.3rem; }

    .loading-state { padding: 5rem; text-align: center; color: var(--gray-400); }
    .premium-spinner { width: 30px; height: 30px; border: 3px solid var(--gray-100); border-top-color: var(--accent); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }

    .notif-list { list-style: none; padding: 0; margin: 0; }
    .notif-item { display: flex; gap: 1.25rem; padding: 1.5rem 2rem; border-bottom: 1px solid var(--gray-50); position: relative; transition: all 0.05s; }
    .notif-item:hover { background: var(--gray-50); }
    .notif-item.unread { background: rgba(0, 61, 110, 0.02); }
    .notif-item.unread .notif-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
    .notif-item.unread h4 { font-weight: 800; }

    .notif-icon-box { font-size: 1.25rem; width: 40px; height: 40px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--gray-100); }
    .notif-content { flex: 1; }
    .notif-content h4 { font-size: 0.95rem; color: var(--primary); margin-bottom: 0.25rem; }
    .notif-content time { font-size: 0.7rem; color: var(--gray-400); }
    .notif-content p { font-size: 0.85rem; color: var(--gray-600); line-height: 1.5; margin-bottom: 1rem; }
    
    .notif-footer { display: flex; justify-content: space-between; align-items: center; }
    .type-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gray-400); background: var(--gray-50); padding: 0.25rem 0.5rem; border-radius: 4px; }
    
    .unread-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 5px var(--accent); }
    
    .notif-actions { display: flex; gap: 0.5rem; }
    .btn-action { background: none; border: 1px solid var(--gray-100); color: var(--gray-600); font-size: 0.7rem; font-weight: 700; cursor: pointer; padding: 0.3rem 0.6rem; border-radius: 6px; transition: all 0.2s; }
    .btn-action:hover { background: var(--gray-50); border-color: var(--gray-300); }
    .btn-action.view { color: var(--primary); }
    .btn-action.read { color: var(--success); }
    .btn-action.delete { color: var(--danger); }
    .btn-action.delete:hover { background: rgba(239, 68, 68, 0.05); border-color: var(--danger-light); }

    .color-danger { color: var(--danger) !important; }

    .type-success .notif-icon-box { color: var(--success); border-color: var(--success-light); }
    .type-warning .notif-icon-box { color: var(--warning); border-color: var(--warning-light); }
    .type-error .notif-icon-box { color: var(--danger); border-color: var(--danger-light); }

  `]
})
export class ClientNotificationsComponent implements OnInit, OnDestroy {
  private realtimeSub?: Subscription;

  navItems = CLIENT_NAV;
  categories = CATEGORIES;
  notificationTypeFr = notificationTypeFr;
  items = signal<Notif[]>([]);
  category = signal<Category>('all');
  readFilter = signal<ReadFilter>('all');
  loading = signal(false);
  marking = signal(false);
  msg = signal('');
  isError = signal(false);

  unreadCount = computed(() => this.items().filter(n => !n.isRead).length);

  visible = computed(() => {
    let list = this.items();
    const cat = this.category();
    if (cat !== 'all') list = list.filter(n => this.categorize(n) === cat);
    if (this.readFilter() === 'unread') list = list.filter(n => !n.isRead);
    return list;
  });

  emptyTitle = computed(() => {
    const cat = this.category();
    const catLabel = CATEGORIES.find(c => c.key === cat)?.label ?? '';
    if (cat === 'all') {
      return this.readFilter() === 'unread' ? 'Aucune notification non lue' : 'Aucune notification';
    }
    return `Aucune notification · ${catLabel}`;
  });

  categorize(n: Notif): Category {
    const text = ((n.title || '') + ' ' + (n.message || '')).toLowerCase();
    if (/(code.*verification|otp|email|reinitialisation|activation|identifiant)/.test(text)) return 'email';
    if (/(virement|transfer|destinataire|recu|beneficiaire)/.test(text)) return 'virement';
    if (/(credit|pret|mensualite)/.test(text)) return 'credit';
    if (/(solde|credite|depot|augmente)/.test(text)) return 'solde';
    if (/(compte.*(desactive|activ|reactive|gel|freeze)|carte.*(desactive|activ|reactive)|client.*(desactive|reactive))/.test(text)) return 'compte';
    return 'autre';
  }

  countByCategory(cat: Category): number {
    if (cat === 'all') return this.items().length;
    return this.items().filter(n => this.categorize(n) === cat).length;
  }

  constructor(private api: ApiService, private wsService: NotificationWebsocketService) {}

  ngOnInit() {
    this.refresh();
    this.connectRealtimeNotifications();
  }

  ngOnDestroy() {
    this.realtimeSub?.unsubscribe();
  }

  refresh() {
    this.loading.set(true);
    this.api.getNotifications(0).subscribe({
      next: r => {
        this.loading.set(false);
        const content = r.data?.content ?? r.data ?? [];
        this.items.set(content);
      },
      error: () => {
        this.loading.set(false);
        this.showMsg('Impossible de charger les notifications.', true);
      }
    });
  }

  markRead(n: Notif) {
    if (n.isRead || this.marking()) return;
    this.marking.set(true);
    this.api.markAsRead(n.id).subscribe({
      next: () => {
        this.marking.set(false);
        this.items.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        this.wsService.adjustUnreadCount(-1);
      },
      error: () => { this.marking.set(false); }
    });
  }

  markAllRead() {
    if (this.unreadCount() === 0 || this.marking()) return;
    this.marking.set(true);
    this.api.markAllAsRead().subscribe({
      next: () => {
        this.marking.set(false);
        this.items.update(list => list.map(x => ({ ...x, isRead: true })));
        this.wsService.setUnreadCount(0);
        this.showMsg('Toutes les notifications ont été marquées comme lues.');
      },
      error: () => {
        this.marking.set(false);
        this.showMsg('Erreur lors de la mise à jour.', true);
      }
    });
  }

  deleteNotif(n: Notif) {
    if (this.marking()) return;
    this.marking.set(true);
    this.api.deleteNotification(n.id).subscribe({
      next: () => {
        this.marking.set(false);
        const wasUnread = !n.isRead;
        this.items.update(list => list.filter(x => x.id !== n.id));
        if (wasUnread) {
          this.wsService.adjustUnreadCount(-1);
        }
        this.showMsg('Notification supprimée.');
      },
      error: () => {
        this.marking.set(false);
        this.showMsg('Erreur lors de la suppression.', true);
      }
    });
  }

  deleteAll() {
    if (this.items().length === 0 || this.marking()) return;
    if (!confirm('Voulez-vous vraiment supprimer toutes vos notifications ?')) return;
    this.marking.set(true);
    this.api.deleteAllNotifications().subscribe({
      next: () => {
        this.marking.set(false);
        this.items.set([]);
        this.wsService.setUnreadCount(0);
        this.showMsg('Toutes les notifications ont été supprimées.');
      },
      error: () => {
        this.marking.set(false);
        this.showMsg('Erreur lors de la suppression totale.', true);
      }
    });
  }

  viewDetails(n: Notif) {
    if (!n.isRead) {
      this.markRead(n);
    }
    this.showMsg(`Détails: ${n.title}`);
  }

  typeClass(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('SUCCESS')) return 'success';
    if (t.includes('WARN')) return 'warning';
    if (t.includes('ERROR') || t.includes('ALERT')) return 'error';
    return 'info';
  }

  showMsg(text: string, error = false) {
    this.msg.set(text); this.isError.set(error);
    setTimeout(() => this.msg.set(''), 4000);
  }

  private connectRealtimeNotifications() {
    this.realtimeSub = this.wsService.notification$.subscribe((payload: RealtimeNotifEvent) => {
      if (!payload) return;
      const id = payload.id ?? -Date.now();
      this.items.update(list => {
        if (list.some(n => n.id === id)) return list;
        return [{
          id,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          isRead: false,
          createdAt: payload.createdAt || new Date().toISOString()
        }, ...list];
      });
      this.showMsg("Nouvelle notification reçue");
    });
  }
}
