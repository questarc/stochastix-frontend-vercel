import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { SimulationResponse } from '../../core/models/simulation';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Percent1Pipe } from '../../shared/pipes/percent1.pipe';

@Component({
  selector: 'app-success-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MoneyPipe, Percent1Pipe],
  template: `
    <h3>Probability of success</h3>
    <div class="metrics">
      <mat-card class="metric" data-testid="success-current">
        <span class="label">Current portfolio</span>
        <span class="value">{{ response().current.success_probability | percent1 }}</span>
      </mat-card>
      <mat-card class="metric" data-testid="success-model">
        <span class="label">Model portfolio</span>
        <span class="value">{{ response().model.success_probability | percent1 }}</span>
        <span class="delta" [class.up]="deltaPp() > 0" [class.down]="deltaPp() < 0">{{ deltaText() }}</span>
      </mat-card>
      <mat-card class="metric" data-testid="median-ending">
        <span class="label">Median ending value (today's $)</span>
        <span class="value">{{ selectedMedian() | money }}</span>
      </mat-card>
    </div>
    <p class="note">Results are projections, not guarantees.</p>
  `,
  styles: `
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    .metric { padding: 0.75rem 1rem; display: flex; flex-direction: column; }
    .label { font-size: 0.8rem; opacity: 0.7; }
    .value { font-size: 1.6rem; font-weight: 500; }
    .delta { font-size: 0.85rem; } .up { color: var(--app-positive); } .down { color: var(--app-negative); }
    .note { font-size: 0.8rem; opacity: 0.7; margin: 0.5rem 0 0; }
  `,
})
export class SuccessMetricsComponent {
  readonly response = input.required<SimulationResponse>();
  readonly selected = input<'current' | 'model'>('current');

  protected readonly deltaPp = computed(
    () => (this.response().model.success_probability - this.response().current.success_probability) * 100,
  );
  protected readonly deltaText = computed(() => {
    const d = this.deltaPp();
    return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)} pp vs current`;
  });
  protected readonly selectedMedian = computed(
    () => this.response()[this.selected()].median_ending_value_todays_dollars,
  );
}
