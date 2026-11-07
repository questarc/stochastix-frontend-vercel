export interface TimeSeriesCsvPreview {
  columns: string[];
  date_columns: string[];
  numeric_columns: string[];
  row_count: number;
}

export interface TimeSeriesCoefficient {
  feature: string;
  coefficient: number;
  standard_error?: number;
  p_value?: number;
  odds_ratio?: number;
}

export interface TimeSeriesTestPoint {
  date: string;
  actual_return?: number;
  predicted_return?: number;
  actual_up?: boolean;
  predicted_probability?: number;
}

export interface TimeSeriesRegressionResult {
  model_type: 'linear' | 'logistic';
  target_description: string;
  observations: number;
  training_observations: number;
  test_observations: number;
  metrics: Record<string, number | null>;
  coefficients: TimeSeriesCoefficient[];
  test_series: TimeSeriesTestPoint[];
}
