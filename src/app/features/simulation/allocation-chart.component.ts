import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { AccountPortfolio } from '../../core/models/account';
import { Percent1Pipe } from '../../shared/pipes/percent1.pipe';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

export interface AllocationView {
  asset_class: string;
  current: number;
  model: number;
  drift: number;
}

@Component({
  selector: 'app-allocation-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, Percent1Pipe, PlotlyChartComponent],
  template: `
    <h3>Allocation: current vs model</h3>
    <app-plotly-chart [data]="chartData()" [layout]="layout" [height]="280" ariaLabel="Allocation current vs model" />
    <table mat-table [dataSource]="rows()" class="mat-elevation-z1">
      <ng-container matColumnDef="asset_class">
        <th mat-header-cell *matHeaderCellDef>Asset class</th><td mat-cell *matCellDef="let r">{{ r.asset_class }}</td>
      </ng-container>
      <ng-container matColumnDef="current">
        <th mat-header-cell *matHeaderCellDef class="num">Current</th>
        <td mat-cell *matCellDef="let r" class="num">{{ r.current | percent1 }}</td>
      </ng-container>
      <ng-container matColumnDef="model">
        <th mat-header-cell *matHeaderCellDef class="num">Model</th>
        <td mat-cell *matCellDef="let r" class="num">{{ r.model | percent1 }}</td>
      </ng-container>
      <ng-container matColumnDef="drift">
        <th mat-header-cell *matHeaderCellDef class="num">Drift</th>
        <td mat-cell *matCellDef="let r" class="num">{{ r.drift | percent1: true }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  `,
  styles: `table { width: 100%; } .num { text-align: right; }`,
})
export class AllocationChartComponent {
  readonly portfolio = input.required<AccountPortfolio>();
  readonly assetClasses = input<string[]>([]);

  protected readonly columns = ['asset_class', 'current', 'model', 'drift'];
  protected readonly layout = { barmode: 'group', yaxis: { tickformat: '.0%' }, margin: { t: 10 } };

  protected readonly rows = computed<AllocationView[]>(() => {
    const p = this.portfolio();
    const classes = [
      ...new Set([...this.assetClasses(), ...Object.keys(p.model.weights), ...Object.keys(p.current_weights)]),
    ];
    return classes.map((ac) => {
      const current = p.current_weights[ac] ?? 0;
      const model = p.model.weights[ac] ?? 0;
      return { asset_class: ac, current, model, drift: current - model };
    });
  });

  protected readonly chartData = computed(() => {
    const rows = this.rows();
    const x = rows.map((r) => r.asset_class);
    return [
      { type: 'bar', name: 'Current', x, y: rows.map((r) => r.current), marker: { color: '#3b82f6' } },
      { type: 'bar', name: 'Model', x, y: rows.map((r) => r.model), marker: { color: '#93c5fd' } },
    ];
  });
}
