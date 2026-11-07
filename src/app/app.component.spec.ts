import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { WorkspaceStore } from './core/state/workspace.store';

describe('AppComponent', () => {
  it('mounts the AI assistant in the shared app shell', async () => {
    const workspace = {
      init: vi.fn(),
      simulationRequest: signal(null),
      accountId: () => null,
      modelId: () => null,
      llmProvider: () => null,
      llm: () => ({ provider: 'ollama', model: null }),
    };
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: WorkspaceStore, useValue: workspace },
      ],
    });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="chat-fab"]')).toBeTruthy();
    expect(workspace.init).toHaveBeenCalledOnce();
  });

  it('uses Agent suffixes in navigation while keeping Quant Models hidden but routed', async () => {
    const workspace = {
      init: vi.fn(),
      simulationRequest: signal(null),
      accountId: () => null,
      modelId: () => null,
      llmProvider: () => null,
      llm: () => ({ provider: 'ollama', model: null }),
    };
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: WorkspaceStore, useValue: workspace },
      ],
    });

    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('nav a[routerLink="/quant-models"]')).toBeNull();
    const navigationLabels = Array.from(element.querySelectorAll('nav a')).map((link) => link.textContent?.trim());
    expect(navigationLabels).toEqual([
      'MarketWatch Agent',
      'E*TRADE Agent',
      'Fidelity Agent',
      'Time Series Agent',
      'Technical Indicators Agent',
    ]);
    expect(routes.some((route) => route.path === 'quant-models')).toBe(true);
  });
});
