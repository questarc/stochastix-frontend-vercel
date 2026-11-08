import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownComponent } from 'ngx-markdown';
import { ChatMessage } from '../../core/models/chat';

/** Escape `$` so markdown renderers never read dollar amounts as maths. */
export function escapeDollars(text: string): string {
  return text.replace(/(?<!\\)\$/g, '\\$');
}

export function parseToolResult(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

@Component({
  selector: 'app-chat-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, MatIconModule, MarkdownComponent, JsonPipe],
  template: `
    @let m = message();
    <div class="bubble" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'" [class.error]="m.error">
      @if (m.role === 'user') {
        <span class="text">{{ m.text }}</span>
      } @else {
        <markdown [data]="markdown()" />
      }
    </div>
    @if (m.ordersAdded) {
      <p class="orders-notice" data-testid="orders-notice">
        ✅ {{ m.ordersAdded }} order(s) added to the <strong>Orders</strong> tab
      </p>
    }
    @if (m.toolCalls?.length) {
      <mat-expansion-panel class="tools">
        <mat-expansion-panel-header>
          <mat-panel-title>Data used ({{ m.toolCalls!.length }} tool call(s))</mat-panel-title>
        </mat-expansion-panel-header>
        @for (call of m.toolCalls; track $index) {
          <div class="tool">
            <strong>{{ call.tool }}</strong> <code>{{ call.args | json }}</code>
            <pre>{{ parse(call.result) | json }}</pre>
          </div>
        }
      </mat-expansion-panel>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
    .bubble { max-width: 90%; padding: 0.5rem 0.75rem; border-radius: 0.75rem; overflow-wrap: anywhere; }
    .user { align-self: flex-end; background: var(--app-accent-strong); color: #fff; white-space: pre-wrap; }
    .assistant { align-self: flex-start; background: var(--app-panel-raised); color: var(--app-text);
      border: 1px solid var(--app-border); }
    .error { background: rgba(248, 113, 113, 0.12); color: var(--app-negative); }
    .orders-notice { margin: 0.35rem 0 0; padding: 0.35rem 0.6rem; border-radius: 0.5rem;
      background: rgba(74, 222, 128, 0.12); color: var(--app-positive); font-size: 0.85rem; align-self: flex-start; }
    .tools { margin-top: 0.35rem; font-size: 0.8rem; }
    .tool { margin-bottom: 0.5rem; }
    pre { max-height: 200px; overflow: auto; background: var(--app-bg); color: var(--app-text);
      padding: 0.5rem; font-size: 0.75rem; border-radius: 0.375rem; }
    code { font-size: 0.75rem; }
  `,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();

  protected readonly markdown = computed(() => escapeDollars(this.message().text));
  protected readonly parse = parseToolResult;
}
