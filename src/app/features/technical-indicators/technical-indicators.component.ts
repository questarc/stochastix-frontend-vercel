import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimeSeriesService } from '../../core/services/time-series.service';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';
import { calculateTechnicalIndicators, PricePoint, TechnicalIndicatorPoint } from './technical-indicators';

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const MIN_OBSERVATIONS = 34;

interface CsvDataset {
  headers: string[];
  rows: string[][];
}

type CompleteIndicatorPoint = TechnicalIndicatorPoint & {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerMiddle: number;
  bollingerUpper: number;
  bollingerLower: number;
};

function isCompleteIndicatorPoint(point: TechnicalIndicatorPoint): point is CompleteIndicatorPoint {
  return point.rsi !== null &&
    point.macd !== null &&
    point.macdSignal !== null &&
    point.macdHistogram !== null &&
    point.bollingerMiddle !== null &&
    point.bollingerUpper !== null &&
    point.bollingerLower !== null;
}

function parseCsv(content: string): CsvDataset {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index++;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV must include a header and at least one data row.');

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new Error('The CSV must have non-empty, unique column names.');
  }
  return { headers, rows: rows.slice(1) };
}

function defaultColumn(headers: string[], pattern: RegExp): string {
  return headers.find((header) => pattern.test(header)) ?? headers[0] ?? '';
}

