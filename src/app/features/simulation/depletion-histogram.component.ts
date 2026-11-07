import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SimulationResult } from '../../core/models/simulation';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

@Component({
  selector: 'app-depletion-histogram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlotlyChartComponent],
  template: `
    @if (hasFailures()) {
      <app-plotly-chart [data]="data()" [layout]="layout" [height]="320" ariaLabel="Age when money runs out" />
    } @else {
      <h4>Age when money runs out (failed trials)</h4>
      <p class="empty">No trials ran out of money.</p>
    }
  `,
  styles: `h4 { margin: 0.75rem 0 0.25rem; font-weight: 500; } .empty { opacity: 0.75; }`,
})
export class DepletionHistogramComponent {
  readonly result = input.required<SimulationResult>();

  protected readonly hasFailures = computed(() => this.result().depletion_ages_histogram.ages.length > 0);
  protected readonly layout = {
    title: { text: 'Age when money runs out (failed trials)' },
    xaxis: { title: { text: 'Age' }, dtick: 5 },
    yaxis: { title: { text: 'Trials' } },
    showlegend: false,
  };
  protected readonly data = computed(() => {
    const { ages, counts } = this.result().depletion_ages_histogram;
    return [{ type: 'bar', x: ages, y: counts, marker: { color: '#f87171' } }];
  });
}
