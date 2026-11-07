import { Pipe, PipeTransform } from '@angular/core';

const FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const FORMAT_CENTS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function formatMoney(value: number | null | undefined, cents = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return (cents ? FORMAT_CENTS : FORMAT).format(value);
}

/** `$1,234,567` (or `$1,234.50` with `cents`). */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, cents = false): string {
    return formatMoney(value, cents);
  }
}
