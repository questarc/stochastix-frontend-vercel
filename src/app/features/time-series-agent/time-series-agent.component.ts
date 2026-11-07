import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { TimeSeriesCsvPreview, TimeSeriesRegressionResult } from '../../core/models/time-series';
import { TimeSeriesService } from '../../core/services/time-series.service';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

const MAX_CSV_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-time-series-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PlotlyChartComponent],
  template: `
    <header class="page-heading">
      <p class="eyebrow">STATISTICAL MODELING</p>
      <h1>Time Series &amp; Statistical Models</h1>
      <p class="description">
        Estimate relationships between asset returns, macroeconomic indicators, and historical price action using
        linear and logistic regression.
      </p>
    </header>

    <section class="panel" aria-labelledby="model-guide-heading">
      <h2 id="model-guide-heading">How the models work</h2>
      <div class="guide-grid">
        <article>
          <h3>Linear regression</h3>
          <p>Estimates the size and direction of relationships with a continuous forward asset return.</p>
        </article>
        <article>
          <h3>Logistic regression</h3>
          <p>Estimates the probability that the forward asset return will be positive.</p>
        </article>
        <article>
          <h3>Time-aware evaluation</h3>
          <p>
            Predictors are measured at each date, the target is the asset's return over the selected future
            observation horizon, and the final 20% of dates are held out for testing.
          </p>
        </article>
      </div>
      <p class="notice">
        Upload a wide CSV with one date/timestamp column, a positive asset-price column, and one or more numeric
        predictors. Do not upload account numbers or other personal information. Files are analyzed in memory and are
        not retained. Model relationships are statistical associations, not causal effects or investment advice.
      </p>
    </section>

    <section class="panel" aria-labelledby="dataset-heading">
      <div class="section-heading">
        <div>
          <h2 id="dataset-heading">Historical dataset</h2>
          <p class="notice">CSV only · 20 MB maximum · at least 30 complete observations required</p>
        </div>
        <div class="actions">
          <a mat-stroked-button href="/time-series-sample.csv" download="time-series-sample.csv">
            <mat-icon>download</mat-icon>
            Download sample CSV
          </a>
          <input #csvInput type="file" accept=".csv,text/csv" hidden
                 aria-label="Choose a time series CSV file" (change)="onFile($event)" />
          <button mat-flat-button type="button" [disabled]="loading()" (click)="csvInput.click()">
            <mat-icon>upload_file</mat-icon>
            {{ loading() ? 'Inspecting CSV…' : 'Choose CSV' }}
          </button>
        </div>
      </div>
      @if (file(); as selectedFile) {
        <p class="file-meta"><strong>{{ selectedFile.name }}</strong> · {{ preview()?.row_count }} rows</p>
      }
      <p class="notice sample-note">
        The downloadable example contains 120 synthetic monthly observations (2016–2025) with an asset price,
        interest rate, inflation, and market return. It is illustrative test data, not historical market data.
      </p>

      @if (preview(); as dataset) {
        <div class="controls">
          <label>
            Date column
            <select [value]="dateColumn()" (change)="setDateColumn($event)">
              @for (column of dataset.date_columns; track column) {
                <option [value]="column">{{ column }}</option>
              }
            </select>
          </label>
          <label>
            Target asset price
            <select [value]="targetColumn()" (change)="setTargetColumn($event)">
              @for (column of dataset.numeric_columns; track column) {
                <option [value]="column">{{ column }}</option>
              }
            </select>
          </label>
          <label>
            Forward horizon (observations)
            <input type="number" min="1" max="30" [value]="horizonPeriods()" (change)="setHorizon($event)" />
          </label>
          <label>
            Model
            <select [value]="modelType()" (change)="setModelType($event)">
              <option value="linear">Linear regression — estimate return</option>
              <option value="logistic">Logistic regression — estimate up probability</option>
            </select>
          </label>
        </div>

        <fieldset class="predictors">
          <legend>Predictor columns (values known on the observation date)</legend>
          <div class="predictor-grid">
            @for (column of dataset.numeric_columns; track column) {
              @if (column !== targetColumn()) {
                <label class="checkbox-label">
                  <input type="checkbox" [checked]="predictorColumns().includes(column)"
                         (change)="togglePredictor(column, $event)" />
                  {{ column }}
                </label>
              }
            }
          </div>
        </fieldset>
        <button mat-flat-button type="button" [disabled]="!canAnalyze()" (click)="analyze()">
          <mat-icon>query_stats</mat-icon>
          {{ analyzing() ? 'Fitting model…' : 'Run regression' }}
        </button>
        @if (!predictorColumns().length) {
          <p class="field-error" role="status">Select at least one predictor column.</p>
        }
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>

    @if (result(); as output) {
      <section class="panel results" aria-labelledby="results-heading">
        <div class="section-heading">
          <div>
            <h2 id="results-heading">{{ output.model_type === 'linear' ? 'Linear regression' : 'Logistic regression' }} results</h2>
            <p class="notice">{{ output.target_description }} · chronologically held-out test data</p>
          </div>
          <p class="sample-count">{{ output.observations }} usable observations · {{ output.training_observations }} train · {{ output.test_observations }} test</p>
        </div>

        <div class="metrics">
          @if (output.model_type === 'linear') {
            <article class="metric">
              <span>Test R²</span>
              <strong>{{ metric(output.metrics['r_squared'], 'r2') }}</strong>
            </article>
            <article class="metric">
              <span>Mean absolute error</span>
              <strong>{{ metric(output.metrics['mae'], 'return') }}</strong>
            </article>
            <article class="metric">
              <span>Root mean squared error</span>
              <strong>{{ metric(output.metrics['rmse'], 'return') }}</strong>
            </article>
          } @else {
            <article class="metric"><span>Test accuracy</span><strong>{{ metric(output.metrics['accuracy'], 'percent') }}</strong></article>
            <article class="metric"><span>ROC AUC</span><strong>{{ metric(output.metrics['roc_auc'], 'decimal') }}</strong></article>
            <article class="metric"><span>Precision</span><strong>{{ metric(output.metrics['precision'], 'percent') }}</strong></article>
            <article class="metric"><span>Recall</span><strong>{{ metric(output.metrics['recall'], 'percent') }}</strong></article>
            <article class="metric"><span>Log loss</span><strong>{{ metric(output.metrics['log_loss'], 'decimal') }}</strong></article>
          }
        </div>

        <div class="results-grid">
          <article class="chart-panel">
            <h3>{{ output.model_type === 'linear' ? 'Actual vs predicted forward returns' : 'Actual direction vs predicted up probability' }}</h3>
            <app-plotly-chart [data]="chartData()" [layout]="chartLayout" [height]="340"
              [ariaLabel]="output.model_type === 'linear' ? 'Actual and predicted forward asset returns' : 'Actual direction and predicted probability'" />
          </article>
          <article class="table-panel">
            <h3>Model coefficients</h3>
            <p class="notice">
              Predictors are standardized using training-period values. Coefficients describe association, not causation.
              @if (output.model_type === 'logistic') { Odds ratios show the change per one-standard-deviation predictor increase. }
            </p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Term</th>
                    <th class="amount">Coefficient</th>
                    @if (output.model_type === 'linear') {
                      <th class="amount">Std. error</th>
                      <th class="amount">p-value</th>
                    } @else {
                      <th class="amount">Odds ratio</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (coefficient of output.coefficients; track coefficient.feature) {
                    <tr>
                      <td>{{ coefficient.feature }}</td>
                      <td class="amount">{{ number(coefficient.coefficient, 5) }}</td>
                      @if (output.model_type === 'linear') {
                        <td class="amount">{{ number(coefficient.standard_error ?? 0, 5) }}</td>
                        <td class="amount">{{ number(coefficient.p_value ?? 0, 4) }}</td>
                      } @else {
                        <td class="amount">{{ number(coefficient.odds_ratio ?? 0, 4) }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>
        </div>
        @if (output.model_type === 'logistic') {
          <p class="notice confusion">
            Test confusion counts at a 50% probability threshold:
            true up {{ output.metrics['true_positive'] }} · true non-up {{ output.metrics['true_negative'] }} ·
            false up {{ output.metrics['false_positive'] }} · missed up {{ output.metrics['false_negative'] }}.
          </p>
        }
        <p class="disclaimer">
          Historical fit does not guarantee future performance. The chronological holdout is a simple out-of-sample
          check, not a fully validated trading strategy; it does not account for transaction costs, revisions,
          survivorship, or market regime changes.
        </p>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.2; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
    .panel { margin-bottom: 1.25rem; padding: 1.25rem; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-panel-solid); }
    h2 { margin: 0; font-size: 1.2rem; }
    h3 { margin: 0 0 0.65rem; font-size: 1rem; }
    .guide-grid, .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 1rem; margin-top: 1rem; }
    .guide-grid article, .chart-panel, .table-panel { padding: 1rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel); }
    .guide-grid p, .notice, .disclaimer { color: var(--app-muted); font-size: 0.88rem; line-height: 1.5; }
    .notice { margin: 0.75rem 0 0; }
    .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .actions { display: flex; gap: 0.5rem; }
    .actions mat-icon { margin-right: 0.25rem; }
    .sample-note { margin: 0 0 1rem; }
    .file-meta { margin: 1rem 0; color: var(--app-muted); }
    .file-meta strong { color: var(--app-text); }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 0.85rem; margin: 1.25rem 0; }
    .controls label { display: grid; gap: 0.4rem; color: var(--app-muted); font-size: 0.88rem; }
    select, input[type="number"] { box-sizing: border-box; width: 100%; min-height: 42px; padding: 0.55rem 0.7rem; color: var(--app-text); border: 1px solid var(--app-border); border-radius: 6px; background: #0b1628; }
    .predictors { margin: 0 0 1rem; padding: 0.9rem; border: 1px solid var(--app-border); border-radius: 8px; }
    .predictors legend { padding: 0 0.35rem; color: var(--app-muted); font-size: 0.88rem; }
    .predictor-grid { display: flex; flex-wrap: wrap; gap: 0.8rem 1.2rem; }
    .checkbox-label { display: inline-flex; align-items: center; gap: 0.4rem; }
    .checkbox-label input { accent-color: var(--app-accent); }
    .error, .field-error { color: #fecaca; }
    .error { padding: 0.75rem; border: 1px solid #7f1d1d; border-radius: 6px; background: #450a0a; }
    .results { margin-top: 1.5rem; }
    .sample-count { margin: 0; color: var(--app-muted); font-size: 0.85rem; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .metric { display: flex; flex-direction: column; gap: 0.4rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel); }
    .metric span { color: var(--app-muted); font-size: 0.82rem; }
    .metric strong { font-size: 1.15rem; }
    .chart-panel, .table-panel { min-width: 0; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.65rem; border-bottom: 1px solid var(--app-border); text-align: left; }
    th { color: var(--app-muted); font-size: 0.82rem; }
    .amount { text-align: right; white-space: nowrap; }
    .confusion { margin-top: 1rem; }
    .disclaimer { margin: 1rem 0 0; }
    @media (max-width: 700px) { .panel { padding: 1rem; } .section-heading { flex-direction: column; } }
  `,
})
export class TimeSeriesAgentComponent implements OnInit {
  private readonly timeSeries = inject(TimeSeriesService);
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<TimeSeriesCsvPreview | null>(null);
  protected readonly result = signal<TimeSeriesRegressionResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly analyzing = signal(false);
  protected readonly error = signal('');
  protected readonly dateColumn = signal('');
  protected readonly targetColumn = signal('');
  protected readonly predictorColumns = signal<string[]>([]);
  protected readonly horizonPeriods = signal(1);
  protected readonly modelType = signal<'linear' | 'logistic'>('linear');
  ngOnInit(): void {
    this.loading.set(true);
    this.timeSeries.sampleCsv().subscribe({
      next: (file) => this.inspectFile(file),
      error: (error: unknown) => {
        this.error.set(`Could not load the sample CSV: ${errorDetail(error)}`);
        this.loading.set(false);
      },
    });
  }
  protected readonly canAnalyze = computed(
    () =>
      !!this.file() &&
      !!this.dateColumn() &&
      !!this.targetColumn() &&
      this.predictorColumns().length > 0 &&
      !this.loading() &&
      !this.analyzing(),
  );
  protected readonly chartLayout = {
    margin: { l: 55, r: 15, t: 10, b: 55 },
    xaxis: { title: { text: 'Test observation date' }, type: 'date' },
    yaxis: { title: { text: 'Forward return / probability' }, tickformat: '.1%' },
    legend: { orientation: 'h', y: -0.3 },
  };
  protected readonly chartData = computed(() => {
    const output = this.result();
    if (!output) return [];
    if (output.model_type === 'linear') {
      return [
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Actual return',
          x: output.test_series.map((point) => point.date),
          y: output.test_series.map((point) => point.actual_return),
          marker: { color: '#38bdf8', size: 5 },
        },
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Predicted return',
          x: output.test_series.map((point) => point.date),
          y: output.test_series.map((point) => point.predicted_return),
          marker: { color: '#fbbf24', size: 5 },
        },
      ];
    }
    return [
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Predicted up probability',
        x: output.test_series.map((point) => point.date),
        y: output.test_series.map((point) => point.predicted_probability),
        marker: { color: '#38bdf8', size: 5 },
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Actual up (1) / non-up (0)',
        x: output.test_series.map((point) => point.date),
        y: output.test_series.map((point) => (point.actual_up ? 1 : 0)),
        marker: { color: '#fbbf24', size: 6, symbol: 'x' },
      },
    ];
  });

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error.set('Choose a CSV file.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      this.error.set('The CSV exceeds the 20 MB upload limit.');
      return;
    }
    this.inspectFile(file);
  }

  private inspectFile(file: File): void {
    this.file.set(file);
    this.preview.set(null);
    this.result.set(null);
    this.error.set('');
    this.loading.set(true);
    this.timeSeries.preview(file).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.dateColumn.set(preview.date_columns[0] ?? '');
        this.targetColumn.set(preview.numeric_columns[0] ?? '');
        this.predictorColumns.set(preview.numeric_columns.slice(1));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(errorDetail(error));
        this.file.set(null);
        this.loading.set(false);
      },
    });
  }

  protected setDateColumn(event: Event): void {
    this.dateColumn.set((event.target as HTMLSelectElement).value);
  }

  protected setTargetColumn(event: Event): void {
    const target = (event.target as HTMLSelectElement).value;
    this.targetColumn.set(target);
    this.predictorColumns.update((columns) => columns.filter((column) => column !== target));
  }

  protected setHorizon(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= 1 && value <= 30) this.horizonPeriods.set(value);
  }

  protected setModelType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'linear' || value === 'logistic') this.modelType.set(value);
  }

  protected togglePredictor(column: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.predictorColumns.update((columns) =>
      selected ? [...columns, column] : columns.filter((candidate) => candidate !== column),
    );
  }

  protected analyze(): void {
    const file = this.file();
    if (!file || !this.canAnalyze()) return;
    this.result.set(null);
    this.error.set('');
    this.analyzing.set(true);
    this.timeSeries
      .analyze(file, {
        dateColumn: this.dateColumn(),
        targetColumn: this.targetColumn(),
        predictorColumns: this.predictorColumns(),
        horizonPeriods: this.horizonPeriods(),
        modelType: this.modelType(),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.analyzing.set(false);
        },
        error: (error: unknown) => {
          this.error.set(errorDetail(error));
          this.analyzing.set(false);
        },
      });
  }

  protected metric(value: number | null | undefined, format: 'r2' | 'return' | 'percent' | 'decimal'): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (format === 'return' || format === 'percent') return `${this.number(value * 100, 2)}%`;
    return this.number(value, format === 'r2' ? 3 : 4);
  }

  protected number(value: number, digits = 4): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
  }
}
