import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'MarketWatch | Stochastix AI',
    loadComponent: () =>
      import('./features/market/market-dashboard.component').then((m) => m.MarketDashboardComponent),
  },
  {
    path: 'quant-models',
    title: 'Quant Models | Stochastix AI',
    loadComponent: () =>
      import('./features/quant-models/quant-models-page.component').then((m) => m.QuantModelsPageComponent),
  },
  {
    path: 'etrade-agent',
    title: 'E*TRADE Agent | Stochastix AI',
    loadComponent: () =>
      import('./features/etrade-agent/etrade-agent.component').then((m) => m.EtradeAgentComponent),
  },
  {
    path: 'fidelity-agent',
    title: 'Fidelity Agent | Stochastix AI',
    loadComponent: () =>
      import('./features/fidelity-agent/fidelity-agent.component').then((m) => m.FidelityAgentComponent),
  },
  {
    path: 'time-series-agent',
    title: 'Time Series & Statistical Models | Stochastix AI',
    loadComponent: () =>
      import('./features/time-series-agent/time-series-agent.component').then((m) => m.TimeSeriesAgentComponent),
  },
  {
    path: 'technical-indicators',
    title: 'Technical Indicators | Stochastix AI',
    loadComponent: () =>
      import('./features/technical-indicators/technical-indicators.component').then(
        (m) => m.TechnicalIndicatorsComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
