import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { CorporateActionsFeed, EarningsFeed, HeatmapFeed, NewsFeed } from '../models/market';
import { ApiService } from './api.service';

/** MarketAnalyzerAgent, EarningsAgent and CorporateActionsAgent (back end, free no-key sources). */
@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly api = inject(ApiService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

  news(refresh = false): Observable<NewsFeed> {
    return this.api.get<NewsFeed>('/market/news', { refresh: refresh || null }, this.context);
  }

  earnings(days = 14, refresh = false): Observable<EarningsFeed> {
    return this.api.get<EarningsFeed>('/market/earnings', { days, refresh: refresh || null }, this.context);
  }

  corporateActions(days = 30, refresh = false): Observable<CorporateActionsFeed> {
    return this.api.get<CorporateActionsFeed>('/market/corporate-actions', { days, refresh: refresh || null }, this.context);
  }

  heatmap(size = 100, refresh = false): Observable<HeatmapFeed> {
    return this.api.get<HeatmapFeed>('/market/heatmap', { size, refresh: refresh || null }, this.context);
  }
}
