import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Order } from '../models/order';
import { OrdersService } from '../services/orders.service';

/** Order blotter shared by the Rebalance tab, the Orders tab and the Stochastix AI chat. */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly api = inject(OrdersService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly count = computed(() => this.orders().length);
  readonly accountCount = computed(() => new Set(this.orders().map((o) => o.account_id)).size);
  readonly totalSells = computed(() => sum(this.orders().filter((o) => o.side === 'Sell')));
  readonly totalBuys = computed(() => sum(this.orders().filter((o) => o.side === 'Buy')));

  refresh(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clear(): Observable<unknown> {
    return this.api.clear().pipe(tap(() => this.orders.set([])));
  }
}

function sum(orders: Order[]): number {
  return orders.reduce((total, o) => total + o.est_value, 0);
}
