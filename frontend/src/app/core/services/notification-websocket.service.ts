import { Injectable, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Subject, BehaviorSubject } from 'rxjs'; // IMPROVED
import { User } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class NotificationWebsocketService {
  private ws: WebSocket | null = null;
  
  private unreadCountSubject = new BehaviorSubject<number>(0); // ADDED
  unreadCount$ = this.unreadCountSubject.asObservable(); // ADDED
  
  private badgeCountsSubject = new BehaviorSubject<{ [key: string]: number }>({}); // ADDED
  badgeCounts$ = this.badgeCountsSubject.asObservable(); // ADDED
  
  unreadCount = signal(0); // KEPT for compatibility
  badgeCounts = signal<{ [key: string]: number }>({}); // KEPT for compatibility

  private notificationSubject = new Subject<any>(); // RESTORED
  notification$ = this.notificationSubject.asObservable(); // RESTORED

  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(private api: ApiService, private auth: AuthService) {
    toObservable(this.auth.user).subscribe((user: User | null) => {
      if (user) {
        this.connect();
        this.fetchCounts();
      } else {
        this.disconnect();
      }
    });
    
    // Polling fallback every 30s
    setInterval(() => {
      if (this.auth.isLoggedIn()) {
        this.fetchCounts();
      }
    }, 30000);
  }

  connect() {
    const user = this.auth.user();
    if (!user || this.ws) return;

    const url = `wss://localhost:8443/ws/notifications?userId=${user.id}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'badge:refresh') {
          this.fetchCounts();
          this.refreshSubject.next();
        } else {
          // It's a normal notification
          const nextCount = this.unreadCountSubject.value + 1; // IMPROVED
          this.unreadCountSubject.next(nextCount); // IMPROVED
          this.unreadCount.set(nextCount); // Sync signal
          this.notificationSubject.next(payload);
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.connect(), 5000); // Reconnect after 5s
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  fetchCounts() {
    const user = this.auth.user();
    if (!user) return;

    // Fetch unread notification count
    this.api.getUnreadCount().subscribe(r => {
      if (r.data) {
        this.unreadCountSubject.next(r.data.count); // IMPROVED
        this.unreadCount.set(r.data.count); // Sync signal
      }
    });

    // Fetch sidebar badge counts for Admin/Employee
    if (user.role === 'ADMIN' || user.role === 'EMPLOYEE') {
      this.api.getBadgeCounts().subscribe(r => {
        if (r.data?.counts) {
          this.badgeCountsSubject.next(r.data.counts); // ADDED
          this.badgeCounts.set(r.data.counts); // Sync signal
        }
      });
    }
  }
}
