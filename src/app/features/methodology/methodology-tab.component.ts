import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatExpansionModule } from '@angular/material/expansion';
import { MarkdownComponent } from 'ngx-markdown';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { MethodologySection } from '../../core/models/llm';
import { SimulationResult } from '../../core/models/simulation';
import { MethodologyService } from '../../core/services/methodology.service';
import { SimulationService } from '../../core/services/simulation.service';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

export const SAMPLE_PATHS = 30;

@Component({
  selector: 'app-methodology-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, MarkdownComponent, PlotlyChartComponent],
  template: `
    <h2>How it works</h2>
    @if (paths(); as r) {
      <app-plotly-chart [data]="chartData()" [layout]="layout" [height]="380" ariaLabel="Sample simulation paths" />
      <p class="caption">
        Each line is one possible future. The full simulation runs thousands of these and counts the outcomes.
      </p>
    }
    <mat-accordion multi>
      @for (s of sections(); track s.title; let first = $first) {
        <mat-expansion-panel [expanded]="first">
          <mat-expansion-panel-header><mat-panel-title>{{ s.title }}</mat-panel-title></mat-expansion-panel-header>
          <markdown [data]="s.body" />
        </mat-expansion-panel>
      }
    </mat-accordion>
  `,
  styles: `:host { display: block; padding: 1rem 0; } .caption { opacity: 0.75; font-size: 0.9rem; }`,
})
export class MethodologyTabComponent {
  private readonly workspace = inject(WorkspaceStore);
  private readonly simApi = inject(SimulationService);
  protected readonly sections = signal<MethodologySection[]>([]);
  protected readonly paths = signal<SimulationResult | null>(null);

  protected readonly layout = {
    title: { text: `${SAMPLE_PATHS} sample paths (current portfolio)` },
    xaxis: { title: { text: 'Age' } },
    yaxis: { title: { text: 'Portfolio value ($)' }, tickprefix: '$', tickformat: ',.0f' },
    showlegend: false,
  };

  protected readonly chartData = computed(() => {
    const r = this.paths();
    if (!r?.sample_paths) return [];
    return r.sample_paths.map((y) => ({
      x: r.ages, y, type: 'scatter', mode: 'lines', line: { width: 1 }, opacity: 0.6, hoverinfo: 'skip',
    }));
  });

  constructor() {
    inject(MethodologyService).sections().subscribe((s) => this.sections.set(s));
    toObservable(this.workspace.simulationRequest)
      .pipe(
        filter((r) => r !== null),
        map((r) => ({ ...r!, trials: 1000, sample_paths: SAMPLE_PATHS })),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        debounceTime(400),
        switchMap((r) => this.simApi.run(r).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe((resp) => this.paths.set(resp.current));
  }
}
