import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';

type PlotlyModule = typeof import('plotly.js-dist-min');

let plotlyPromise: Promise<PlotlyModule | null> | null = null;

function loadPlotly(): Promise<PlotlyModule | null> {
  plotlyPromise ??= import('plotly.js-dist-min')
    .then((m) => ((m as unknown as { default?: PlotlyModule }).default ?? m) as PlotlyModule)
    .catch(() => null);
  return plotlyPromise;
}

const AXIS_STYLE = {
  gridcolor: 'rgba(148,163,184,0.12)',
  zerolinecolor: 'rgba(148,163,184,0.25)',
  linecolor: 'rgba(148,163,184,0.25)',
};

const BASE_LAYOUT = {
  margin: { l: 60, r: 20, t: 40, b: 50 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Roboto, sans-serif', size: 12, color: '#cbd5e1' },
  legend: { orientation: 'h', y: -0.2 },
  template: { layout: { xaxis: AXIS_STYLE, yaxis: AXIS_STYLE } },
};

/** Reusable Plotly.js chart. Plotly is lazy-loaded so it stays out of the initial bundle. */
@Component({
  selector: 'app-plotly-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="chart" [style.height.px]="height()" role="img" [attr.aria-label]="ariaLabel()"></div>`,
  styles: `.chart { width: 100%; }`,
})
export class PlotlyChartComponent implements OnDestroy {
  readonly data = input.required<unknown[]>();
  readonly layout = input<Record<string, unknown>>({});
  readonly height = input(360);
  readonly ariaLabel = input('Chart');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private plotly: PlotlyModule | null = null;

  constructor() {
    effect(() => {
      const data = this.data();
      const layout = { ...BASE_LAYOUT, ...this.layout(), height: this.height() };
      const el = this.host().nativeElement;
      void this.render(el, data, layout);
    });
  }

  private async render(el: HTMLDivElement, data: unknown[], layout: Record<string, unknown>): Promise<void> {
    if (typeof window === 'undefined' || /jsdom/i.test(navigator.userAgent)) return;
    this.plotly ??= await loadPlotly();
    if (!this.plotly) return;
    try {
      await this.plotly.react(el, data as never, layout as never, { responsive: true, displaylogo: false });
    } catch {
      /* chart rendering is best-effort */
    }
  }

  ngOnDestroy(): void {
    if (this.plotly) this.plotly.purge(this.host().nativeElement);
  }
}
