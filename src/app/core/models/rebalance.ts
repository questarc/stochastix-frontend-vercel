import { SimulationRequest } from './simulation';

export interface RebalanceRequest {
  account_id: string;
  model_id?: string | null;
  drift_tolerance?: number;
  min_trade_value?: number;
  whole_shares?: boolean;
  simulation?: SimulationRequest;
}

export interface RebalanceSettings {
  drift_tolerance: number;
  min_trade_value: number;
  whole_shares: boolean;
}

export interface Trade {
  ticker: string;
  asset_class: string;
  side: 'Sell' | 'Buy';
  quantity: number;
  price: number;
  value: number;
}

export interface AllocationRow {
  asset_class: string;
  current: number;
  model: number;
  post_trade: number;
}

export interface RebalanceResponse {
  account_id: string;
  model_id: string;
  model_name: string;
  market_value: number;
  max_drift: number;
  rebalance_needed: boolean;
  trades: Trade[];
  allocation: AllocationRow[];
  total_sells: number;
  total_buys: number;
  uninvested_cash: number;
  success_current?: number | null;
  success_after?: number | null;
}
