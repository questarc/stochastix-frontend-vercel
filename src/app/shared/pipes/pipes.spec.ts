import { escapeDollars } from '../../features/advisor-ai/chat-message.component';
import { exportFileName } from '../../features/orders/orders-tab.component';
import { formatMoney } from './money.pipe';
import { formatPercent1 } from './percent1.pipe';

describe('formatting helpers', () => {
  it('formats money and percentages', () => {
    expect(formatMoney(1234567.4)).toBe('$1,234,567');
    expect(formatMoney(300, true)).toBe('$300.00');
    expect(formatMoney(null)).toBe('—');
    expect(formatPercent1(0.842)).toBe('84.2%');
    expect(formatPercent1(0.01, true)).toBe('+1.0%');
  });

  it('escapes dollar signs for markdown', () => {
    expect(escapeDollars('From $1,000 to $2,000')).toBe('From \\$1,000 to \\$2,000');
  });

  it('builds the export file name', () => {
    expect(exportFileName('csv', new Date(2026, 0, 2, 3, 4, 5))).toBe('orders_20260102_030405.csv');
  });
});
