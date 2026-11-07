import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Copula, PlanInputs, SamplingMethod } from '../../core/models/simulation';
import { SourcesService } from '../../core/services/sources.service';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { WEBLLM_MODELS, WEBLLM_PROVIDER_ID, webGpuSupported } from '../../core/webllm/webllm.models';
import { WebLlmService } from '../../core/webllm/webllm.service';

export const TRIAL_CHOICES = [1_000, 5_000, 10_000, 25_000, 50_000];
export const SAMPLING_LABELS: Record<SamplingMethod, string> = {
  prng: 'Standard random (PRNG)',
  lhs: 'Latin Hypercube (LHS)',
  sobol: 'Sobol sequence',
};
export const COPULA_LABELS: Record<Copula, string> = { gaussian: 'Gaussian', student_t: 'Student-t (fat tails)' };

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSelectModule, MatSliderModule, MatTooltipModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly store = inject(WorkspaceStore);
  private readonly sourcesApi = inject(SourcesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly webllm = inject(WebLlmService);
  protected readonly webllmId = WEBLLM_PROVIDER_ID;
  protected readonly webGpu = webGpuSupported();
  protected readonly webllmSize = computed(
    () => WEBLLM_MODELS.find((m) => m.id === this.store.llm().model)?.size ?? '1–5 GB',
  );

  protected readonly samplingLabels = SAMPLING_LABELS;
  protected readonly copulaLabels = COPULA_LABELS;
  protected readonly samplingMethods = Object.keys(SAMPLING_LABELS) as SamplingMethod[];
  protected readonly copulas = Object.keys(COPULA_LABELS) as Copula[];
  protected readonly trialChoices = computed(() => this.store.options()?.trial_choices ?? TRIAL_CHOICES);
  protected readonly trialIndex = computed(() =>
    Math.max(0, this.trialChoices().indexOf(this.store.simSettings().trials)),
  );
  protected readonly distributions = computed(() => this.store.options()?.distributions ?? []);
  protected readonly uploading = signal(false);
  protected readonly trialLabel = (index: number): string => {
    const trials = this.trialChoices()[index] ?? 0;
    return trials >= 1000 ? `${trials / 1000}k` : String(trials);
  };

  protected modelLabel(modelId: string, name: string): string {
    return modelId === this.store.account()?.model_id ? `${name} (assigned)` : name;
  }

  protected setPlan(key: keyof PlanInputs, value: number | string | null): void {
    const num = Number(value);
    if (value === null || value === '' || Number.isNaN(num)) return;
    this.store.updatePlan({ [key]: num });
  }

  protected setTrialIndex(index: number): void {
    this.store.updateSimSettings({ trials: this.trialChoices()[index] });
  }

  protected setSeed(value: number | string | null): void {
    const seed = Number(value);
    if (value !== null && value !== '' && Number.isInteger(seed) && seed >= 0) {
      this.store.updateSimSettings({ seed });
    }
  }

  protected onFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    const source = this.store.source();
    const accountId = this.store.accountId();
    inputEl.value = '';
    if (!file || !source || !accountId) return;
    this.uploading.set(true);
    this.sourcesApi.uploadPositions(source, accountId, file).subscribe({
      next: (positions) => {
        this.uploading.set(false);
        this.store.markUploaded(true);
        this.snackBar.open(`Loaded ${positions.length} positions from ${file.name}.`, 'OK', { duration: 4000 });
        this.store.reloadPortfolio();
      },
      error: () => this.uploading.set(false),
    });
  }

  protected useDefaultPositions(): void {
    const source = this.store.source();
    const accountId = this.store.accountId();
    if (!source || !accountId) return;
    this.sourcesApi.resetPositions(source, accountId).subscribe(() => {
      this.store.markUploaded(false);
      this.snackBar.open('Using the default positions file.', 'OK', { duration: 3000 });
      this.store.reloadPortfolio();
    });
  }
}
