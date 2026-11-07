import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { OrdersStore } from '../../core/state/orders.store';
import { MethodologyTabComponent } from '../methodology/methodology-tab.component';
import { OrdersTabComponent } from '../orders/orders-tab.component';
import { RebalanceTabComponent } from '../rebalance/rebalance-tab.component';
import { SimulationTabComponent } from '../simulation/simulation-tab.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { map } from 'rxjs';

const ORDERS_TAB_INDEX = 2;

@Component({
  selector: 'app-quant-models-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatBadgeModule, MatButtonModule, MatIconModule, MatSidenavModule, MatTabsModule,
    HeaderComponent, MethodologyTabComponent, OrdersTabComponent,
    RebalanceTabComponent, SidebarComponent, SimulationTabComponent,
  ],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav #sidenav [mode]="isSmall() ? 'over' : 'side'" [opened]="!isSmall()" class="sidenav">
        <app-sidebar />
      </mat-sidenav>
      <mat-sidenav-content class="content">
        @if (isSmall()) {
          <button mat-icon-button type="button" aria-label="Open settings" (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
        }
        <app-header />
        <mat-tab-group (selectedTabChange)="onTabChange($event)" animationDuration="0ms">
          <mat-tab label="Simulation"><app-simulation-tab /></mat-tab>
          <mat-tab label="Rebalance"><app-rebalance-tab /></mat-tab>
          <mat-tab>
            <ng-template mat-tab-label>
              <span [matBadge]="ordersBadge()" [matBadgeHidden]="orders.count() === 0" matBadgeOverlap="false"
                    matBadgeSize="small" data-testid="orders-badge">Orders</span>
            </ng-template>
            <app-orders-tab />
          </mat-tab>
          <mat-tab label="How it works"><app-methodology-tab /></mat-tab>
        </mat-tab-group>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host { display: block; }
    .container { min-height: 70vh; }
    .sidenav { width: 320px; }
    .content { padding: 1.25rem 1.5rem 3rem; }
    @media (max-width: 600px) { .content { padding: 0.75rem 0.5rem 2rem; } }
  `,
})
export class QuantModelsPageComponent implements OnInit {
  protected readonly orders = inject(OrdersStore);

  protected readonly isSmall = toSignal(
    inject(BreakpointObserver).observe('(max-width: 959.98px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly ordersBadge = computed(() => String(this.orders.count()));

  ngOnInit(): void {
    this.orders.refresh();
  }

  protected onTabChange(event: MatTabChangeEvent): void {
    if (event.index === ORDERS_TAB_INDEX) this.orders.refresh();
  }
}
