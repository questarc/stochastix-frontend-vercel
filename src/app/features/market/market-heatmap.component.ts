import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { HeatmapFeed } from '../../core/models/market';
import { MarketService } from '../../core/services/market.service';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

/** Red (down) → navy (flat) → green (up), capped at ±3%. */
export const HEAT_SCALE: [number, string][] = [
  [0, '#b91c1c'], [0.3, '#7f1d1d'], [0.5, '#1c2c4b'], [0.7, '#166534'], [1, '#16a34a'],
];
export const HEAT_RANGE = 3;

export function signedPct(change: number): string {
  return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
}

/** MarketHeatmapAgent widget: treemap of the largest US companies by sector, sized by market cap. */
@Component({
  selector: 'app-market-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatButtonToggleModule, MatCardModule, MatIconModule, MatProgressBarModule,
    PlotlyChartComponent],
  template: `
    <mat-card class="widget" data-testid="widget-heatmap">
      <header>
        <span class="title">🗺️ Market Heatmap <small>(largest US companies, today)</small></span>
        @if (feed()?.market_change_pct != null) {
          <span class="summary" data-testid="heatmap-summary" [class.up]="feed()!.market_change_pct! > 0"
                [class.down]="feed()!.market_change_pct! < 0">
            Weighted {{ signed(feed()!.market_change_pct!) }} · {{ feed()!.breadth!.up }} up / {{ feed()!.breadth!.down }} down
          </span>
        }
        <mat-button-toggle-group [value]="size()" (change)="setSize($event.value)" aria-label="Number of companies">
          <mat-button-toggle [value]="50">50</mat-button-toggle>
          <mat-button-toggle [value]="100">100</mat-button-toggle>
          <mat-button-toggle [value]="200">200</mat-button-toggle>
        </mat-button-toggle-group>
        <button mat-icon-button type="button" aria-label="Refresh heatmap" (click)="load(true)"><mat-icon>refresh</mat-icon></button>
      </header>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      @if (feed()?.items?.length) {
        <app-plotly-chart [data]="chartData()" [layout]="layout" [height]="440" ariaLabel="Market heatmap by sector" />
        <div class="sectors" data-testid="heatmap-sectors">
          @for (s of feed()!.sectors; track s.sector) {
            <span class="sector" [class.up]="s.change_pct > 0" [class.down]="s.change_pct < 0">
              {{ s.sector }} {{ signed(s.change_pct) }}
            </span>
          }
        </div>
      } @else if (!loading()) {
        <p class="empty">Market heatmap data is unavailable right now.</p>
      }
      <footer>
        @if (error(); as e) { <span class="err">⚠️ {{ e }}</span> }
        @for (e of feed()?.errors ?? []; track e.source) { <span class="err">{{ e.source }} unavailable</span> }
        <span>Tile size = market cap · colour = daily change (±{{ range }}% scale) · ★ = held by clients · Source: Nasdaq</span>
        @if (feed()?.updated_at; as u) { <span>Updated {{ u | date: 'h:mm a' }}</span> }
      </footer>
    </mat-card>
  `,
  styles: `
    .widget { padding: 0.6rem 0.9rem; margin-top: 1rem; }
    header { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .title { flex: 1; font-weight: 600; }
    .title small { font-weight: 400; color: var(--app-muted); }
    .summary { font-size: 0.8rem; color: var(--app-muted); }
    .up { color: var(--app-positive); } .down { color: var(--app-negative); }
    .sectors { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.4rem 0; }
    .sector { font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 0.6rem; border: 1px solid var(--app-border); }
    .empty { color: var(--app-muted); font-size: 0.85rem; }
    footer { display: flex; flex-wrap: wrap; gap: 0.6rem; font-size: 0.7rem; color: var(--app-muted); }
    .err { color: var(--app-warning); }
  `,
})
export class MarketHeatmapComponent {
  private readonly api = inject(MarketService);

  readonly feed = signal<HeatmapFeed | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly size = signal(100);
  protected readonly range = HEAT_RANGE;
  protected readonly signed = signedPct;

  protected readonly layout = { margin: { l: 0, r: 0, t: 8, b: 0 }, legend: undefined };

  protected readonly chartData = computed(() => {
    const f = this.feed();
    if (!f) return [];
    const ids: string[] = [], labels: string[] = [], parents: string[] = [], values: number[] = [];
    const colors: number[] = [], text: string[] = [], hover: string[] = [];
    for (const s of f.sectors) {
      ids.push(`sector:${s.sector}`); labels.push(s.sector); parents.push(''); values.push(0);
      colors.push(s.change_pct); text.push(signedPct(s.change_pct));
      hover.push(`${s.sector}<br>${signedPct(s.change_pct)} (cap-weighted)<br>${s.count} companies`);
    }
    for (const i of f.items) {
      ids.push(i.symbol); labels.push(i.held_by.length ? `★ ${i.symbol}` : i.symbol);
      parents.push(`sector:${i.sector}`); values.push(i.market_cap); colors.push(i.change_pct);
      text.push(signedPct(i.change_pct));
      const held = i.held_by.length ? `<br>Held in: ${i.held_by.join(', ')}` : '';
      hover.push(`${i.name}<br>${signedPct(i.change_pct)} · $${(i.market_cap / 1e9).toFixed(0)}B${held}`);
    }
    return [{
      type: 'treemap', ids, labels, parents, values, text, branchvalues: 'remainder',
      textinfo: 'label+text', hovertext: hover, hoverinfo: 'text',
      marker: { colors, colorscale: HEAT_SCALE, cmin: -HEAT_RANGE, cmax: HEAT_RANGE, cmid: 0,
        line: { color: '#0a1220', width: 1 } },
      textfont: { color: '#f8fafc' }, pathbar: { visible: false },
    }];
  });

  constructor() {
    this.load();
  }

  setSize(size: number): void {
    this.size.set(size);
    this.load();
  }

  load(refresh = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.heatmap(this.size(), refresh).subscribe({
      next: (f) => { this.feed.set(f); this.loading.set(false); },
      error: (e) => { this.error.set(errorDetail(e)); this.loading.set(false); },
    });
  }
}
