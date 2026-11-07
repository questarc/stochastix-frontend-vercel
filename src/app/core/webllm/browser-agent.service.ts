import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { AudioInfo, ChatResponse, ToolCall } from '../models/chat';
import { Order } from '../models/order';
import { ApiService } from '../services/api.service';
import { OpenAiTool, TOOL_INSTRUCTIONS, describeTools, parseToolCalls } from './tool-calls';
import { WebLlmService } from './webllm.service';

interface AgentSpec {
  system_prompt: string;
  tools: OpenAiTool[];
}

interface ToolRunResponse {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  orders_added: number;
  orders: Order[];
  audio?: AudioInfo[];
}

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export const MAX_AGENT_STEPS = 6;
const MAX_HISTORY_MESSAGES = 12;
const MODEL_RESULT_LIMIT = 1_500;
const DISPLAY_RESULT_LIMIT = 2_000;

export function selectionPrefix(accountId?: string | null, modelId?: string | null): string {
  const parts: string[] = [];
  if (accountId) parts.push(`Account selected in the app: ${accountId} (use only if the question names no client or account)`);
  if (modelId) parts.push(`Model portfolio selected in the app: ${modelId} (use only if the question names no model)`);
  return parts.length ? `[${parts.join('; ')}]\n` : '';
}

/**
 * Advisor AI agent whose language model runs in the browser (WebLLM). The tool loop runs here;
 * every tool executes in Python via POST /agent/tools/{name}, so all numbers still come from the back end.
 */
@Injectable({ providedIn: 'root' })
export class BrowserAgentService {
  private readonly api = inject(ApiService);
  private readonly webllm = inject(WebLlmService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);
  private readonly threads = new Map<string, Message[]>();
  private spec: Promise<AgentSpec> | null = null;

  async ask(message: string, threadId: string, model: string, accountId?: string | null,
            modelId?: string | null): Promise<ChatResponse> {
    const spec = await this.loadSpec();
    const engine = await this.webllm.ensure(model);
    const toolNames = spec.tools.map((t) => t.function.name);
    const system: Message = {
      role: 'system',
      content: `${spec.system_prompt}\n${TOOL_INSTRUCTIONS}${describeTools(spec.tools)}`,
    };
    const history = this.threads.get(threadId) ?? [];
    const turn: Message[] = [{ role: 'user', content: selectionPrefix(accountId, modelId) + message }];
    const toolCalls: ToolCall[] = [];
    const orders: Order[] = [];
    const audio: AudioInfo[] = [];
    let text = '';

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      const reply = await engine.chat.completions.create({
        messages: [system, ...history, ...turn],
        temperature: 0.1,
        max_tokens: 1024,
      });
      const content = reply.choices[0]?.message?.content ?? '';
      const parsed = parseToolCalls(content, toolNames);
      turn.push({ role: 'assistant', content });
      if (!parsed.calls.length) {
        text = parsed.text;
        break;
      }
      const responses: string[] = [];
      for (const call of parsed.calls) {
        const run = await this.runTool(call.name, call.args);
        toolCalls.push({ tool: run.tool, args: run.args, result: run.result.slice(0, DISPLAY_RESULT_LIMIT) });
        orders.push(...run.orders);
        audio.push(...(run.audio ?? []));
        responses.push(`<tool_response>\n{"name": "${run.tool}", "content": ${run.result.slice(0, MODEL_RESULT_LIMIT)}}\n</tool_response>`);
      }
      turn.push({ role: 'user', content: responses.join('\n') });
    }
    if (!text) text = 'I could not finish this request within the step limit. Please try a simpler question.';

    const saved = [...history, turn[0], { role: 'assistant' as const, content: text }];
    this.threads.set(threadId, trimHistory(saved));
    return { text, tool_calls: toolCalls, orders_added: orders.length, orders, audio };
  }

  reset(threadId: string): void {
    this.threads.delete(threadId);
  }

  private loadSpec(): Promise<AgentSpec> {
    this.spec ??= firstValueFrom(this.api.get<AgentSpec>('/agent/tools', undefined, this.context)).catch((e) => {
      this.spec = null;
      throw e;
    });
    return this.spec;
  }

  private runTool(name: string, args: Record<string, unknown>): Promise<ToolRunResponse> {
    return firstValueFrom(
      this.api.post<ToolRunResponse>(`/agent/tools/${encodeURIComponent(name)}`, { args }, this.context),
    );
  }
}

function trimHistory(messages: Message[]): Message[] {
  let trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}
