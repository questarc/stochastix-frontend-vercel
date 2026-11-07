import { calculateTechnicalIndicators, PricePoint } from './technical-indicators';

function prices(values: number[]): PricePoint[] {
  return values.map((close, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, close }));
}

describe('calculateTechnicalIndicators', () => {
  it('calculates RSI for rising, falling, and flat prices', () => {
    const rising = calculateTechnicalIndicators(prices(Array.from({ length: 16 }, (_, index) => index + 1)));
    const falling = calculateTechnicalIndicators(prices(Array.from({ length: 16 }, (_, index) => 16 - index)));
    const flat = calculateTechnicalIndicators(prices(Array.from({ length: 16 }, () => 10)));

    expect(rising[14].rsi).toBe(100);
    expect(falling[14].rsi).toBe(0);
    expect(flat[14].rsi).toBe(50);
    expect(rising[13].rsi).toBeNull();
  });

  it('waits for complete warmup windows for Bollinger Bands and MACD signal', () => {
    const result = calculateTechnicalIndicators(prices(Array.from({ length: 40 }, (_, index) => 100 + index)));

    expect(result[18].bollingerMiddle).toBeNull();
    expect(result[19].bollingerMiddle).toBeCloseTo(109.5);
    expect(result[32].macdSignal).toBeNull();
    expect(result[33].macd).not.toBeNull();
    expect(result[33].macdSignal).not.toBeNull();
    expect(result[33].macdHistogram).not.toBeNull();
  });
});
