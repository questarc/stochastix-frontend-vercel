import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SimulationResult } from '../../core/models/simulation';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

@Component({
  selector: 'app-fan-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlotlyChartComponent],
  template: `<app-plotly-chart [data]="data()" [layout]="layout()" [height]="420" ariaLabel="Projected portfolio value by age" />`,
})
export class FanChartComponent {
  readonly result = input.required<SimulationResult>();
  readonly retirementAge = input.required<number>();
  readonly title = input('Projected portfolio value');

  protected readonly data = computed(() => {
    const { ages, bands } = this.result();
    const band = (upper: number[], lower: number[], name: string, color: string) => [
      { x: ages, y: upper, type: 'scatter', mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
      { x: ages, y: lower, type: 'scatter', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: color, name },
    ];
    return [
      ...band(bands.p90, bands.p10, 'P10–P90', 'rgba(99,110,250,0.15)'),
      ...band(bands.p75, bands.p25, 'P25–P75', 'rgba(99,110,250,0.35)'),
      { x: ages, y: bands.p50, type: 'scatter', mode: 'lines', name: 'Median', line: { color: '#636efa', width: 2 } },
    ];
  });

  protected readonly layout = computed(() => ({
    title: { text: this.title() },
    xaxis: { title: { text: 'Age' } },
    yaxis: { title: { text: 'Portfolio value ($)' }, tickprefix: '$', tickformat: ',.0f' },
    shapes: [
      {
        type: 'line', x0: this.retirementAge(), x1: this.retirementAge(), yref: 'paper', y0: 0, y1: 1,
        line: { dash: 'dash', color: '#94a3b8' },
      },
    ],
    annotations: [
      { x: this.retirementAge(), yref: 'paper', y: 1, text: 'Retirement', showarrow: false, yanchor: 'bottom' },
    ],
  }));
}
