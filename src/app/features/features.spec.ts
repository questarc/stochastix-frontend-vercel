import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMarkdown } from 'ngx-markdown';
import { of } from 'rxjs';
import { AudioInfo, ChatMessage, ChatResponse } from '../core/models/chat';
import { Order } from '../core/models/order';
import { RebalanceResponse } from '../core/models/rebalance';
import { SimulationResponse, SimulationResult } from '../core/models/simulation';
import { ChatService } from '../core/services/chat.service';
import { OrdersService } from '../core/services/orders.service';
import { RebalanceService } from '../core/services/rebalance.service';
import { VoiceService } from '../core/services/voice.service';
import { OrdersStore } from '../core/state/orders.store';
import { SimulationStore } from '../core/state/simulation.store';
import { AdvisorAiComponent } from './advisor-ai/advisor-ai.component';
import { ChatMessageComponent } from './advisor-ai/chat-message.component';
import { RebalanceTabComponent } from './rebalance/rebalance-tab.component';
import { SimulationTabComponent } from './simulation/simulation-tab.component';

function result(success: number, median: number): SimulationResult {
  return {
    success_probability: success, ages: [60, 61], bands: { p10: [1, 1], p25: [1, 1], p50: [1, 1], p75: [1, 1], p90: [1, 1] },
    ending_values_histogram: { bin_edges: [0, 1], counts: [1] }, depletion_ages_histogram: { ages: [], counts: [] },
    median_ending_value_todays_dollars: median, failed_trials: 0,
    settings: { seed: 42, sampling: 'prng', copula: 'gaussian', copula_df: 5, trials: 1000, years: 1, distributions: {} },
  };
}

const ORDER: Order = {
  order_id: 'A1001-1-001', account_id: 'A1001', model_id: 'MOD-60-40', side: 'Sell', ticker: 'VTI',
  asset_class: 'US Equity', quantity: 1, order_type: 'Market', time_in_force: 'Day', est_price: 300,
  est_value: 300, status: 'Pending', created_at: '2026-01-01T00:00:00Z',
};

const baseProviders = [provideHttpClient(), provideHttpClientTesting(), provideMarkdown()];

describe('SimulationTabComponent', () => {
  it('renders the probability of success metrics from the response', async () => {
    const response: SimulationResponse = {
      account_id: 'A1001', model_id: 'MOD-60-40', current: result(0.7679, 1_234_567), model: result(0.7783, 2_000_000),
    };
    TestBed.configureTestingModule({
      imports: [SimulationTabComponent],
      providers: [...baseProviders, { provide: SimulationStore, useValue: { response: signal(response), loading: signal(false) } }],
    });
    const fixture = TestBed.createComponent(SimulationTabComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="success-current"]')?.textContent).toContain('76.8%');
    expect(el.querySelector('[data-testid="success-model"]')?.textContent).toContain('77.8%');
    expect(el.querySelector('[data-testid="success-model"]')?.textContent).toContain('+1.0 pp');
    expect(el.querySelector('[data-testid="median-ending"]')?.textContent).toContain('$1,234,567');
    expect(el.textContent).toContain('No trials ran out of money.');
  });
});

describe('RebalanceTabComponent', () => {
  it('shows the "No trades needed" state', async () => {
    const proposal: RebalanceResponse = {
      account_id: 'A1001', model_id: 'MOD-60-40', model_name: 'Moderate 60/40', market_value: 100_000,
      max_drift: 0.01, rebalance_needed: false, trades: [], allocation: [], total_sells: 0, total_buys: 0,
      uninvested_cash: 0, success_current: 0.8, success_after: 0.8,
    };
    TestBed.configureTestingModule({
      imports: [RebalanceTabComponent],
      providers: [
        ...baseProviders,
        { provide: RebalanceService, useValue: { settings: () => of({ drift_tolerance: 0.02, min_trade_value: 500, whole_shares: true }), propose: () => of(proposal) } },
      ],
    });
    const fixture = TestBed.createComponent(RebalanceTabComponent);
    fixture.componentInstance.proposal.set(proposal);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')?.textContent).toContain('Rebalance to Moderate 60/40');
    expect(el.querySelector('[data-testid="no-trades"]')?.textContent).toContain(
      'Every asset class is within 2.0% of the model. No trades needed.',
    );
    expect(el.textContent).not.toContain('Generate orders');
  });
});

