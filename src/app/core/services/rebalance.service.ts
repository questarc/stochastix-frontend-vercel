import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RebalanceRequest, RebalanceResponse, RebalanceSettings } from '../models/rebalance';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RebalanceService {
  private readonly api = inject(ApiService);

  settings(): Observable<RebalanceSettings> {
    return this.api.get<RebalanceSettings>('/rebalance/settings');
  }

  propose(request: RebalanceRequest): Observable<RebalanceResponse> {
    return this.api.post<RebalanceResponse>('/rebalance/proposal', request);
  }
}
