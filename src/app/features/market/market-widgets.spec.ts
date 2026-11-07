import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MarketWidgetsComponent } from './market-widgets.component';

const API = environment.apiBaseUrl;
const base = { notice: 'n', updated_at: '2026-10-27T21:00:00Z', errors: [] };

describe('MarketWidgetsComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [MarketWidgetsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MarketWidgetsComponent);
    return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
  }

  it('shows news, earnings and corporate actions, with held badges and the holdings filter', async () => {
    const { fixture, http, el } = setup();
    http.expectOne(`${API}/market/news`).flush({ ...base, agent: 'MarketAnalyzerAgent', items: [
      { title: 'Fed holds rates', summary: '', url: 'https://fed/1', source: 'Federal Reserve',
        published_at: '2026-10-27T18:00:00Z', topics: ['Monetary policy'] }] });
    http.expectOne(`${API}/market/earnings?days=14`).flush({ ...base, agent: 'EarningsAgent', items: [
      { date: '2026-10-28', symbol: 'MSFT', name: 'Microsoft', time: 'After market close', eps_forecast: 4.71,
        last_year_eps: 4.13, market_cap: 3.9e12, estimates: 14, fiscal_quarter: 'Sep/2026', held_by: [], watchlist: true }] });
    http.expectOne(`${API}/market/corporate-actions?days=30`).flush({ ...base, agent: 'CorporateActionsAgent', items: [
      { type: 'Dividend', symbol: 'BND', name: 'Vanguard Total Bond', ex_date: '2026-10-30', pay_date: '2026-11-04',
        record_date: null, amount: 0.2275, ratio: null, held_by: ['A1001'] },
      { type: 'Split', symbol: 'XYZ', name: 'XYZ Corp', ex_date: '2026-11-09', pay_date: null, record_date: null,
        amount: null, ratio: '2 : 1', held_by: [] }] });
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="widget-news"]')?.textContent).toContain('Fed holds rates');
    expect(el.querySelector('[data-testid="widget-earnings"]')?.textContent).toContain('EPS est. $4.71');
    const actions = el.querySelector('[data-testid="widget-actions"]')!;
    expect(actions.textContent).toContain('BND');
    expect(actions.textContent).toContain('Held');
    expect(actions.textContent).toContain('2 : 1');
    (el.querySelector('[data-testid="held-only"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(actions.textContent).not.toContain('XYZ');
    expect(el.querySelector('[data-testid="widget-heatmap"]')).toBeNull();
    http.verify();
  });

  it('shows an error per widget and refreshes with refresh=true; collapses', async () => {
    const { fixture, http, el } = setup();
    http.expectOne(`${API}/market/news`).flush({ detail: 'down' }, { status: 502, statusText: 'Bad Gateway' });
    http.expectOne(`${API}/market/earnings?days=14`).flush({ ...base, agent: 'EarningsAgent', items: [] });
    http.expectOne(`${API}/market/corporate-actions?days=30`).flush({ ...base, agent: 'CorporateActionsAgent', items: [] });
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="widget-news"]')?.textContent).toContain('⚠️ down');
    expect(el.querySelector('[data-testid="widget-earnings"]')?.textContent).toContain('No earnings found');
    fixture.componentInstance.refresh('news');
    http.expectOne(`${API}/market/news?refresh=true`).flush({ ...base, agent: 'MarketAnalyzerAgent', items: [] });
    (el.querySelector('[data-testid="market-toggle"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="widget-news"]')).toBeNull();
    http.verify();
  });
});
