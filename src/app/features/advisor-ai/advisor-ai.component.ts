import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Observable, from } from 'rxjs';
import { ChatMessage, ChatRequest, ChatResponse, ChatWindowSize } from '../../core/models/chat';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { ChatService } from '../../core/services/chat.service';
import { OrdersStore } from '../../core/state/orders.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { BrowserAgentService } from '../../core/webllm/browser-agent.service';
import { WEBLLM_PROVIDER_ID } from '../../core/webllm/webllm.models';
import { WebLlmService } from '../../core/webllm/webllm.service';
import { ChatMessageComponent } from './chat-message.component';

function newThreadId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

@Component({
  selector: 'app-advisor-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, ChatMessageComponent],
  templateUrl: './advisor-ai.component.html',
  styleUrl: './advisor-ai.component.scss',
})
export class AdvisorAiComponent {
  private readonly chat = inject(ChatService);
  private readonly workspace = inject(WorkspaceStore);
  private readonly orders = inject(OrdersStore);
  private readonly browserAgent = inject(BrowserAgentService);
  protected readonly webllm = inject(WebLlmService);

  readonly open = signal(false);
  readonly size = signal<ChatWindowSize>('normal');
  readonly messages = signal<ChatMessage[]>([]);
  readonly sending = signal(false);
  readonly threadId = signal(newThreadId());
  readonly draft = signal('');

  protected readonly providerLabel = computed(() => this.workspace.llmProvider()?.label ?? this.workspace.llm().provider);
  protected readonly modelName = computed(() => this.workspace.llm().model ?? '');
  protected readonly isWebLlm = computed(() => this.workspace.llm().provider === WEBLLM_PROVIDER_ID);
  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  constructor() {
    afterRenderEffect(() => {
      this.messages();
      this.sending();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  toggleOpen(): void {
    if (this.open()) this.size.set('normal');
    this.open.update((o) => !o);
  }

  toggleMinimize(): void {
    this.size.update((s) => (s === 'min' ? 'normal' : 'min'));
  }

  toggleMaximize(): void {
    this.size.update((s) => (s === 'max' ? 'normal' : 'max'));
  }

  newConversation(): void {
    const old = this.threadId();
    this.browserAgent.reset(old);
    this.chat.reset(old).subscribe({ error: () => undefined });
    this.threadId.set(newThreadId());
    this.messages.set([]);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(text: string = this.draft()): void {
    const message = text.trim();
    if (!message || this.sending()) return;
    this.draft.set('');
    this.messages.update((m) => [...m, { role: 'user', text: message }]);
    this.sending.set(true);
    const { provider, model } = this.workspace.llm();
    const accountId = this.workspace.accountId();
    this.ask({
      message,
      thread_id: this.threadId(),
      provider,
      model,
      account_id: accountId,
      model_id: this.workspace.modelId(),
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.messages.update((m) => [
          ...m,
          {
            role: 'assistant', text: res.text, toolCalls: res.tool_calls, ordersAdded: res.orders_added,
          },
        ]);
        if (res.orders_added > 0) this.orders.refresh();
      },
      error: (err) => {
        this.sending.set(false);
        this.messages.update((m) => [...m, { role: 'assistant', text: `⚠️ ${errorDetail(err)}`, error: true }]);
      },
    });
  }

  private ask(req: ChatRequest): Observable<ChatResponse> {
    if (req.provider !== WEBLLM_PROVIDER_ID) return this.chat.send(req);
    return from(this.browserAgent.ask(req.message, req.thread_id, req.model ?? '', req.account_id, req.model_id));
  }
}
