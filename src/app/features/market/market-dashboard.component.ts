import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarketHeatmapComponent } from './market-heatmap.component';
import { MarketWidgetsComponent } from './market-widgets.component';

@Component({
  selector: 'app-market-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarketHeatmapComponent, MarketWidgetsComponent],
  template: `
    <app-market-heatmap />
    <header class="page-heading">
      <p class="eyebrow">MARKETS</p>
      <h1>MarketWatch</h1>
      <p class="description">Market-moving news, upcoming events, corporate actions, and daily market performance.</p>
    </header>
    <app-market-widgets />
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.2; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
  `,
})
export class MarketDashboardComponent {}
