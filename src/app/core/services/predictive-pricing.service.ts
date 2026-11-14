import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PredictivePriceResult } from '../models/predictive-pricing';

@Injectable({ providedIn: 'root' })
export class PredictivePricingService {
  private readonly api = inject(ApiService);

  predict(symbol: string, currentPrice: number): Observable<PredictivePriceResult> {
    return this.api.post<PredictivePriceResult>('/predictive-pricing/predict', {
      symbol,
      current_price: currentPrice,
    });
  }
}