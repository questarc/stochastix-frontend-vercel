import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { Position } from '../../core/models/account';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-positions-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MoneyPipe, DecimalPipe],
  template: `
    <h3>Positions</h3>
    <table mat-table [dataSource]="positions()" class="mat-elevation-z1">
      <ng-container matColumnDef="ticker">
        <th mat-header-cell *matHeaderCellDef>Ticker</th><td mat-cell *matCellDef="let p">{{ p.ticker }}</td>
      </ng-container>
      <ng-container matColumnDef="asset_class">
        <th mat-header-cell *matHeaderCellDef>Asset class</th><td mat-cell *matCellDef="let p">{{ p.asset_class }}</td>
      </ng-container>
      <ng-container matColumnDef="quantity">
        <th mat-header-cell *matHeaderCellDef class="num">Quantity</th>
        <td mat-cell *matCellDef="let p" class="num">{{ p.quantity | number: '1.0-4' }}</td>
      </ng-container>
      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef class="num">Price</th>
        <td mat-cell *matCellDef="let p" class="num">{{ p.price | money: true }}</td>
      </ng-container>
      <ng-container matColumnDef="market_value">
        <th mat-header-cell *matHeaderCellDef class="num">Market value ($)</th>
        <td mat-cell *matCellDef="let p" class="num">{{ p.market_value | money }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  `,
  styles: `table { width: 100%; } .num { text-align: right; }`,
})
export class PositionsTableComponent {
  readonly positions = input.required<Position[]>();
  protected readonly columns = ['ticker', 'asset_class', 'quantity', 'price', 'market_value'];
}