@Component({
  selector: 'app-technical-indicators',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, PlotlyChartComponent],
  template: `
    <header class="page-heading">
      <p class="eyebrow">MARKET ANALYSIS</p>
      <h1>Technical Indicators</h1>
      <p class="description">
        Explore momentum and volatility with RSI, MACD, and Bollinger Bands computed from historical closing prices.
      </p>
    </header>

    <section class="panel" aria-labelledby="data-heading">
      <div class="section-heading">
        <div>
          <h2 id="data-heading">Price data</h2>
          <p class="notice">Choose a CSV with a date column and a positive closing-price column. Data stays in your browser.</p>
        </div>
        <div class="actions">
          <a mat-stroked-button href="/time-series-sample.csv" download="time-series-sample.csv">
            <mat-icon>download</mat-icon> Download sample
          </a>
          <input #csvInput type="file" accept=".csv,text/csv" hidden
                 aria-label="Choose a historical price CSV" (change)="onFile($event)" />
          <button mat-flat-button type="button" [disabled]="loading()" (click)="csvInput.click()">
            <mat-icon>upload_file</mat-icon>{{ loading() ? 'Loading…' : 'Choose CSV' }}
          </button>
        </div>
      </div>
      @if (fileName()) {
        <p class="file-meta"><strong>{{ fileName() }}</strong> · {{ usablePrices().length }} usable observations</p>
      }
      <p class="notice sample-note">
        The preloaded example is synthetic monthly data, not actual market history. At least {{ minimumObservations }}
        usable rows are required for all three indicators.
      </p>
      @if (headers().length) {
        <div class="controls">
          <label>
            Date column
            <select [value]="dateColumn()" (change)="setDateColumn($event)">
              @for (header of headers(); track header) { <option [value]="header">{{ header }}</option> }
            </select>
          </label>
          <label>
            Closing price
            <select [value]="priceColumn()" (change)="setPriceColumn($event)">
              @for (header of headers(); track header) { <option [value]="header">{{ header }}</option> }
            </select>
          </label>
        </div>
      }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </section>

    @if (latest(); as current) {
      <section class="readings" aria-label="Latest indicator readings">
        <article class="reading">
          <span class="reading-label">RSI (14)</span>
          <strong>{{ current.rsi | number: '1.1-1' }}</strong>
          <span class="badge" [class.warn]="current.rsi > 70" [class.cool]="current.rsi < 30">
            {{ rsiReading(current.rsi) }}
          </span>
        </article>
        <article class="reading">
          <span class="reading-label">MACD (12, 26, 9)</span>
          <strong>{{ current.macd | number: '1.2-2' }}</strong>
          <span class="badge" [class.warn]="current.macd < current.macdSignal">
            {{ current.macd >= current.macdSignal ? 'MACD above signal' : 'MACD below signal' }}
          </span>
        </article>
        <article class="reading">
          <span class="reading-label">Bollinger Bands (20, 2)</span>
          <strong>{{ current.close | number: '1.2-2' }}</strong>
          <span class="badge">{{ bandReading(current) }}</span>
        </article>
      </section>

      <section class="panel chart-panel" aria-labelledby="price-chart-heading">
        <h2 id="price-chart-heading">Price and Bollinger Bands</h2>
        <p class="notice">20-period simple moving average with bands two standard deviations above and below.</p>
        <app-plotly-chart [data]="priceChartData()" [layout]="priceChartLayout" [height]="360"
          ariaLabel="Closing price and upper and lower Bollinger Bands over time" />
      </section>
      <section class="panel chart-panel" aria-labelledby="rsi-chart-heading">
        <h2 id="rsi-chart-heading">Relative Strength Index (RSI)</h2>
        <p class="notice">A 0–100 momentum oscillator. Readings above 70 are commonly described as overbought; below 30 as oversold.</p>
        <app-plotly-chart [data]="rsiChartData()" [layout]="rsiChartLayout" [height]="290"
          ariaLabel="Relative Strength Index over time with 30 and 70 reference levels" />
      </section>
      <section class="panel chart-panel" aria-labelledby="macd-chart-heading">
        <h2 id="macd-chart-heading">Moving Average Convergence Divergence (MACD)</h2>
        <p class="notice">The 12-period EMA minus the 26-period EMA, plotted with its 9-period signal EMA and histogram.</p>
        <app-plotly-chart [data]="macdChartData()" [layout]="macdChartLayout" [height]="320"
          ariaLabel="MACD line, signal line, and histogram over time" />
      </section>
    }
    <p class="disclaimer">
      Indicator readings describe past price data only. They are not forecasts, trading instructions, or investment advice.
    </p>
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.2; }
    h2 { margin: 0; font-size: 1.2rem; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
    .panel { margin-bottom: 1.25rem; padding: 1.25rem; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-panel-solid); }
    .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .actions { display: flex; gap: 0.5rem; }
    .actions mat-icon { margin-right: 0.25rem; }
    .notice, .disclaimer { color: var(--app-muted); font-size: 0.88rem; line-height: 1.5; }
    .notice { margin: 0.5rem 0 0; }
    .sample-note { margin-top: 0.8rem; }
    .file-meta { margin: 1rem 0 0; color: var(--app-muted); }
    .file-meta strong { color: var(--app-text); }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 0.85rem; margin-top: 1rem; }
    .controls label { display: grid; gap: 0.4rem; color: var(--app-muted); font-size: 0.88rem; }
    select { box-sizing: border-box; width: 100%; min-height: 42px; padding: 0.55rem 0.7rem; color: var(--app-text); border: 1px solid var(--app-border); border-radius: 6px; background: #0b1628; }
    .error { padding: 0.75rem; border: 1px solid #7f1d1d; border-radius: 6px; background: #450a0a; color: #fecaca; }
    .readings { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
    .reading { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; min-width: 0; padding: 1rem; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-panel-solid); }
    .reading-label { color: var(--app-muted); font-size: 0.82rem; }
    .reading strong { font-size: 1.35rem; }
    .badge { padding: 0.2rem 0.55rem; border-radius: 1rem; background: rgba(96, 165, 250, 0.14); color: #bfdbfe; font-size: 0.78rem; }
    .badge.warn { background: rgba(251, 191, 36, 0.14); color: #fde68a; }
    .badge.cool { background: rgba(56, 189, 248, 0.14); color: #bae6fd; }
    .chart-panel { min-width: 0; }
    .disclaimer { margin: 0; }
    @media (max-width: 700px) { .panel { padding: 1rem; } .section-heading { flex-direction: column; } .actions { flex-wrap: wrap; } }
  `,
})
export class TechnicalIndicatorsComponent implements OnInit {
  private readonly timeSeries = inject(TimeSeriesService);
  protected readonly minimumObservations = MIN_OBSERVATIONS;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly fileName = signal('');
  protected readonly headers = signal<string[]>([]);
  protected readonly csvRows = signal<string[][]>([]);
  protected readonly dateColumn = signal('');
  protected readonly priceColumn = signal('');

  protected readonly usablePrices = computed<PricePoint[]>(() => {
    const headers = this.headers();
    const dateIndex = headers.indexOf(this.dateColumn());
    const priceIndex = headers.indexOf(this.priceColumn());
    if (dateIndex < 0 || priceIndex < 0 || dateIndex === priceIndex) return [];
    return this.csvRows()
      .map((row) => ({ date: row[dateIndex] ?? '', close: Number(row[priceIndex]) }))
      .filter((point) => point.date !== '' && Number.isFinite(Date.parse(point.date)) && Number.isFinite(point.close) && point.close > 0)
      .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
  });

