export interface SourceInfo {
  name: string;
  type: string;
  supports_upload: boolean;
}

export interface Account {
  account_id: string;
  client_name: string;
  advisor: string;
  age: number;
  retirement_age: number;
  plan_end_age: number;
  annual_contribution: number;
  annual_withdrawal: number;
  risk_profile: string;
  model_id: string;
}

export interface Position {
  account_id: string;
  ticker: string;
  asset_class: string;
  quantity: number;
  price: number;
  market_value: number;
}

export interface ModelPortfolio {
  model_id: string;
  model_name: string;
  weights: Record<string, number>;
}

export interface AccountPortfolio {
  source: string;
  account: Account;
  positions: Position[];
  current_weights: Record<string, number>;
  model: ModelPortfolio;
  market_value: number;
}

export interface CapitalMarketAssumptions {
  inflation: number;
  asset_classes: string[];
  expected_return: Record<string, number>;
  volatility: Record<string, number>;
  correlation: number[][];
  distributions: Record<string, string>;
}

export interface ConfigOptions {
  sampling_methods: string[];
  copulas: string[];
  distributions: string[];
  trial_choices: number[];
}
