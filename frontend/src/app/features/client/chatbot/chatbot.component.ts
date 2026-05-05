import { Component, signal, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { CLIENT_NAV } from '../../../shared/nav-items';
import { ApiService } from '../../../core/services/api.service';
import { ChatConversation, ChatMessage } from '../../../core/models/api.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-chatbot',
  imports: [SidebarComponent, FormsModule, DatePipe],
  template: `
    <div class="layout">
      <app-sidebar [items]="navItems" />
      <main class="main-content chat-wrapper">
        <!-- Header -->
        <div class="chat-header glass-style">
          <div class="flex align-center gap-1">
            <div class="bot-avatar-large outfit">IA</div>
            <div>
              <h1 class="outfit">Assistant Amen Bank</h1>
              <div class="chat-status" [class.online]="!error()">
                <div class="status-dot"></div>
                <span class="outfit size-xs uppercase font-bold">{{ error() ? 'Hors ligne' : 'Système Opérationnel' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-main-layout">
          <!-- Sessions Sidebar -->
          <div class="conv-sidebar">
            <button class="btn btn-accent btn-block outfit mb-1-5" (click)="newConversation()">
              + NOUVELLE SESSION
            </button>
            <div class="conv-list-premium">
              @for (conv of conversations(); track conv.id) {
                <div class="conv-entry animate-in" [class.active]="activeConvId() === conv.id" (click)="selectConversation(conv.id)">
                  <div class="conv-info">
                    <div class="conv-name outfit">{{ conv.title }}</div>
                    <div class="conv-time outfit">{{ conv.updated_at | date:'dd MMM, HH:mm' }}</div>
                  </div>
                  <button class="conv-action-btn" (click)="deleteConversation(conv.id, $event)">✕</button>
                </div>
              } @empty {
                <div class="empty-sessions outfit">Aucun historique de session</div>
              }
            </div>
          </div>

          <!-- Chat Engine -->
          <div class="chat-engine">
            <div class="messages-scroll" #messagesList>
              @if (messages().length === 0 && !loading()) {
                <div class="welcome-view animate-in">
                  <div class="welcome-logo">🛡️</div>
                  <h2 class="outfit">Intelligence Bancaire Active</h2>
                  <p class="outfit color-gray-400">Je suis votre expert digital Amen Bank. Comment puis-je assister vos opérations aujourd'hui ?</p>
                  
                  <div class="suggestions-matrix mt-2">
                    @for (s of suggestions; track s.text) {
                      <button class="suggestion-tile" (click)="sendSuggestion(s.text)">
                        <span class="tile-icon">{{ s.icon }}</span>
                        <div class="tile-text">
                          <span class="tile-label outfit">{{ s.label }}</span>
                          <span class="tile-desc outfit">{{ s.text }}</span>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              }
              
              <div class="message-feed">
                @for (msg of messages(); track msg.id) {
                  <div class="msg-row" [class.user]="msg.role === 'user'">
                    <div class="msg-bubble" [class.assistant]="msg.role === 'assistant'">
                      <div class="msg-text outfit">{{ msg.content }}</div>
                      <div class="msg-meta outfit">{{ msg.created_at | date:'HH:mm' }}</div>
                    </div>
                  </div>
                }
                @if (loading()) {
                  <div class="msg-row">
                    <div class="msg-bubble assistant typing-bubble">
                      <div class="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="chat-input-container">
              @if (error()) { <div class="alert alert-error mb-1 outfit size-xs">{{ error() }}</div> }
              <form (ngSubmit)="sendMessage()" class="premium-chat-form">
                <input type="text" [(ngModel)]="userInput" name="msg" 
                       placeholder="Posez une question sur vos comptes, virements ou crédits..." 
                       [disabled]="loading()" autocomplete="off" class="outfit">
                <button type="submit" class="btn-send-bot" [disabled]="loading() || !userInput.trim()">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .chat-wrapper { height: 100vh; display: flex; flex-direction: column; overflow: hidden; padding: 0 !important; }
    .chat-header { padding: 1.5rem 2.5rem; border-bottom: 1px solid var(--gray-100); background: white; z-index: 10; }
    .bot-avatar-large { width: 48px; height: 48px; background: var(--primary); color: var(--accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid var(--accent); }
    .chat-status { display: flex; align-items: center; gap: 0.5rem; margin-top: 4px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gray-300); }
    .online .status-dot { background: var(--success); box-shadow: 0 0 5px var(--success); }

    .chat-main-layout { display: flex; flex: 1; overflow: hidden; }
    .conv-sidebar { width: 300px; background: var(--gray-50); border-right: 1px solid var(--gray-100); padding: 1.5rem; display: flex; flex-direction: column; }
    .conv-list-premium { flex: 1; overflow-y: auto; }
    .conv-entry { padding: 1rem; border-radius: 12px; cursor: pointer; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.05s; border: 1px solid transparent; }
    .conv-entry:hover { background: white; border-color: var(--gray-200); }
    .conv-entry.active { background: white; border-color: var(--accent); box-shadow: var(--shadow-sm); }
    .conv-name { font-size: 0.85rem; font-weight: 700; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
    .conv-time { font-size: 0.7rem; color: var(--gray-400); margin-top: 4px; }
    .conv-action-btn { background: none; border: none; color: var(--gray-300); cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0; transition: opacity 0.2s; }
    .conv-entry:hover .conv-action-btn { opacity: 1; }
    .conv-action-btn:hover { color: var(--danger); }
    .empty-sessions { text-align: center; color: var(--gray-400); padding: 3rem 1rem; font-size: 0.8rem; }

    .chat-engine { flex: 1; display: flex; flex-direction: column; background: white; position: relative; }
    .messages-scroll { flex: 1; overflow-y: auto; padding: 2rem 4rem; }
    
    .welcome-view { text-align: center; padding: 3rem 0; max-width: 800px; margin: 0 auto; }
    .welcome-logo { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.5; }
    .suggestions-matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left; }
    .suggestion-tile { display: flex; gap: 1rem; padding: 1.25rem; border: 1px solid var(--gray-100); border-radius: 16px; background: white; cursor: pointer; transition: all 0.05s; text-align: left; }
    .suggestion-tile:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: var(--shadow); }
    .tile-icon { font-size: 1.5rem; }
    .tile-label { display: block; font-weight: 800; font-size: 0.8rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; }
    .tile-desc { display: block; font-size: 0.75rem; color: var(--gray-400); margin-top: 2px; }

    .message-feed { display: flex; flex-direction: column; gap: 1.5rem; }
    .msg-row { display: flex; width: 100%; }
    .msg-row.user { justify-content: flex-end; }
    .msg-bubble { max-width: 70%; padding: 1.25rem 1.5rem; border-radius: 20px; font-size: 0.95rem; line-height: 1.6; position: relative; }
    .msg-bubble.assistant { background: var(--gray-50); color: var(--primary); border-bottom-left-radius: 4px; }
    .msg-bubble.user { background: var(--primary); color: white; border-bottom-right-radius: 4px; box-shadow: var(--shadow-sm); }
    .msg-meta { font-size: 0.65rem; margin-top: 0.5rem; opacity: 0.5; }
    
    .typing-bubble { padding: 1rem 1.5rem; min-width: 80px; }
    .typing-indicator { display: flex; gap: 4px; }
    .typing-indicator span { width: 6px; height: 6px; background: var(--gray-300); border-radius: 50%; animation: blink 1.4s infinite; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }

    .chat-input-container { padding: 1.5rem 4rem; border-top: 1px solid var(--gray-100); }
    .premium-chat-form { display: flex; gap: 1rem; align-items: center; background: var(--gray-50); padding: 0.6rem 0.6rem 0.6rem 1.5rem; border-radius: 100px; border: 1px solid var(--gray-100); }
    .premium-chat-form input { flex: 1; border: none; background: none; outline: none; font-size: 0.95rem; color: var(--primary); }
    .btn-send-bot { width: 44px; height: 44px; border: none; border-radius: 50%; background: var(--primary); color: var(--accent); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.05s; }
    .btn-send-bot:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .btn-send-bot:disabled { opacity: 0.3; cursor: not-allowed; }
  `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesList') private messagesList!: ElementRef;

  navItems = CLIENT_NAV;
  conversations = signal<ChatConversation[]>([]);
  messages = signal<ChatMessage[]>([]);
  activeConvId = signal<number | null>(null);
  loading = signal(false);
  error = signal('');
  userInput = '';
  private shouldScroll = false;

  suggestions = [
    { icon: '💰', label: 'Mon solde', text: 'Quel est le solde de mon compte et ma carte ?' },
    { icon: '💸', label: 'Virement simple', text: 'Comment faire un virement simple étape par étape ?' },
    { icon: '👥', label: 'Virement groupé', text: 'Comment envoyer de l\'argent à plusieurs personnes ?' },
    { icon: '🔄', label: 'Virement permanent', text: 'Comment configurer un virement automatique récurrent ?' },
    { icon: '📊', label: 'Crédit', text: 'Je veux simuler un crédit, quels sont les taux et conditions ?' },
    { icon: '💳', label: 'Ma carte', text: 'Comment fonctionne ma carte et les virements carte/compte ?' },
    { icon: '📋', label: 'Mes opérations', text: 'Résume mes dernières transactions et virements en attente' },
    { icon: '🔔', label: 'Notifications', text: 'Est-ce que j\'ai des notifications non lues ?' },
    { icon: '🏦', label: 'Agences', text: 'Quels sont les horaires et le contact du service client ?' },
    { icon: '🔒', label: 'Sécurité', text: 'Comment mon compte est-il protégé contre la fraude ?' },
    { icon: '📱', label: 'Services', text: 'Quels sont tous les services disponibles dans l\'application ?' },
    { icon: '❓', label: 'Aide', text: 'Mon compte ou ma carte est désactivé, que faire ?' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadConversations(); }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  loadConversations() {
    this.api.getChatConversations().subscribe({
      next: (convs) => this.conversations.set(convs),
      error: (e) => { if (e.status === 0) this.error.set('Le service chatbot n\'est pas accessible.'); }
    });
  }

  selectConversation(id: number) {
    this.activeConvId.set(id);
    this.error.set('');
    this.api.getChatConversation(id).subscribe({
      next: (detail) => { this.messages.set(detail.messages); this.shouldScroll = true; },
      error: () => this.error.set('Erreur de chargement')
    });
  }

  newConversation() {
    this.activeConvId.set(null);
    this.messages.set([]);
    this.error.set('');
    this.userInput = '';
  }

  deleteConversation(id: number, event: Event) {
    event.stopPropagation();
    this.api.deleteChatConversation(id).subscribe({
      next: () => {
        this.loadConversations();
        if (this.activeConvId() === id) { this.activeConvId.set(null); this.messages.set([]); }
      }
    });
  }

  sendSuggestion(text: string) { this.userInput = text; this.sendMessage(); }

  sendMessage() {
    const msg = this.userInput.trim();
    if (!msg || this.loading()) return;

    this.userInput = '';
    this.error.set('');
    this.loading.set(true);

    const tempUserMsg: ChatMessage = { id: Date.now(), role: 'user', content: msg, created_at: new Date().toISOString() };
    this.messages.update(msgs => [...msgs, tempUserMsg]);
    this.shouldScroll = true;

    this.api.sendChatMessage(this.activeConvId(), msg).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!this.activeConvId()) this.activeConvId.set(res.conversation_id);
        this.messages.update(msgs => [...msgs, res.message]);
        this.shouldScroll = true;
        this.loadConversations();
      },
      error: (e) => {
        this.loading.set(false);
        if (e.status === 0) {
          this.error.set('Le service chatbot n\'est pas démarré.');
        } else if (e.status === 401) {
          this.error.set('Session expirée. Veuillez vous reconnecter.');
        } else {
          this.error.set(e.error?.detail || 'Erreur de communication avec l\'assistant.');
        }
        this.messages.update(msgs => msgs.filter(m => m.id !== tempUserMsg.id));
        this.userInput = msg;
      }
    });
  }

  private scrollToBottom() {
    try { const el = this.messagesList?.nativeElement; if (el) el.scrollTop = el.scrollHeight; } catch {}
  }
}
