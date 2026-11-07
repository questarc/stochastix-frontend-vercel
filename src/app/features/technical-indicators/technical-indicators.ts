export interface PricePoint {
  date: string;
  close: number;
}

export interface TechnicalIndicatorPoint extends PricePoint {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerMiddle: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
}

function exponentialMovingAverage(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return result;

  let average = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = average;
  const multiplier = 2 / (period + 1);
  for (let index = period; index < values.length; index++) {
    average = (values[index] - average) * multiplier + average;
    result[index] = average;
  }
  return result;
}

function relativeStrengthIndex(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return result;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index++) {
    const change = values[index] - values[index - 1];
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }
  averageGain /= period;
  averageLoss /= period;

  const calculate = (): number => {
    if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
    if (averageGain === 0) return 0;
    return 100 - 100 / (1 + averageGain / averageLoss);
  };
  result[period] = calculate();

  for (let index = period + 1; index < values.length; index++) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = calculate();
  }
  return result;
}

function bollingerBands(values: number[], period: number): {
  middle: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
} {
  const middle: Array<number | null> = Array(values.length).fill(null);
  const upper: Array<number | null> = Array(values.length).fill(null);
  const lower: Array<number | null> = Array(values.length).fill(null);

  for (let index = period - 1; index < values.length; index++) {
    const window = values.slice(index - period + 1, index + 1);
    const mean = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    middle[index] = mean;
    upper[index] = mean + 2 * deviation;
    lower[index] = mean - 2 * deviation;
  }
  return { middle, upper, lower };
}

export function calculateTechnicalIndicators(
  prices: PricePoint[],
): TechnicalIndicatorPoint[] {
  const closes = prices.map((point) => point.close);
  const fastEma = exponentialMovingAverage(closes, 12);
  const slowEma = exponentialMovingAverage(closes, 26);
  const macd = closes.map((_, index) =>
    fastEma[index] === null || slowEma[index] === null
      ? null
      : fastEma[index]! - slowEma[index]!,
  );
  const macdStart = macd.findIndex((value) => value !== null);
  const signalValues = macd.slice(macdStart).filter((value): value is number => value !== null);
  const signalFromStart = exponentialMovingAverage(signalValues, 9);
  const macdSignal: Array<number | null> = Array(prices.length).fill(null);
  signalFromStart.forEach((value, index) => {
    macdSignal[macdStart + index] = value;
  });
  const bands = bollingerBands(closes, 20);
  const rsi = relativeStrengthIndex(closes, 14);

  return prices.map((point, index) => ({
    ...point,
    rsi: rsi[index],
    macd: macd[index],
    macdSignal: macdSignal[index],
    macdHistogram:
      macd[index] === null || macdSignal[index] === null
        ? null
        : macd[index]! - macdSignal[index]!,
    bollingerMiddle: bands.middle[index],
    bollingerUpper: bands.upper[index],
    bollingerLower: bands.lower[index],
  }));
}
