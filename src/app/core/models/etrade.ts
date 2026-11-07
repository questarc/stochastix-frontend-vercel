export interface EtradeStatement {
  filename: string;
  page_count: number;
  text: string;
  character_count: number;
  imported_at: string;
  document_type: 'transfer_activity' | 'portfolio_summary' | 'statement_text' | 'statement_structure';
  transactions: EtradeTransaction[];
  summary: EtradeTransferSummary | null;
  portfolio_summary?: FidelityPortfolioSummary | null;
  account_summaries?: FidelityAccountSummary[];
  holdings?: FidelityHolding[];
  activity_transactions?: FidelityActivityTransaction[];
}

export interface EtradeTransaction {
  date: string;
  type: string;
  amount: number;
  status: string;
}

export interface EtradeTransferSummary {
  transaction_count: number;
  total_amount: number;
  completed_amount: number;
  scheduled_amount: number;
}

export interface FidelityPortfolioSummary {
  beginning_value: number | null;
  ending_value: number | null;
  reported_change: number | null;
  total_including_other_holdings?: number | null;
  statement_period?: string | null;
  income_this_period?: number | null;
  income_year_to_date?: number | null;
  top_holdings_value?: number | null;
  top_holdings_percent?: number | null;
}

export interface FidelityAccountSummary {
  account_value: number | null;
  change_in_account_value: number | null;
  beginning_value: number | null;
  additions: number | null;
  subtractions: number | null;
  transaction_costs: number | null;
  investment_change: number | null;
  ending_value: number | null;
  accrued_interest: number | null;
  income_this_period: number | null;
  income_year_to_date: number | null;
  top_holdings_value: number | null;
  top_holdings_percent: number | null;
}

export interface FidelityHolding {
  beginning_market_value: number | null;
  quantity: number | null;
  price_per_unit: number | null;
  ending_market_value: number | null;
  cost_basis: number | null;
  unrealized_gain_loss: number | null;
  estimated_annual_income: number | null;
  estimated_yield_percent: number | null;
}

export interface FidelityActivityTransaction {
  settlement_date: string;
  security_name: string | null;
  symbol_cusip: string | null;
  description: string | null;
  quantity: number | null;
  price: number | null;
  total_cost_basis: number | null;
  transaction_cost: number | null;
  amount: number | null;
}

export interface FidelityCsvPosition {
  symbol: string;
  description: string;
  quantity: number | null;
  last_price: number | null;
  last_price_change: number | null;
  current_value: number | null;
  todays_gain_loss_dollar: number | null;
  todays_gain_loss_percent: number | null;
  total_gain_loss_dollar: number | null;
  total_gain_loss_percent: number | null;
  percent_of_account: number | null;
  cost_basis_total: number | null;
  average_cost_basis: number | null;
  type: string | null;
}
