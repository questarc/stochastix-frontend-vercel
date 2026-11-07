import { Pipe, PipeTransform } from '@angular/core';

export function formatPercent1(value: number | null | undefined, signed = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const text = `${(value * 100).toFixed(1)}%`;
  return signed && value > 0 ? `+${text}` : text;
}

/** Fraction to one-decimal percent: 0.842 → `84.2%`. */
@Pipe({ name: 'percent1' })
export class Percent1Pipe implements PipeTransform {
  transform(value: number | null | undefined, signed = false): string {
    return formatPercent1(value, signed);
  }
}
