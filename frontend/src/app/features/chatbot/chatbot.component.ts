import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatConversation, ChatMessage } from '../../core/models/api.models';

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="chat-page">
      <aside class="chat-sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-icon">A</div>
            <div class="brand-text">
              <strong>Assistant Amen</strong>
              <small>Banque en ligne</small>
            </div>
          </div>
          <button class="icon-btn" (click)="sidebarOpen.set(false)" aria-label="Fermer" title="Fermer">×</button>
        </div>

        <div class="sidebar-label">Historique</div>

        <div class="conversations">
          @if (!conversations().length) {
            <div class="empty-hint">Aucun historique pour le moment.</div>
          }
          @for (c of conversations(); track c.id) {
            <div class="conv-item" [class.active]="c.id === activeConvId()"
                 (click)="selectConversation(c)">
              <div class="conv-body">
                <div class="conv-title">{{ c.title || 'Conversation' }}</div>
                <div class="conv-date">{{ c.updated_at | date:'dd MMM yyyy HH:mm' }}</div>
              </div>
              <button class="icon-btn danger" (click)="confirmDelete($event, c)" title="Supprimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                </svg>
              </button>
            </div>
          }
        </div>

        <div class="sidebar-footer">
          <a [routerLink]="backLink()" class="back-link">← Retour au tableau de bord</a>
        </div>
      </aside>

      <main class="chat-main">
        <header class="chat-header">
          <button class="icon-btn menu" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="title">
            <h2>{{ currentTitle() }}</h2>
            <span class="status" [class.offline]="!online()">
              <i class="dot"></i> {{ online() ? 'En ligne' : 'Hors ligne' }}
            </span>
          </div>
          <div class="header-actions">
            <button class="new-chat-btn" (click)="newConversation()" [disabled]="creating() || loading()" title="Nouvelle conversation">
              @if (creating()) {
                <span class="spinner"></span>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              }
              <span class="label">Nouvelle conversation</span>
            </button>
          </div>
        </header>

        <div class="chat-messages" #messagesContainer>
          @if (!messages().length && !loading()) {
            <div class="welcome">
              <div class="welcome-avatar">
                <div class="avatar-ring"></div>
                <div class="avatar-core">A</div>
              </div>
              <h1>Bonjour {{ firstName() }} <span class="wave">👋</span></h1>
              <p class="welcome-sub">Je suis votre assistant Amen Bank. Posez-moi une question sur vos comptes, vos cartes, vos virements ou vos credits.</p>
              <div class="suggestions">
                @for (s of suggestions; track s.label) {
                  <button class="suggestion-card" (click)="send(s.prompt)">
                    <span class="icon">{{ s.icon }}</span>
                    <span class="label">{{ s.label }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @for (m of messages(); track m.id; let i = $index) {
            <div class="message-row" [class.user]="m.role === 'user'" [class.bot]="m.role === 'assistant'"
                 [style.animation-delay.ms]="i * 30">
              <div class="avatar">
                @if (m.role === 'assistant') { <span>A</span> }
                @else { <span>{{ initials() }}</span> }
              </div>
              <div class="bubble-wrap">
                <div class="bubble">
                  @for (part of renderContent(m.content); track $index) {
                    @if (part.type === 'text') { <span [innerHTML]="part.value"></span> }
                    @if (part.type === 'ul') {
                      <ul>@for (li of part.items; track $index) { <li [innerHTML]="li"></li> }</ul>
                    }
                  }
                </div>
                <div class="meta">
                  <span>{{ m.created_at | date:'HH:mm' }}</span>
                  @if (m.role === 'assistant') {
                    <button class="copy-btn" (click)="copy(m.content, m.id)" title="Copier">
                      {{ copiedId() === m.id ? 'Copie !' : 'Copier' }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          @if (loading()) {
            <div class="message-row bot">
              <div class="avatar"><span>A</span></div>
              <div class="bubble-wrap">
                <div class="bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          }
        </div>

        @if (error()) {
          <div class="error-banner">
            <strong>Erreur.</strong> {{ error() }}
          </div>
        }

        <form class="chat-input" (ngSubmit)="send()">
          <textarea
            #inputEl
            [(ngModel)]="input"
            name="msg"
            rows="1"
            (keydown.enter)="onEnter($event)"
            (input)="autogrow($event)"
            placeholder="Ecrivez votre message..."
            [disabled]="loading()"
          ></textarea>
          <button type="submit" class="send-btn" [disabled]="loading() || !input.trim()" title="Envoyer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>

        @if (confirmDel()) {
          <div class="overlay" (click)="confirmDel.set(null)">
            <div class="dialog" (click)="$event.stopPropagation()">
              <h3>Supprimer la conversation ?</h3>
              <p>«{{ confirmDel()!.title }}» sera definitivement supprimee.</p>
              <div class="dialog-actions">
                <button class="btn-secondary" (click)="confirmDel.set(null)">Annuler</button>
                <button class="btn-danger" (click)="doDelete(confirmDel()!)">Supprimer</button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    * { box-sizing: border-box; }

    .chat-page {
      display: grid;
      grid-template-columns: 300px 1fr;
      height: 100vh;
      background: linear-gradient(135deg, #eef3fb 0%, #f7f9fc 100%);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #1a1f29;
    }

    /* Sidebar */
    .chat-sidebar {
      display: flex; flex-direction: column;
      background: #0b2a4a;
      color: #fff;
      padding: 1rem;
      overflow: hidden;
      animation: slideInLeft 0.4s ease;
    }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; }
    .brand-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #ffd451, #ff8a00);
      color: #0b2a4a; font-weight: 800; display: grid; place-items: center;
      box-shadow: 0 6px 16px rgba(255,138,0,0.35);
    }
    .brand-text strong { font-size: 0.95rem; letter-spacing: 0.2px; }
    .brand-text small { display: block; font-size: 0.72rem; opacity: 0.65; }
    .sidebar-label {
      text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px;
      opacity: 0.55; margin: 1.1rem 0 0.4rem;
    }

    .conversations { flex: 1; overflow-y: auto; margin: 0 -0.5rem; padding: 0 0.5rem; }
    .empty-hint { font-size: 0.82rem; opacity: 0.6; text-align: center; padding: 1.25rem 0; }
    .conv-item {
      display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
      padding: 0.65rem 0.75rem; border-radius: 8px; cursor: pointer;
      transition: background 0.18s;
    }
    .conv-item:hover { background: rgba(255,255,255,0.06); }
    .conv-item.active { background: rgba(30,144,255,0.18); outline: 1px solid rgba(30,144,255,0.35); }
    .conv-body { min-width: 0; flex: 1; }
    .conv-title {
      font-size: 0.88rem; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .conv-date { font-size: 0.7rem; opacity: 0.55; margin-top: 0.15rem; }

    .icon-btn {
      background: transparent; color: inherit; border: none; cursor: pointer;
      width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center;
      transition: background 0.18s;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.1); }
    .icon-btn.danger:hover { background: rgba(239,68,68,0.25); color: #ffb4b4; }
    .icon-btn.menu { display: none; color: #0b2a4a; }

    .sidebar-footer { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; margin-top: 0.5rem; }
    .back-link { color: #c1d4f2; font-size: 0.82rem; text-decoration: none; display: inline-block; padding: 0.25rem; }
    .back-link:hover { color: #fff; }

    /* Main */
    .chat-main {
      display: flex; flex-direction: column; min-width: 0;
      background: #fafbfd;
    }
    .chat-header {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.5rem; border-bottom: 1px solid #e7ecf3; background: #fff;
    }
    .header-actions { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }
    .new-chat-btn {
      display: inline-flex; align-items: center; gap: 0.45rem;
      padding: 0.55rem 1rem; border: none; border-radius: 999px;
      background: linear-gradient(135deg, #1e90ff, #3b5bdb); color: #fff;
      font-weight: 600; font-size: 0.85rem; cursor: pointer;
      box-shadow: 0 6px 16px rgba(30,144,255,0.3);
      transition: transform 0.15s, box-shadow 0.2s, opacity 0.15s;
    }
    .new-chat-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(30,144,255,0.4); }
    .new-chat-btn:disabled { opacity: 0.55; cursor: wait; }
    .new-chat-btn .spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    .title { display: flex; flex-direction: column; }
    .title h2 { margin: 0; font-size: 1rem; font-weight: 600; }
    .status { display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: #57a15a; }
    .status.offline { color: #b7272b; }
    .status .dot {
      width: 8px; height: 8px; border-radius: 50%; background: currentColor;
      box-shadow: 0 0 0 0 currentColor; animation: pulseDot 1.8s infinite;
    }

    /* Messages */
    .chat-messages { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; scroll-behavior: smooth; }
    .message-row {
      display: flex; gap: 0.6rem; margin-bottom: 0.9rem; align-items: flex-end;
      animation: slideUp 0.35s ease both;
    }
    .message-row.user { flex-direction: row-reverse; }

    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      display: grid; place-items: center; font-weight: 700; font-size: 0.78rem;
      color: #fff; flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    }
    .message-row.bot .avatar { background: linear-gradient(135deg, #1e90ff, #3b5bdb); }
    .message-row.user .avatar { background: linear-gradient(135deg, #0b2a4a, #1f4a82); }

    .bubble-wrap { display: flex; flex-direction: column; max-width: 72%; }
    .message-row.user .bubble-wrap { align-items: flex-end; }

    .bubble {
      padding: 0.7rem 0.95rem;
      border-radius: 16px; line-height: 1.55; font-size: 0.93rem;
      white-space: pre-wrap; word-break: break-word;
      box-shadow: 0 2px 8px rgba(20,30,70,0.06);
    }
    .message-row.bot .bubble {
      background: #fff; color: #1a1f29; border: 1px solid #e7ecf3;
      border-bottom-left-radius: 6px;
    }
    .message-row.user .bubble {
      background: linear-gradient(135deg, #1e90ff, #3b5bdb);
      color: #fff; border-bottom-right-radius: 6px;
    }
    .bubble ul { margin: 0.35rem 0 0; padding-left: 1.1rem; }
    .bubble li { margin-bottom: 0.15rem; }
    .bubble strong { color: inherit; }
    .bubble code {
      background: rgba(0,0,0,0.06); padding: 0.08rem 0.35rem; border-radius: 4px;
      font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.86em;
    }
    .message-row.user .bubble code { background: rgba(255,255,255,0.18); }
    .bubble a { color: inherit; text-decoration: underline; }

    .meta {
      display: flex; gap: 0.5rem; align-items: center;
      font-size: 0.68rem; color: #8b95a3; margin-top: 0.25rem; padding: 0 0.25rem;
    }
    .copy-btn {
      background: transparent; border: none; color: #3b5bdb; cursor: pointer;
      font-size: 0.68rem; padding: 0; transition: color 0.15s;
    }
    .copy-btn:hover { color: #1e90ff; }

    .typing { display: inline-flex; gap: 4px; padding: 0.75rem 1rem; }
    .typing span {
      width: 7px; height: 7px; background: #8b95a3; border-radius: 50%;
      animation: typingDot 1.3s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.15s; }
    .typing span:nth-child(3) { animation-delay: 0.3s; }

    /* Welcome */
    .welcome {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 2rem 1rem; gap: 1rem; animation: fadeIn 0.5s ease;
    }
    .welcome-avatar { position: relative; width: 80px; height: 80px; }
    .avatar-ring {
      position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, #1e90ff, #ffd451, #ff8a00, #1e90ff);
      filter: blur(1px); animation: spin 6s linear infinite;
    }
    .avatar-core {
      position: absolute; inset: 6px; border-radius: 50%;
      background: linear-gradient(135deg, #1e90ff, #3b5bdb);
      display: grid; place-items: center;
      color: #fff; font-weight: 700; font-size: 1.6rem;
      box-shadow: inset 0 -4px 10px rgba(0,0,0,0.15);
    }
    .welcome h1 { margin: 0; font-size: 1.5rem; font-weight: 600; color: #0b2a4a; }
    .welcome h1 .wave { display: inline-block; animation: wave 2s ease infinite; transform-origin: 70% 70%; }
    .welcome-sub { max-width: 540px; color: #57627a; line-height: 1.55; margin: 0; }
    .suggestions {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.6rem; width: 100%; max-width: 640px; margin-top: 0.75rem;
    }
    .suggestion-card {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 0.9rem;
      background: #fff; border: 1px solid #e7ecf3; border-radius: 12px;
      cursor: pointer; text-align: left; font-size: 0.88rem; color: #1a1f29;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.2s;
    }
    .suggestion-card:hover {
      transform: translateY(-2px); border-color: #1e90ff;
      box-shadow: 0 6px 16px rgba(30,144,255,0.12);
    }
    .suggestion-card .icon { font-size: 1.1rem; }

    /* Input */
    .chat-input {
      display: flex; gap: 0.6rem; align-items: flex-end;
      padding: 0.9rem 1.5rem 1.2rem; background: #fff; border-top: 1px solid #e7ecf3;
    }
    .chat-input textarea {
      flex: 1; resize: none; padding: 0.75rem 1rem;
      border: 1px solid #dbe1ec; border-radius: 18px;
      font: inherit; font-size: 0.93rem; line-height: 1.4;
      max-height: 140px; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .chat-input textarea:focus { border-color: #1e90ff; box-shadow: 0 0 0 3px rgba(30,144,255,0.15); }
    .send-btn {
      width: 46px; height: 46px; border-radius: 50%;
      background: linear-gradient(135deg, #1e90ff, #3b5bdb); color: #fff;
      border: none; cursor: pointer; display: grid; place-items: center;
      transition: transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 6px 16px rgba(30,144,255,0.35);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.05); }
    .send-btn:disabled { opacity: 0.5; cursor: default; box-shadow: none; }

    .error-banner {
      margin: 0 1.5rem 0.6rem; padding: 0.6rem 0.9rem;
      background: #fef2f2; color: #9b1c1c; border: 1px solid #fecaca;
      border-radius: 10px; font-size: 0.85rem; animation: shake 0.4s;
    }

    /* Dialog */
    .overlay {
      position: fixed; inset: 0; background: rgba(11,42,74,0.45); backdrop-filter: blur(3px);
      display: grid; place-items: center; z-index: 100; animation: fadeIn 0.2s;
    }
    .dialog {
      background: #fff; border-radius: 14px; padding: 1.5rem; max-width: 420px; width: 90%;
      box-shadow: 0 24px 60px rgba(0,0,0,0.25); animation: popIn 0.25s ease;
    }
    .dialog h3 { margin: 0 0 0.5rem; color: #0b2a4a; }
    .dialog p { margin: 0 0 1rem; color: #57627a; }
    .dialog-actions { display: flex; gap: 0.6rem; justify-content: flex-end; }
    .btn-secondary, .btn-danger {
      padding: 0.55rem 1.1rem; border: none; border-radius: 8px;
      cursor: pointer; font-size: 0.88rem; font-weight: 500;
      transition: background 0.15s;
    }
    .btn-secondary { background: #eef2f7; color: #1a1f29; }
    .btn-secondary:hover { background: #dfe7f1; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes typingDot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes pulseDot {
      0% { box-shadow: 0 0 0 0 currentColor; }
      70% { box-shadow: 0 0 0 5px transparent; }
      100% { box-shadow: 0 0 0 0 transparent; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes wave {
      0%, 60%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(14deg); }
      30% { transform: rotate(-8deg); }
      45% { transform: rotate(10deg); }
    }
    @keyframes popIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* Responsive */
    @media (max-width: 820px) {
      .chat-page { grid-template-columns: 1fr; }
      .chat-sidebar {
        position: fixed; inset: 0 auto 0 0; width: 280px; z-index: 20;
        transform: translateX(-100%); transition: transform 0.25s ease;
      }
      .chat-sidebar.open { transform: translateX(0); box-shadow: 24px 0 40px rgba(0,0,0,0.2); }
      .icon-btn.menu { display: grid; }
      .bubble-wrap { max-width: 82%; }
      .new-chat-btn .label { display: none; }
      .new-chat-btn { padding: 0.55rem 0.7rem; }
    }
  `]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesEl!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') private inputEl!: ElementRef<HTMLTextAreaElement>;

  conversations = signal<ChatConversation[]>([]);
  messages = signal<ChatMessage[]>([]);
  activeConvId = signal<number | null>(null);
  loading = signal(false);
  creating = signal(false);
  online = signal(false);
  error = signal('');
  sidebarOpen = signal(true);
  confirmDel = signal<ChatConversation | null>(null);
  copiedId = signal<number | null>(null);
  input = '';

  private healthTimer: any = null;

  currentTitle = computed(() => {
    const id = this.activeConvId();
    const c = this.conversations().find(x => x.id === id);
    return c?.title || 'Assistant Amen Bank';
  });

  firstName = computed(() => this.auth.user()?.firstName || '');
  initials = computed(() => {
    const u = this.auth.user();
    return ((u?.firstName?.[0] || '') + (u?.lastName?.[0] || '')).toUpperCase() || 'U';
  });

  suggestions = [
    { icon: '💰', label: 'Quel est le solde de mes comptes ?', prompt: 'Quel est le solde de mes comptes ?' },
    { icon: '📤', label: 'Comment faire un virement ?', prompt: 'Comment effectuer un virement simple ?' },
    { icon: '💳', label: 'Mes cartes bancaires', prompt: 'Montre-moi mes cartes bancaires' },
    { icon: '🏦', label: 'Simuler un credit', prompt: 'Je veux simuler un credit' },
    { icon: '🔔', label: 'Mes notifications non lues', prompt: 'Ai-je des notifications importantes ?' },
    { icon: '📞', label: 'Contact service client', prompt: 'Comment contacter le service client ?' },
  ];

  private shouldScroll = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  backLink() {
    const role = this.auth.userRole();
    if (role === 'CLIENT') return '/client/dashboard';
    if (role === 'EMPLOYEE') return '/employee/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    return '/login';
  }

  ngOnInit() {
    this.loadConversations();
    this.pingHealth();
    this.healthTimer = setInterval(() => this.pingHealth(), 30000);
    if (window.innerWidth < 820) this.sidebarOpen.set(false);
  }

  ngOnDestroy() {
    if (this.healthTimer) clearInterval(this.healthTimer);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  pingHealth() {
    this.api.getChatbotHealth().subscribe({
      next: h => this.online.set(h?.status === 'ok'),
      error: () => this.online.set(false),
    });
  }

  loadConversations() {
    this.api.getChatConversations().subscribe({
      next: list => this.conversations.set(list || []),
      error: () => {},
    });
  }

  selectConversation(c: ChatConversation) {
    if (c.id === this.activeConvId()) return;
    this.activeConvId.set(c.id);
    this.error.set('');
    this.api.getChatConversation(c.id).subscribe({
      next: detail => {
        this.messages.set(detail.messages || []);
        this.shouldScroll = true;
      },
      error: () => this.error.set('Impossible de charger cette conversation.'),
    });
    if (window.innerWidth < 820) this.sidebarOpen.set(false);
  }

  newConversation() {
    if (this.creating()) return;
    this.error.set('');
    this.creating.set(true);
    this.api.createChatConversation().subscribe({
      next: conv => {
        this.creating.set(false);
        this.conversations.update(list => [conv, ...list]);
        this.activeConvId.set(conv.id);
        this.messages.set([]);
        this.input = '';
        if (window.innerWidth < 820) this.sidebarOpen.set(false);
        setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
      },
      error: e => {
        this.creating.set(false);
        if (e.status === 0) this.error.set('Le service chatbot n\'est pas demarre (https://localhost:8000).');
        else if (e.status === 401) this.error.set('Session expiree. Reconnectez-vous.');
        else this.error.set(e.error?.detail || 'Impossible de creer une nouvelle conversation.');
      },
    });
  }

  confirmDelete(event: Event, c: ChatConversation) {
    event.stopPropagation();
    this.confirmDel.set(c);
  }

  doDelete(c: ChatConversation) {
    this.api.deleteChatConversation(c.id).subscribe({
      next: () => {
        this.confirmDel.set(null);
        this.conversations.update(list => list.filter(x => x.id !== c.id));
        if (this.activeConvId() === c.id) { this.activeConvId.set(null); this.messages.set([]); }
      },
      error: () => { this.confirmDel.set(null); this.error.set('Impossible de supprimer la conversation.'); },
    });
  }

  onEnter(e: Event) {
    const ev = e as KeyboardEvent;
    if (ev.shiftKey) return;
    ev.preventDefault();
    this.send();
  }

  autogrow(e: Event) {
    const ta = e.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }

  send(text?: string) {
    const msg = (text ?? this.input).trim();
    if (!msg || this.loading()) return;
    this.input = '';
    if (this.inputEl) this.inputEl.nativeElement.style.height = 'auto';
    this.error.set('');
    this.loading.set(true);

    const now = new Date().toISOString();
    const tempUser: ChatMessage = { id: Date.now(), role: 'user', content: msg, created_at: now };
    this.messages.update(m => [...m, tempUser]);
    this.shouldScroll = true;

    this.api.sendChatMessage(this.activeConvId(), msg).subscribe({
      next: res => {
        this.loading.set(false);
        const firstMessage = this.activeConvId() === null;
        this.activeConvId.set(res.conversation_id);
        this.messages.update(m => [...m, res.message]);
        this.shouldScroll = true;
        if (firstMessage) this.loadConversations();
      },
      error: (e) => {
        this.loading.set(false);
        this.messages.update(m => m.filter(x => x.id !== tempUser.id));
        this.input = msg;
        if (e.status === 0) this.error.set('Le service chatbot n\'est pas demarre (https://localhost:8000).');
        else if (e.status === 401) this.error.set('Session expiree. Reconnectez-vous.');
        else this.error.set(e.error?.detail || 'Erreur de communication avec l\'assistant.');
      },
    });
  }

  async copy(text: string, id: number) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.set(id);
      setTimeout(() => { if (this.copiedId() === id) this.copiedId.set(null); }, 1500);
    } catch {}
  }

  renderContent(raw: string): Array<{ type: 'text'; value: string } | { type: 'ul'; items: string[] }> {
    const out: Array<any> = [];
    const lines = raw.split(/\r?\n/);
    let buffer: string[] = [];
    let list: string[] | null = null;

    const flushBuffer = () => {
      if (buffer.length) {
        out.push({ type: 'text', value: this.inlineFormat(buffer.join('\n')) });
        buffer = [];
      }
    };
    const flushList = () => {
      if (list && list.length) { out.push({ type: 'ul', items: list.map(i => this.inlineFormat(i)) }); list = null; }
    };

    for (const line of lines) {
      const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (bullet) {
        flushBuffer();
        if (!list) list = [];
        list.push(bullet[1]);
      } else {
        flushList();
        buffer.push(line);
      }
    }
    flushList();
    flushBuffer();
    return out;
  }

  private inlineFormat(s: string): string {
    const escaped = s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
    try { this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight; } catch {}
  }
}
