import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownComponent } from 'ngx-markdown';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { AudioInfo, ChatMessage } from '../../core/models/chat';
import { VoiceService } from '../../core/services/voice.service';

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
  imports: [MatButtonModule, MatExpansionModule, MatIconModule, MarkdownComponent, JsonPipe],
  template: `
    @let m = message();
    <div class="bubble" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'" [class.error]="m.error">
      @if (m.role === 'user') {
        <span class="text">{{ m.text }}</span>
      } @else {
        <markdown [data]="markdown()" />
      }
    </div>
    @if (canVoice()) {
      <div class="voice" data-testid="voice">
        @if (audio(); as a) {
          <audio controls preload="none" [src]="playUrl(a)" aria-label="Audio summary"></audio>
          <a mat-stroked-button [href]="downloadUrl(a)" [attr.download]="a.file_name" data-testid="voice-download">
            <mat-icon>download</mat-icon> Download
          </a>
          <span class="voice-note">{{ a.duration_seconds }} s · {{ a.file_name }}</span>
        } @else {
          <button mat-stroked-button type="button" [disabled]="creating()" (click)="createAudio()"
                  data-testid="voice-create">
            <mat-icon>volume_up</mat-icon> {{ creating() ? 'Creating audio…' : 'Create audio' }}
          </button>
        }
        @if (voiceError(); as e) {
          <span class="voice-error">⚠️ {{ e }}</span>
        }
      </div>
    }
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
    .voice { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.4rem; align-self: flex-start; }
    audio { height: 2.25rem; max-width: 100%; }
    .voice-note { font-size: 0.75rem; color: var(--app-muted); }
    .voice-error { font-size: 0.8rem; color: var(--app-negative); }
  `,
})
export class ChatMessageComponent {
  private readonly voice = inject(VoiceService);

  readonly message = input.required<ChatMessage>();
  readonly audio = signal<AudioInfo | null>(null);
  readonly creating = signal(false);
  readonly voiceError = signal<string | null>(null);

  protected readonly markdown = computed(() => escapeDollars(this.message().text));
  protected readonly parse = parseToolResult;
  protected readonly canVoice = computed(() => {
    const m = this.message();
    return m.role === 'assistant' && !m.error && !!m.text.trim();
  });

  constructor() {
    effect(() => {
      const fromAgent = this.message().audio;
      if (fromAgent) this.audio.set(fromAgent);
    });
  }

  protected playUrl(a: AudioInfo): string {
    return this.voice.playUrl(a);
  }

  protected downloadUrl(a: AudioInfo): string {
    return this.voice.downloadUrl(a);
  }

  createAudio(): void {
    this.creating.set(true);
    this.voiceError.set(null);
    this.voice.create(this.message().text, this.message().accountId).subscribe({
      next: (a) => {
        this.audio.set(a);
        this.creating.set(false);
      },
      error: (err) => {
        this.voiceError.set(errorDetail(err));
        this.creating.set(false);
      },
    });
  }
}