describe('AdvisorAiComponent', () => {
  const reply: ChatResponse = { text: 'Created orders. Price $300.', tool_calls: [], orders_added: 1, orders: [ORDER] };

  function setup() {
    TestBed.configureTestingModule({
      imports: [AdvisorAiComponent],
      providers: [
        ...baseProviders,
        { provide: ChatService, useValue: { send: () => of(reply), reset: () => of({ reset: true }) } },
        { provide: OrdersService, useValue: { list: () => of([ORDER]) } },
      ],
    });
    const fixture = TestBed.createComponent(AdvisorAiComponent);
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('updates the orders count (badge) after the chat returns orders_added', async () => {
    const { fixture, cmp, el } = setup();
    const orders = TestBed.inject(OrdersStore);
    expect(orders.count()).toBe(0);
    cmp.open.set(true);
    cmp.send('Simulate and rebalance this account.');
    await fixture.whenStable();
    expect(orders.count()).toBe(1);
    expect(el.querySelector('[data-testid="orders-notice"]')?.textContent).toContain('1 order(s) added');
  });

  it('shows the Create audio button under the AI answer in the chat window', async () => {
    const { fixture, cmp, el } = setup();
    cmp.open.set(true);
    cmp.send('Compare the current portfolio with the model portfolio.');
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="voice-create"]')?.textContent).toContain('Create audio');
  });

  it('moves through normal → max → min → normal and hides the input when minimized', async () => {
    const { fixture, cmp, el } = setup();
    const click = async (id: string) => {
      (el.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
      await fixture.whenStable();
    };
    await click('chat-fab');
    expect(cmp.size()).toBe('normal');
    expect(el.querySelector('[data-testid="chat-input"]')).toBeTruthy();
    await click('btn-max');
    expect(cmp.size()).toBe('max');
    expect(el.querySelector('[data-testid="chat-panel"]')?.classList).toContain('max');
    await click('btn-min');
    expect(cmp.size()).toBe('min');
    expect(el.querySelector('[data-testid="chat-input"]')).toBeNull();
    expect(el.querySelector('[data-testid="btn-min"]')?.getAttribute('aria-label')).toBe('Restore');
    await click('btn-min');
    expect(cmp.size()).toBe('normal');
    expect(el.querySelector('[data-testid="chat-input"]')).toBeTruthy();
    await click('chat-fab');
    expect(el.querySelector('[data-testid="chat-panel"]')).toBeNull();
  });

  it('shows no suggested commands and keeps the message input available on an empty chat', async () => {
    const { fixture, el } = setup();
    const click = el.querySelector('[data-testid="chat-fab"]') as HTMLButtonElement;
    click.click();
    await fixture.whenStable();

    expect(el.querySelector('.examples')).toBeNull();
    expect(el.querySelector('[data-testid="chat-panel"]')?.textContent).not.toContain('Compare the current portfolio');
    expect(el.querySelector('[data-testid="chat-input"]')).toBeTruthy();
  });
});

describe('ChatMessageComponent audio (VoiceGenAgent)', () => {
  const AUDIO: AudioInfo = {
    audio_id: 'abc', account_id: 'A1001', client_name: 'Jane Smith', script: 'Retirement plan update…',
    voice: 'en_US-lessac-medium', duration_seconds: 24, created_at: '2026-10-27T00:00:00Z',
    file_name: 'A1001_summary_20261027_000000.wav', url: '/voice/abc',
  };

  function setup(message: ChatMessage) {
    const calls: { text: string; accountId?: string | null }[] = [];
    TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [
        ...baseProviders,
        { provide: VoiceService, useValue: {
          create: (text: string, accountId?: string | null) => { calls.push({ text, accountId }); return of(AUDIO); },
          playUrl: () => 'http://api/voice/abc', downloadUrl: () => 'http://api/voice/abc?download=true',
        } },
      ],
    });
    const fixture = TestBed.createComponent(ChatMessageComponent);
    fixture.componentRef.setInput('message', message);
    return { fixture, calls, el: fixture.nativeElement as HTMLElement };
  }

  it('creates audio from the summary and offers play and download', async () => {
    const { fixture, calls, el } = setup({ role: 'assistant', text: 'Success is 76.8%.', accountId: 'A1001' });
    await fixture.whenStable();
    (el.querySelector('[data-testid="voice-create"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(calls).toEqual([{ text: 'Success is 76.8%.', accountId: 'A1001' }]);
    expect(el.querySelector('audio')?.getAttribute('src')).toBe('http://api/voice/abc');
    const link = el.querySelector('[data-testid="voice-download"]') as HTMLAnchorElement;
    expect(link.getAttribute('download')).toBe(AUDIO.file_name);
    expect(link.getAttribute('href')).toContain('download=true');
  });

  it('shows the player directly when the agent already created audio, and hides it for user/error messages', async () => {
    const agent = setup({ role: 'assistant', text: 'Ready.', audio: AUDIO });
    await agent.fixture.whenStable();
    expect(agent.el.querySelector('audio')).toBeTruthy();
    expect(agent.el.querySelector('[data-testid="voice-create"]')).toBeNull();
    TestBed.resetTestingModule();
    const user = setup({ role: 'user', text: 'hi' });
    await user.fixture.whenStable();
    expect(user.el.querySelector('[data-testid="voice"]')).toBeNull();
    TestBed.resetTestingModule();
    const error = setup({ role: 'assistant', text: '⚠️ failed', error: true });
    await error.fixture.whenStable();
    expect(error.el.querySelector('[data-testid="voice"]')).toBeNull();
  });
});
