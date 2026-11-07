import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { HeatmapFeed } from '../../core/models/market';
import { MarketHeatmapComponent, signedPct } from './market-heatmap.component';

const API = environment.apiBaseUrl;
const FEED: HeatmapFeed = {
  agent: 'MarketHeatmapAgent', notice: 'n', updated_at: '2026-10-27T21:00:00Z', errors: [],
  items: [
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', industry: '', market_cap: 5e12, change_pct: 2.39, price: 200, held_by: [] },
    { symbol: 'VTI', name: 'Vanguard', sector: 'Other', industry: '', market_cap: 5e11, change_pct: -0.4, price: 300, held_by: ['A1001'] },
  ],
  sectors: [
    { sector: 'Technology', market_cap: 5e12, count: 1, change_pct: 2.39 },
    { sector: 'Other', market_cap: 5e11, count: 1, change_pct: -0.4 },
  ],
  breadth: { up: 1, down: 1, total: 2 }, market_change_pct: 2.136,
};

describe('MarketHeatmapComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [MarketHeatmapComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MarketHeatmapComponent);
    return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
  }

  it('builds a sector treemap sized by market cap, marks held tickers and shows the summary', async () => {
    const { fixture, http, el } = setup();
    http.expectOne(`${API}/market/heatmap?size=100`).flush(FEED);
    await fixture.whenStable();
    const [trace] = (fixture.componentInstance as unknown as { chartData: () => Record<string, unknown>[] }).chartData();
    expect(trace['type']).toBe('treemap');
    expect(trace['labels']).toEqual(['Technology', 'Other', 'NVDA', '★ VTI']);
    expect(trace['parents']).toEqual(['', '', 'sector:Technology', 'sector:Other']);
    expect(trace['values']).toEqual([0, 0, 5e12, 5e11]);
    expect(el.querySelector('[data-testid="heatmap-summary"]')?.textContent).toContain('+2.14%');
    expect(el.querySelector('[data-testid="heatmap-sectors"]')?.textContent).toContain('Technology +2.39%');
    http.verify();
  });

  it('changes size, refreshes and shows unavailable data', async () => {
    const { fixture, http, el } = setup();
    http.expectOne(`${API}/market/heatmap?size=100`).flush({ ...FEED, items: [], sectors: [],
      errors: [{ source: 'Nasdaq screener', error: 'ConnectError' }], market_change_pct: null });
    await fixture.whenStable();
    expect(el.textContent).toContain('unavailable right now');
    expect(el.textContent).toContain('Nasdaq screener unavailable');
    fixture.componentInstance.setSize(200);
    http.expectOne(`${API}/market/heatmap?size=200`).flush(FEED);
    fixture.componentInstance.load(true);
    http.expectOne(`${API}/market/heatmap?size=200&refresh=true`).flush(FEED);
    http.verify();
    expect(signedPct(-0.4)).toBe('-0.40%');
  });
});
