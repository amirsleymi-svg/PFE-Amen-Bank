import { Component, signal, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  time: Date;
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="chat-page">
      <div class="chat-container">
        <div class="chat-header">
          <a [routerLink]="backLink()" class="back-btn">&larr; Retour</a>
          <h2>Assistant Amen Bank</h2>
          <span class="status-dot"></span>
        </div>

        <div class="chat-messages" #messagesContainer>
          @for (m of messages(); track $index) {
            <div class="message" [class.user]="m.role === 'user'" [class.bot]="m.role === 'bot'">
              <div class="bubble">{{ m.text }}</div>
            </div>
          }
          @if (loading()) {
            <div class="message bot">
              <div class="bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          }
        </div>

        @if (suggestions().length && messages().length <= 1) {
          <div class="suggestions">
            @for (s of suggestions(); track s) {
              <button class="suggestion-chip" (click)="send(s)">{{ s }}</button>
            }
          </div>
        }

        <div class="chat-input">
          <input
            type="text"
            [(ngModel)]="input"
            (keydown.enter)="send()"
            placeholder="Posez votre question..."
            [disabled]="loading()"
          />
          <button class="send-btn" (click)="send()" [disabled]="loading() || !input.trim()">
            Envoyer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary, #f8f9fa);
      padding: 1rem;
    }
    .chat-container {
      width: 100%;
      max-width: 700px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .chat-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: var(--primary, #003D6E);
      color: #fff;
    }
    .chat-header h2 { margin: 0; font-size: 1.1rem; flex: 1; }
    .back-btn {
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      opacity: 0.85;
      &:hover { opacity: 1; }
    }
    .status-dot {
      width: 10px; height: 10px;
      background: #4caf50;
      border-radius: 50%;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .message { display: flex; }
    .message.user { justify-content: flex-end; }
    .message.bot { justify-content: flex-start; }
    .bubble {
      max-width: 75%;
      padding: 0.75rem 1rem;
      border-radius: 16px;
      font-size: 0.95rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .message.user .bubble {
      background: var(--primary, #003D6E);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .message.bot .bubble {
      background: #f0f2f5;
      color: #1a1a1a;
      border-bottom-left-radius: 4px;
    }
    .typing {
      display: flex; gap: 4px; padding: 0.75rem 1.25rem;
    }
    .typing span {
      width: 8px; height: 8px;
      background: #999;
      border-radius: 50%;
      animation: typingDot 1.4s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingDot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0 1.5rem 0.75rem;
    }
    .suggestion-chip {
      background: #e8f0fe;
      color: var(--primary, #003D6E);
      border: 1px solid #c2d7f0;
      border-radius: 20px;
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
      &:hover { background: #d0e2fc; }
    }
    .chat-input {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #eee;
      background: #fafafa;
    }
    .chat-input input {
      flex: 1;
      padding: 0.7rem 1rem;
      border: 1px solid #ddd;
      border-radius: 24px;
      font-size: 0.95rem;
      outline: none;
      &:focus { border-color: var(--primary, #003D6E); }
    }
    .send-btn {
      padding: 0.7rem 1.5rem;
      background: var(--primary, #003D6E);
      color: #fff;
      border: none;
      border-radius: 24px;
      font-size: 0.9rem;
      cursor: pointer;
      &:disabled { opacity: 0.5; cursor: default; }
      &:hover:not(:disabled) { opacity: 0.9; }
    }
  `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesEl!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  suggestions = signal<string[]>([]);
  loading = signal(false);
  input = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  backLink() {
    const role = this.auth.userRole();
    if (role === 'CLIENT') return '/client/dashboard';
    if (role === 'EMPLOYEE') return '/employee/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    return '/login';
  }

  ngOnInit() {
    this.messages.set([{
      role: 'bot',
      text: 'Bonjour ! Je suis l\'assistant virtuel Amen Bank. Comment puis-je vous aider ?',
      time: new Date()
    }]);

    this.api.chatbotSuggestions().subscribe(r => {
      if (r.success && r.data) this.suggestions.set(r.data);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  send(text?: string) {
    const msg = (text ?? this.input).trim();
    if (!msg || this.loading()) return;
    this.input = '';

    this.messages.update(m => [...m, { role: 'user', text: msg, time: new Date() }]);
    this.loading.set(true);

    this.api.chatbotMessage(msg).subscribe({
      next: r => {
        const reply = r.data?.reply ?? 'Erreur lors de la communication avec l\'assistant.';
        this.messages.update(m => [...m, { role: 'bot', text: reply, time: new Date() }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update(m => [...m, {
          role: 'bot',
          text: 'Desole, une erreur s\'est produite. Veuillez reessayer.',
          time: new Date()
        }]);
        this.loading.set(false);
      }
    });
  }

  private scrollToBottom() {
    try {
      this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight;
    } catch {}
  }
}
