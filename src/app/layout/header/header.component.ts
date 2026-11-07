import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

export const APP_TITLE = 'Stochastix AI';
export const APP_CAPTION =
  'An Advisor AI automates the Monte Carlo simulation process, rebalancing, and order generation.';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MoneyPipe],
  template: `
    <h1 class="title">{{ title }}</h1>
    <p class="caption">{{ caption }}</p>
    @if (store.account(); as account) {
      <h2 class="client">{{ account.client_name }} — {{ account.account_id }}</h2>
      <div class="metrics">
        <mat-card class="metric"><span class="label">Portfolio value</span>
          <span class="value">{{ store.portfolio()?.market_value | money }}</span></mat-card>
        <mat-card class="metric"><span class="label">Age</span>
          <span class="value">{{ account.age }}</span></mat-card>
        <mat-card class="metric"><span class="label">Risk profile</span>
          <span class="value">{{ account.risk_profile }}</span></mat-card>
        <mat-card class="metric"><span class="label">Model</span>
          <span class="value">{{ store.model()?.model_name ?? account.model_id }}</span></mat-card>
      </div>
    }
  `,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
    .title {
      display: inline-block; margin: 0; padding-bottom: 0.1em;
      font-size: 2rem; font-weight: 700; line-height: 1.25; letter-spacing: normal;
      background: linear-gradient(90deg, #dbeafe, #93c5fd, #60a5fa);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .caption {
      display: block; width: fit-content; margin: 0.25rem 0 1rem;
      font-size: 1rem; font-weight: 500; line-height: 1.5;
      background: linear-gradient(90deg, #93c5fd, #7dd3fc, #a5b4fc);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .client { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 500; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; }
    .metric { padding: 0.75rem 1rem; display: flex; flex-direction: column; }
    .label { font-size: 0.8rem; opacity: 0.7; }
    .value { font-size: 1.35rem; font-weight: 500; }
  `,
})
export class HeaderComponent {
  protected readonly store = inject(WorkspaceStore);
  protected readonly title = APP_TITLE;
  protected readonly caption = APP_CAPTION;
}
