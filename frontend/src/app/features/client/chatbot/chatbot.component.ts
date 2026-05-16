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
                <span class="outfit size-xs uppercase font-bold">{{ error() ? 'Hors ligne' : 'Disponible' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-main-layout">
          <div class="chat-engine">
            <div class="messages-scroll" #messagesList>
              @if (messages().length === 0 && !loading()) {
                <div class="welcome-view animate-in">
                  <div class="welcome-logo">🏦</div>
                  <h2 class="outfit">Amen Bank Assistant</h2>
                  <p class="outfit color-gray-400">Posez une question sur vos comptes, transactions ou services Amen Bank.</p>
                </div>
              }
              
              <div class="message-feed">
                @for (msg of messages(); track msg.id) {
                  <div class="msg-row" [class.user]="msg.role === 'user'">
                    <div class="msg-bubble" [class.assistant]="msg.role === 'assistant'" [class.user]="msg.role === 'user'">
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
              <form (ngSubmit)="sendMessage()" class="premium-chat-form shadow-premium">
                <input type="text" [(ngModel)]="userInput" name="msg" 
                       placeholder="Écrivez votre message ici..." 
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
    .messages-scroll { flex: 1; overflow-y: auto; padding: 2rem 2.5rem; }
    .welcome-view { min-height: 55vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .welcome-logo { width: 64px; height: 64px; border-radius: 16px; background: var(--gray-50); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1rem; }
    .welcome-view h2 { color: var(--primary); margin-bottom: 0.5rem; }
    .welcome-view p { max-width: 420px; }
    .message-feed { display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto; }

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
    @media (max-width: 700px) {
      .chat-header { padding: 1rem; }
      .messages-scroll { padding: 1rem; }
      .chat-input-container { padding: 1rem; }
      .msg-bubble { max-width: 88%; padding: 1rem; }
    }
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
