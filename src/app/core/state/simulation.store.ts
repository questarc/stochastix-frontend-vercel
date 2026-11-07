import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, filter, finalize, switchMap, tap } from 'rxjs';
import { SimulationRequest, SimulationResponse } from '../models/simulation';
import { SimulationService } from '../services/simulation.service';
import { WorkspaceStore } from './workspace.store';

export const SIMULATION_DEBOUNCE_MS = 400;

/** Re-runs POST /simulations (debounced, latest wins) whenever the on-screen selection changes. */
@Injectable({ providedIn: 'root' })
export class SimulationStore {
  private readonly workspace = inject(WorkspaceStore);
  private readonly api = inject(SimulationService);

  readonly response = signal<SimulationResponse | null>(null);
  readonly loading = signal(false);

  constructor() {
    toObservable(this.workspace.simulationRequest)
      .pipe(
        filter((req): req is SimulationRequest => req !== null),
        debounceTime(SIMULATION_DEBOUNCE_MS),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => this.loading.set(true)),
        switchMap((req) =>
          this.api.run(req).pipe(
            catchError(() => EMPTY),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((response) => this.response.set(response));
  }
}
