import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { PredictivePriceResult } from '../../core/models/predictive-pricing';
import { PredictivePricingService } from '../../core/services/predictive-pricing.service';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

@Component({
  selector: 'app-predictive-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PlotlyChartComponent],
  template: `
    <header class="page-heading">
      <p class="eyebrow">SEQUENCE FORECAST</p>
      <h1>Predictive Pricing Agent</h1>
      <p class="description">A five-session LSTM forecast trained on recent daily OHLCV market data.</p>
    </header>

    <section class="panel" aria-labelledby="forecast-heading">
      <div class="section-heading">
        <div>
          <h2 id="forecast-heading">Build a price forecast</h2>
          <p class="notice">Enter a ticker and the current price to anchor the forecast.</p>
        </div>
        <span class="model-tag">PyTorch · LSTM</span>
      </div>
      <form class="controls" (submit)="predict($event)">
        <label>
          Stock ticker
          <input type="text" name="symbol" maxlength="15" autocomplete="off" placeholder="AAPL"
            [value]="symbol()" (input)="setSymbol($event)" required />
        </label>
        <label>
          Current price
          <input type="number" name="currentPrice" min="0.01" step="0.01" inputmode="decimal"
            placeholder="225.00" [value]="currentPrice()" (input)="setPrice($event)" required />
        </label>
        <button mat-flat-button type="submit" [disabled]="loading() || !canPredict()">
          <mat-icon>query_stats</mat-icon>
          {{ loading() ? 'Training model…' : 'Predict next 5 days' }}
        </button>
      </form>
      <p class="notice data-note">Yahoo Finance daily data · latest 30 calendar days · no uploaded data is retained.</p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </section>

    @if (result(); as output) {
      <section class="panel results" aria-labelledby="results-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ output.symbol }} · {{ output.model }}</p>
            <h2 id="results-heading">Five-day outlook</h2>
          </div>
          <p class="sample-count">{{ output.observations }} daily observations · anchored at {{ currency(output.current_price) }}</p>
        </div>

        <div class="results-grid">
          <article class="chart-panel">
            <h3>Historical and expected price</h3>
            <app-plotly-chart [data]="chartData()" [layout]="chartLayout" [height]="340"
              [ariaLabel]="output.symbol + ' historical close and five-day expected price chart'" />
          </article>
          <article class="table-panel">
            <h3>Daily predictions</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Session</th><th>Direction</th><th class="amount">Expected change</th><th class="amount">Expected price</th></tr></thead>
                <tbody>
                  @for (forecast of output.forecasts; track forecast.day) {
                    <tr>
                      <td><strong>Day {{ forecast.day }}</strong><small>{{ forecast.date }}</small></td>
                      <td><span class="direction" [class.down]="forecast.direction === 'down'">
                        <mat-icon aria-hidden="true">{{ forecast.direction === 'up' ? 'trending_up' : 'trending_down' }}</mat-icon>
                        {{ forecast.direction === 'up' ? 'Up' : 'Down' }}
                      </span></td>
                      <td class="amount" [class.negative]="forecast.percent_change < 0">{{ percent(forecast.percent_change) }}</td>
                      <td class="amount">{{ currency(forecast.expected_price) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>
        </div>
        <p class="disclaimer">Model estimates are experimental, based on a short recent history, and are not investment advice or a guarantee of future prices.</p>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: 2rem; line-height: 1.2; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
    .panel { margin-bottom: 1.25rem; padding: 1.25rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel-solid); }
    h2 { margin: 0; font-size: 1.2rem; }
    h3 { margin: 0 0 0.75rem; font-size: 1rem; }
    .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .notice, .disclaimer { color: var(--app-muted); font-size: 0.88rem; line-height: 1.5; }
    .notice { margin: 0.5rem 0 0; }
    .model-tag { color: var(--app-accent); font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
    .controls { display: grid; grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) auto; align-items: end; gap: 0.85rem; margin-top: 1.25rem; }
    .controls label { display: grid; gap: 0.4rem; color: var(--app-muted); font-size: 0.88rem; }
    input { box-sizing: border-box; width: 100%; min-height: 42px; padding: 0.55rem 0.7rem; color: var(--app-text); border: 1px solid var(--app-border); border-radius: 6px; background: #0b1628; }
    .controls button { min-height: 42px; }
    .data-note { margin-top: 0.9rem; }
    .error { padding: 0.75rem; border: 1px solid #7f1d1d; border-radius: 6px; background: #450a0a; color: #fecaca; }
    .results { margin-top: 1.5rem; }
    .sample-count { margin: 0; color: var(--app-muted); font-size: 0.85rem; }
    .results-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, 1fr); gap: 1rem; margin-top: 1rem; }
    .chart-panel, .table-panel { min-width: 0; padding: 1rem; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-panel); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { padding: 0.72rem 0.45rem; border-bottom: 1px solid var(--app-border); text-align: left; white-space: nowrap; }
    th { color: var(--app-muted); font-size: 0.78rem; font-weight: 600; }
    td small { display: block; margin-top: 0.2rem; color: var(--app-muted); font-size: 0.75rem; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .direction { display: inline-flex; align-items: center; gap: 0.25rem; color: #86efac; }
    .direction mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .direction.down, .negative { color: #fca5a5; }
    .disclaimer { margin: 1rem 0 0; }
    @media (max-width: 900px) { .results-grid { grid-template-columns: 1fr; } }
    @media (max-width: 620px) {
      .controls { grid-template-columns: 1fr; }
      .controls button { width: 100%; }
      .section-heading { flex-direction: column; }
      .sample-count { text-align: left; }
      .panel { padding: 1rem; }
    }
  `,
})
export class PredictivePricingComponent {
  private readonly service = inject(PredictivePricingService);
  readonly symbol = signal('');
  readonly currentPrice = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<PredictivePriceResult | null>(null);
  readonly canPredict = computed(() => this.symbol().trim().length > 0 && Number(this.currentPrice()) > 0);
  readonly chartData = computed(() => {
    const output = this.result();
    if (!output) return [];
    const historical = output.history;
    const forecasts = output.forecasts;
    const lastHistory = historical.at(-1);
    return [
      { x: historical.map((point) => point.date), y: historical.map((point) => point.close), type: 'scatter', mode: 'lines', name: 'Historical close', line: { color: '#55b6a8', width: 2 } },
      { x: lastHistory ? [lastHistory.date, ...forecasts.map((point) => point.date)] : forecasts.map((point) => point.date), y: [output.current_price, ...forecasts.map((point) => point.expected_price)], type: 'scatter', mode: 'lines+markers', name: 'Expected price', line: { color: '#ef9d58', width: 2, dash: 'dot' } },
    ];
  });
  readonly chartLayout = {
    title: { text: 'Price in USD', font: { size: 13 } },
    xaxis: { title: { text: 'Trading date' } },
    yaxis: { title: { text: 'Price (USD)' }, tickprefix: '$' },
  };

  setSymbol(event: Event): void {
    this.symbol.set((event.target as HTMLInputElement).value.toUpperCase());
  }

  setPrice(event: Event): void {
    this.currentPrice.set((event.target as HTMLInputElement).value);
  }

  predict(event: Event): void {
    event.preventDefault();
    if (!this.canPredict() || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.service.predict(this.symbol().trim(), Number(this.currentPrice())).subscribe({
      next: (result) => { this.result.set(result); this.loading.set(false); },
      error: (error: unknown) => { this.error.set(errorDetail(error)); this.loading.set(false); },
    });
  }

  currency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  percent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
}