  protected readonly indicators = computed(() => calculateTechnicalIndicators(this.usablePrices()));
  protected readonly latest = computed(() => {
    const point = this.indicators().at(-1);
    return point && isCompleteIndicatorPoint(point) ? point : null;
  });
  protected readonly priceChartLayout = {
    margin: { l: 60, r: 15, t: 15, b: 55 },
    xaxis: { title: { text: 'Date' }, type: 'date' },
    yaxis: { title: { text: 'Price' } },
    legend: { orientation: 'h', y: -0.25 },
  };
  protected readonly rsiChartLayout = {
    margin: { l: 60, r: 15, t: 15, b: 55 },
    xaxis: { title: { text: 'Date' }, type: 'date' },
    yaxis: { title: { text: 'RSI' }, range: [0, 100] },
    legend: { orientation: 'h', y: -0.3 },
    shapes: [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 70, y1: 70, line: { color: '#fbbf24', dash: 'dash' } },
      { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 30, y1: 30, line: { color: '#38bdf8', dash: 'dash' } },
    ],
  };
  protected readonly macdChartLayout = {
    margin: { l: 60, r: 15, t: 15, b: 55 },
    xaxis: { title: { text: 'Date' }, type: 'date' },
    yaxis: { title: { text: 'MACD' } },
    legend: { orientation: 'h', y: -0.3 },
  };
  protected readonly priceChartData = computed(() => {
    const points = this.indicators();
    const dates = points.map((point) => point.date);
    return [
      { type: 'scatter', mode: 'lines', name: 'Upper band', x: dates, y: points.map((point) => point.bollingerUpper), line: { color: '#a78bfa', width: 1 }, connectgaps: false },
      { type: 'scatter', mode: 'lines', name: 'Lower band', x: dates, y: points.map((point) => point.bollingerLower), line: { color: '#a78bfa', width: 1 }, fill: 'tonexty', fillcolor: 'rgba(167,139,250,0.10)', connectgaps: false },
      { type: 'scatter', mode: 'lines', name: '20-period average', x: dates, y: points.map((point) => point.bollingerMiddle), line: { color: '#fbbf24', width: 1.5 }, connectgaps: false },
      { type: 'scatter', mode: 'lines', name: 'Close', x: dates, y: points.map((point) => point.close), line: { color: '#38bdf8', width: 2 } },
    ];
  });
  protected readonly rsiChartData = computed(() => [{
    type: 'scatter',
    mode: 'lines',
    name: 'RSI (14)',
    x: this.indicators().map((point) => point.date),
    y: this.indicators().map((point) => point.rsi),
    line: { color: '#38bdf8', width: 2 },
    connectgaps: false,
  }]);
  protected readonly macdChartData = computed(() => {
    const points = this.indicators();
    return [
      { type: 'bar', name: 'Histogram', x: points.map((point) => point.date), y: points.map((point) => point.macdHistogram), marker: { color: '#64748b' } },
      { type: 'scatter', mode: 'lines', name: 'MACD', x: points.map((point) => point.date), y: points.map((point) => point.macd), line: { color: '#38bdf8', width: 2 }, connectgaps: false },
      { type: 'scatter', mode: 'lines', name: 'Signal', x: points.map((point) => point.date), y: points.map((point) => point.macdSignal), line: { color: '#fbbf24', width: 1.5 }, connectgaps: false },
    ];
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.timeSeries.sampleCsv().subscribe({
      next: (file) => void this.loadFile(file),
      error: () => {
        this.error.set('Could not load the sample CSV. You can still choose a local price-history CSV.');
        this.loading.set(false);
      },
    });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
    void this.loadFile(file);
  }

  private async loadFile(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const dataset = parseCsv(await file.text());
      this.headers.set(dataset.headers);
      this.csvRows.set(dataset.rows);
      this.dateColumn.set(defaultColumn(dataset.headers, /date|time/i));
      this.priceColumn.set(defaultColumn(dataset.headers, /close|price|adjusted/i));
      this.fileName.set(file.name);
      if (this.usablePrices().length < MIN_OBSERVATIONS) {
        this.error.set(`Found ${this.usablePrices().length} usable rows. At least ${MIN_OBSERVATIONS} valid date and positive-price rows are required.`);
      }
    } catch (error: unknown) {
      this.headers.set([]);
      this.csvRows.set([]);
      this.fileName.set('');
      this.error.set(error instanceof Error ? error.message : 'Could not read the CSV file.');
    } finally {
      this.loading.set(false);
    }
  }

  protected setDateColumn(event: Event): void {
    this.dateColumn.set((event.target as HTMLSelectElement).value);
    this.validateObservationCount();
  }

  protected setPriceColumn(event: Event): void {
    this.priceColumn.set((event.target as HTMLSelectElement).value);
    this.validateObservationCount();
  }

  protected rsiReading(value: number): string {
    if (value > 70) return 'Overbought range';
    if (value < 30) return 'Oversold range';
    return 'Between 30 and 70';
  }

  protected bandReading(point: CompleteIndicatorPoint): string {
    if (point.close > point.bollingerUpper) return 'Above upper band';
    if (point.close < point.bollingerLower) return 'Below lower band';
    return 'Within bands';
  }

  private validateObservationCount(): void {
    const count = this.usablePrices().length;
    this.error.set(count < MIN_OBSERVATIONS
      ? `Found ${count} usable rows. At least ${MIN_OBSERVATIONS} valid date and positive-price rows are required.`
      : '');
  }
}
