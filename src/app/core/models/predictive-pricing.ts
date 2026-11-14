export interface PredictivePriceForecast {
  day: number;
  date: string;
  direction: 'up' | 'down';
  percent_change: number;
  expected_price: number;
}

export interface PredictivePriceResult {
  symbol: string;
  current_price: number;
  history: { date: string; close: number }[];
  forecasts: PredictivePriceForecast[];
  observations: number;
  model: string;
}