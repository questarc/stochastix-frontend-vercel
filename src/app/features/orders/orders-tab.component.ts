import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { filter, switchMap } from 'rxjs';
import { ORDER_COLUMNS, Order } from '../../core/models/order';
import { ExportFormat, OrdersService } from '../../core/services/orders.service';
import { OrdersStore } from '../../core/state/orders.store';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

export function exportFileName(format: ExportFormat, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `orders_${stamp}.${format}`;
}

@Component({
  selector: 'app-orders-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatSortModule,
    MatTableModule, MoneyPipe,
  ],
  templateUrl: './orders-tab.component.html',
  styleUrl: './orders-tab.component.scss',
})
export class OrdersTabComponent {
  protected readonly store = inject(OrdersStore);
  private readonly api = inject(OrdersService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = ORDER_COLUMNS;
  protected readonly dataSource = new MatTableDataSource<Order>([]);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  constructor() {
    this.store.refresh();
    effect(() => {
      this.dataSource.data = this.store.orders();
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  protected exportOrders(format: ExportFormat): void {
    this.api.export(format).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(format);
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  protected clearOrders(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Clear orders', message: 'Remove every order from the blotter?', confirmLabel: 'Clear orders' },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.store.clear()),
      )
      .subscribe();
  }
}
