import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WorkspaceStore } from './core/state/workspace.store';
import { AdvisorAiComponent } from './features/advisor-ai/advisor-ai.component';
import { APP_TITLE } from './layout/header/header.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule, MatIconModule, MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet,
    AdvisorAiComponent,
  ],
  template: `
    <mat-toolbar class="toolbar">
      <a class="brand" routerLink="/" aria-label="Stochastix AI home">
        <mat-icon aria-hidden="true">insights</mat-icon>
        <span>Stochastix AI</span>
      </a>
      <nav aria-label="Main navigation">
        <a mat-button routerLink="/" routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
          MarketWatch Agent
        </a>
        <a mat-button routerLink="/etrade-agent" routerLinkActive="active" ariaCurrentWhenActive="page">
          E*TRADE Agent
        </a>
        <a mat-button routerLink="/fidelity-agent" routerLinkActive="active" ariaCurrentWhenActive="page">
          Fidelity Agent
        </a>
        <a mat-button routerLink="/time-series-agent" routerLinkActive="active" ariaCurrentWhenActive="page">
          Time Series Agent
        </a>
        <a mat-button routerLink="/technical-indicators" routerLinkActive="active" ariaCurrentWhenActive="page">
          Technical Indicators Agent
        </a>
      </nav>
    </mat-toolbar>
    <main>
      <router-outlet />
    </main>
    <app-advisor-ai />
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; gap: 1.5rem;
      padding: 0 max(1rem, calc((100vw - 1600px) / 2));
      background: rgba(8, 16, 30, 0.9); border-bottom: 1px solid var(--app-border);
      backdrop-filter: blur(12px);
    }
    .brand {
      display: inline-flex; align-items: center; gap: 0.55rem; margin-right: auto;
      color: var(--app-text); font-size: 1.05rem; font-weight: 700; text-decoration: none;
      white-space: nowrap;
    }
    .brand mat-icon { color: var(--app-accent); }
    nav { display: flex; align-items: center; gap: 0.35rem; height: 100%; }
    nav a { height: 40px; color: var(--app-muted); }
    nav a.active { color: var(--app-text); background: rgba(96, 165, 250, 0.14); }
    main { max-width: 1600px; margin: 0 auto; padding: 1.25rem 1.5rem 4rem; }
    @media (max-width: 600px) {
      .toolbar { gap: 0.5rem; padding: 0 0.5rem; }
      .brand { gap: 0.25rem; font-size: 0.9rem; }
      .brand mat-icon { margin-right: 0; }
      nav { gap: 0; }
      nav a { min-width: 0; padding: 0 0.5rem; font-size: 0.8rem; }
      main { padding: 1rem 0.75rem 3rem; }
    }
  `,
})
export class AppComponent implements OnInit {
  private readonly workspace = inject(WorkspaceStore);
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle(APP_TITLE);
    this.workspace.init();
  }
}
