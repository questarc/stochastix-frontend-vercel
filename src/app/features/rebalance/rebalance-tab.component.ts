import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, catchError, debounceTime, filter, finalize, switchMap, tap } from 'rxjs';
import { RebalanceRequest, RebalanceResponse } from '../../core/models/rebalance';
import { OrdersService } from '../../core/services/orders.service';
import { RebalanceService } from '../../core/services/rebalance.service';
import { OrdersStore } from '../../core/state/orders.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Percent1Pipe } from '../../shared/pipes/percent1.pipe';

@Component({
  selector: 'app-rebalance-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSliderModule, MatTableModule, MatTooltipModule, MoneyPipe, Percent1Pipe,
  ],
  templateUrl: './rebalance-tab.component.html',
  styleUrl: './rebalance-tab.component.scss',
})
export class RebalanceTabComponent {
  private readonly workspace = inject(WorkspaceStore);
  private readonly api = inject(RebalanceService);
  private readonly ordersApi = inject(OrdersService);
  private readonly ordersStore = inject(OrdersStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly driftTolerance = signal(0.02);
  readonly minTradeValue = signal(500);
  readonly wholeShares = signal(true);
  readonly proposal = signal<RebalanceResponse | null>(null);
  readonly loading = signal(false);
  readonly generating = signal(false);

  protected readonly tradeColumns = ['ticker', 'asset_class', 'side', 'quantity', 'price', 'value'];
  protected readonly allocationColumns = ['asset_class', 'current', 'model', 'post_trade'];
  protected readonly driftLabel = (v: number) => `${v}%`;

  readonly request = computed<RebalanceRequest | null>(() => {
    const simulation = this.workspace.simulationRequest();
    if (!simulation) return null;
    return {
      account_id: simulation.account_id,
      model_id: simulation.model_id,
      drift_tolerance: this.driftTolerance(),
      min_trade_value: this.minTradeValue(),
      whole_shares: this.wholeShares(),
      simulation,
    };
  });

  protected readonly successDeltaPp = computed(() => {
    const p = this.proposal();
    return p?.success_after != null && p.success_current != null ? (p.success_after - p.success_current) * 100 : 0;
  });

  constructor() {
    this.api.settings().subscribe((s) => {
      this.driftTolerance.set(s.drift_tolerance);
      this.minTradeValue.set(s.min_trade_value);
      this.wholeShares.set(s.whole_shares);
    });
    toObservable(this.request)
      .pipe(
        filter((r): r is RebalanceRequest => r !== null),
        debounceTime(400),
        tap(() => this.loading.set(true)),
        switchMap((r) => this.api.propose(r).pipe(catchError(() => EMPTY), finalize(() => this.loading.set(false)))),
        takeUntilDestroyed(),
      )
      .subscribe((p) => this.proposal.set(p));
  }

  protected setDriftPercent(value: number): void {
    this.driftTolerance.set(Math.round(value * 10) / 1000);
  }

  protected setMinTrade(value: number | string | null): void {
    const num = Number(value);
    if (value !== null && value !== '' && !Number.isNaN(num) && num >= 0) this.minTradeValue.set(num);
  }

  protected generateOrders(): void {
    const req = this.request();
    if (!req) return;
    this.generating.set(true);
    this.ordersApi.generate(req).subscribe({
      next: (orders) => {
        this.generating.set(false);
        this.snackBar.open(`${orders.length} orders generated for ${req.account_id}. See the Orders tab.`, 'OK', {
          duration: 5000,
        });
        this.ordersStore.refresh();
      },
      error: () => this.generating.set(false),
    });
  }
}
