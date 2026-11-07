import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SimulationResult } from '../../core/models/simulation';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

@Component({
  selector: 'app-ending-histogram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlotlyChartComponent],
  template: `<app-plotly-chart [data]="data()" [layout]="layout" [height]="320" ariaLabel="Ending value distribution" />`,
})
export class EndingHistogramComponent {
  readonly result = input.required<SimulationResult>();

  protected readonly layout = {
    title: { text: 'Ending value distribution' },
    xaxis: { title: { text: 'Ending value ($, nominal)' }, tickprefix: '$', tickformat: ',.0f' },
    yaxis: { title: { text: 'Trials' } },
    bargap: 0.02,
    showlegend: false,
  };

  protected readonly data = computed(() => {
    const { bin_edges, counts } = this.result().ending_values_histogram;
    const centers = counts.map((_, i) => (bin_edges[i] + bin_edges[i + 1]) / 2);
    const widths = counts.map((_, i) => bin_edges[i + 1] - bin_edges[i]);
    return [{ type: 'bar', x: centers, y: counts, width: widths, marker: { color: '#60a5fa' } }];
  });
}
