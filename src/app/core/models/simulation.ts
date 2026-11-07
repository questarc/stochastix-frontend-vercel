export type SamplingMethod = 'prng' | 'lhs' | 'sobol';
export type Copula = 'gaussian' | 'student_t';

export interface PlanInputs {
  retirement_age: number;
  plan_end_age: number;
  annual_contribution: number;
  annual_withdrawal: number;
}

export interface SimSettings {
  trials: number;
  seed: number;
  sampling: SamplingMethod;
  copula: Copula;
  copula_df: number;
  distribution: string | null;
}

export interface SimulationRequest extends Partial<PlanInputs> {
  account_id: string;
  model_id?: string | null;
  trials: number;
  seed: number;
  sampling: SamplingMethod;
  copula: Copula;
  copula_df: number;
  distribution?: string | null;
  sample_paths?: number;
}

export interface Bands {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface RunSettings {
  seed: number;
  sampling: string;
  copula: string;
  copula_df: number;
  trials: number;
  years: number;
  distributions: Record<string, string>;
}

export interface SimulationResult {
  success_probability: number;
  ages: number[];
  bands: Bands;
  ending_values_histogram: { bin_edges: number[]; counts: number[] };
  depletion_ages_histogram: { ages: number[]; counts: number[] };
  median_ending_value_todays_dollars: number;
  failed_trials: number;
  median_depletion_age?: number | null;
  earliest_depletion_age?: number | null;
  settings: RunSettings;
  sample_paths?: number[][] | null;
}

export interface SimulationResponse {
  account_id: string;
  model_id: string;
  current: SimulationResult;
  model: SimulationResult;
}
