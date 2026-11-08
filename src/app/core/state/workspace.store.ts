import { Injectable, computed, inject, signal } from '@angular/core';
import { Account, AccountPortfolio, ConfigOptions, ModelPortfolio, SourceInfo } from '../models/account';
import { LlmProvider, LlmSelection } from '../models/llm';
import { PlanInputs, SimSettings, SimulationRequest } from '../models/simulation';
import { LlmService } from '../services/llm.service';
import { SourcesService } from '../services/sources.service';

export const DEFAULT_SIM_SETTINGS: SimSettings = {
  trials: 10_000,
  seed: 42,
  sampling: 'prng',
  copula: 'gaussian',
  copula_df: 5,
  distribution: null,
};

/** Shared on-screen selection: source, account, model, plan inputs, simulation settings, AI model. */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly sourcesApi = inject(SourcesService);
  private readonly llmApi = inject(LlmService);

  readonly sources = signal<SourceInfo[]>([]);
  readonly source = signal<string | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly accountId = signal<string | null>(null);
  readonly models = signal<ModelPortfolio[]>([]);
  readonly modelId = signal<string | null>(null);
  readonly portfolio = signal<AccountPortfolio | null>(null);
  readonly portfolioLoading = signal(false);
  readonly plan = signal<PlanInputs | null>(null);
  readonly simSettings = signal<SimSettings>({ ...DEFAULT_SIM_SETTINGS });
  readonly options = signal<ConfigOptions | null>(null);
  readonly llmProviders = signal<LlmProvider[]>([]);
  readonly llm = signal<LlmSelection>({
    provider: 'nvidia',
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  });
  readonly uploadedAccounts = signal<ReadonlySet<string>>(new Set());

  readonly sourceInfo = computed(() => this.sources().find((s) => s.name === this.source()) ?? null);
  readonly account = computed(() => this.accounts().find((a) => a.account_id === this.accountId()) ?? null);
  readonly model = computed(() => this.models().find((m) => m.model_id === this.modelId()) ?? null);
  readonly llmProvider = computed(() => this.llmProviders().find((p) => p.id === this.llm().provider) ?? null);
  readonly hasUpload = computed(() => {
    const id = this.accountId();
    return !!id && this.uploadedAccounts().has(`${this.source()}:${id}`);
  });

  readonly simulationRequest = computed<SimulationRequest | null>(() => {
    const accountId = this.accountId();
    const plan = this.plan();
    if (!accountId || !plan || !this.portfolio()) return null;
    return { account_id: accountId, model_id: this.modelId(), ...plan, ...this.simSettings() };
  });

  init(): void {
    this.sourcesApi.getOptions().subscribe((o) => this.options.set(o));
    this.sourcesApi.listSources().subscribe((list) => {
      this.sources.set(list);
      if (list.length) this.selectSource(list[0].name);
    });
    this.llmApi.providers().subscribe((providers) => {
      this.llmProviders.set(providers);
    });
  }

  selectSource(name: string): void {
    this.source.set(name);
    this.accounts.set([]);
    this.portfolio.set(null);
    this.sourcesApi.listModels(name).subscribe((m) => this.models.set(m));
    this.sourcesApi.listAccounts(name).subscribe((accounts) => {
      this.accounts.set(accounts);
      if (accounts.length) this.selectAccount(accounts[0].account_id);
    });
  }

  selectAccount(accountId: string): void {
    const account = this.accounts().find((a) => a.account_id === accountId);
    if (!account) return;
    this.accountId.set(accountId);
    this.modelId.set(account.model_id);
    this.plan.set({
      retirement_age: account.retirement_age,
      plan_end_age: account.plan_end_age,
      annual_contribution: account.annual_contribution,
      annual_withdrawal: account.annual_withdrawal,
    });
    this.reloadPortfolio();
  }

  selectModel(modelId: string): void {
    this.modelId.set(modelId);
    this.reloadPortfolio();
  }

  updatePlan(patch: Partial<PlanInputs>): void {
    const plan = this.plan();
    if (plan) this.plan.set({ ...plan, ...patch });
  }

  updateSimSettings(patch: Partial<SimSettings>): void {
    this.simSettings.update((s) => ({ ...s, ...patch }));
  }

  markUploaded(uploaded: boolean): void {
    const key = `${this.source()}:${this.accountId()}`;
    const next = new Set(this.uploadedAccounts());
    if (uploaded) next.add(key);
    else next.delete(key);
    this.uploadedAccounts.set(next);
  }

  reloadPortfolio(): void {
    const accountId = this.accountId();
    if (!accountId) return;
    this.portfolioLoading.set(true);
    this.sourcesApi.getPortfolio(accountId, this.modelId()).subscribe({
      next: (p) => {
        if (p.account.account_id === this.accountId()) this.portfolio.set(p);
        this.portfolioLoading.set(false);
      },
      error: () => this.portfolioLoading.set(false),
    });
  }
}
