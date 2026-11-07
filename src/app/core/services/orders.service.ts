import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from '../models/order';
import { RebalanceRequest } from '../models/rebalance';
import { ApiService } from './api.service';

export type ExportFormat = 'csv' | 'json';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiService);

  list(): Observable<Order[]> {
    return this.api.get<Order[]>('/orders');
  }

  generate(request: RebalanceRequest): Observable<Order[]> {
    return this.api.post<Order[]>('/orders/generate', request);
  }

  clear(): Observable<{ cleared: boolean }> {
    return this.api.delete<{ cleared: boolean }>('/orders');
  }

  export(format: ExportFormat): Observable<Blob> {
    return this.api.download('/orders/export', { format });
  }
}
