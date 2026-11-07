import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MarketDashboardComponent } from './market-dashboard.component';

const API = environment.apiBaseUrl;
const base = { notice: 'n', updated_at: '2026-10-27T21:00:00Z', errors: [] };

describe('MarketDashboardComponent', () => {
  it('places the heatmap above MarketWatch', async () => {
    TestBed.configureTestingModule({
      imports: [MarketDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MarketDashboardComponent);
    const http = TestBed.inject(HttpTestingController);
    const el = fixture.nativeElement as HTMLElement;

    http.expectOne(`${API}/market/heatmap?size=100`).flush({
      ...base, agent: 'MarketHeatmapAgent', items: [], sectors: [],
    });
    http.expectOne(`${API}/market/news`).flush({ ...base, agent: 'MarketAnalyzerAgent', items: [] });
    http.expectOne(`${API}/market/earnings?days=14`).flush({ ...base, agent: 'EarningsAgent', items: [] });
    http.expectOne(`${API}/market/corporate-actions?days=30`).flush({
      ...base, agent: 'CorporateActionsAgent', items: [],
    });
    await fixture.whenStable();

    const heatmap = el.querySelector('[data-testid="widget-heatmap"]')!;
    const marketWatch = el.querySelector('.page-heading')!;
    expect(heatmap.compareDocumentPosition(marketWatch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    http.verify();
  });
});
