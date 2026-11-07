import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { BrowserAgentService, MAX_AGENT_STEPS, selectionPrefix } from './browser-agent.service';
import { describeTools, parseToolCalls } from './tool-calls';
import { WebLlmService } from './webllm.service';

const SPEC = {
  system_prompt: 'You are Stochastix AI.',
  tools: [
    { type: 'function', function: { name: 'simulate_and_rebalance', description: 'Simulate and rebalance.',
      parameters: { properties: { client_name: { type: 'string', description: 'x' } }, required: [] } } },
    { type: 'function', function: { name: 'compare_current_vs_model', description: 'Compare.',
      parameters: { properties: { account_id: { type: 'string' } }, required: ['account_id'] } } },
  ],
};

describe('tool-call parsing', () => {
  const known = ['compare_current_vs_model', 'simulate_and_rebalance'];

  it('reads <tool_call> blocks, string arguments and bare JSON calls', () => {
    const text = 'Let me check.\n<tool_call>\n{"name": "compare_current_vs_model", "arguments": "{\\"account_id\\": \\"A1001\\"}"}\n</tool_call>';
    expect(parseToolCalls(text, known)).toEqual({
      calls: [{ name: 'compare_current_vs_model', args: { account_id: 'A1001' } }], text: 'Let me check.',
    });
    expect(parseToolCalls('{"name": "simulate_and_rebalance", "parameters": {"client_name": "Jane"}}', known).calls)
      .toEqual([{ name: 'simulate_and_rebalance', args: { client_name: 'Jane' } }]);
  });

  it('treats plain text and unknown tools as the final answer', () => {
    expect(parseToolCalls('Success is 76.8%.', known)).toEqual({ calls: [], text: 'Success is 76.8%.' });
    expect(parseToolCalls('<tool_call>{"name": "rm_rf", "arguments": {}}</tool_call>', known).calls).toEqual([]);
  });

  it('describes tools compactly with required arguments', () => {
    const text = describeTools(SPEC.tools as never);
    expect(text).toContain('- compare_current_vs_model: Compare. Required: account_id.');
    expect(text).not.toContain('"description"');
  });

  it('builds the same selection prefix as the back end', () => {
    expect(selectionPrefix('A1001', null)).toBe(
      '[Account selected in the app: A1001 (use only if the question names no client or account)]\n',
    );
  });
});

describe('BrowserAgentService', () => {
  function setup(replies: string[]) {
    const prompts: { role: string; content: string }[][] = [];
    const engine = {
      chat: { completions: { create: async ({ messages }: { messages: { role: string; content: string }[] }) => {
        prompts.push(messages);
        return { choices: [{ message: { content: replies[Math.min(prompts.length - 1, replies.length - 1)] } }] };
      } } },
    };
    const posts: { path: string; body: unknown }[] = [];
    const api = {
      get: () => of(SPEC),
      post: (path: string, body: unknown) => {
        posts.push({ path, body });
        const orders = path.endsWith('simulate_and_rebalance') ? [{ order_id: 'A1001-1-001', account_id: 'A1001' }] : [];
        return of({ tool: path.split('/').pop(), args: (body as { args: object }).args, result: '{"ok": true}',
          orders_added: orders.length, orders });
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: api }, { provide: WebLlmService, useValue: { ensure: async () => engine } }],
    });
    return { agent: TestBed.inject(BrowserAgentService), prompts, posts };
  }

  it('runs tools in the back end, returns their orders and the final answer', async () => {
    const { agent, prompts, posts } = setup([
      '<tool_call>{"name": "simulate_and_rebalance", "arguments": {"client_name": "Jane"}}</tool_call>',
      'Created 1 pending order. Projections are not guarantees.',
    ]);
    const res = await agent.ask('Simulate and rebalance Jane', 't1', 'Qwen2.5-7B-Instruct-q4f16_1-MLC', 'A1001');
    expect(posts).toEqual([{ path: '/agent/tools/simulate_and_rebalance', body: { args: { client_name: 'Jane' } } }]);
    expect(res.text).toBe('Created 1 pending order. Projections are not guarantees.');
    expect(res.tool_calls[0].tool).toBe('simulate_and_rebalance');
    expect(res.orders_added).toBe(1);
    expect(prompts[0][0].content).toContain('Available tools:');
    expect(prompts[0][1].content).toContain('[Account selected in the app: A1001');
    expect(prompts[1].at(-1)?.content).toContain('<tool_response>');
  });

  it('keeps conversation memory per thread until reset', async () => {
    const { agent, prompts } = setup(['Hello.']);
    await agent.ask('hi', 't2', 'm');
    await agent.ask('again', 't2', 'm');
    expect(prompts[1].map((m) => m.content)).toContain('Hello.');
    agent.reset('t2');
    await agent.ask('new', 't2', 'm');
    expect(prompts[2].map((m) => m.content)).not.toContain('Hello.');
  });

  it('stops after the step limit', async () => {
    const { agent, posts } = setup(['<tool_call>{"name": "compare_current_vs_model", "arguments": {"account_id": "A1001"}}</tool_call>']);
    const res = await agent.ask('loop', 't3', 'm');
    expect(posts.length).toBe(MAX_AGENT_STEPS);
    expect(res.text).toContain('step limit');
  });
});
