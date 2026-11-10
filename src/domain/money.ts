import type { Lang } from './types';

/**
 * Integer-cent money helpers.
 *
 * Currency input is parsed as a string (whole part + fraction digits) so no
 * floating-point multiplication is ever used to obtain cents.
 */

export type MoneyErrorCode = 'empty' | 'invalid' | 'negative' | 'tooManyDecimals' | 'zero' | 'tooLarge';

export type ParseResult = { ok: true; cents: number } | { ok: false; error: MoneyErrorCode };

/** Upper bound for a single amount: $1,000,000.00. Keeps all sums far inside Number.MAX_SAFE_INTEGER. */
export const MAX_CENTS = 100_000_000;

/**
 * Parse a user-entered CAD amount into integer cents.
 * Accepts "12", "12.5", "12.50", "12,50" (French decimal comma), optional "$" and spaces.
 * Thousands separators are not accepted, to avoid ambiguity between "1,234" and "1,23".
 */
export function parseCents(raw: string, opts: { allowZero?: boolean } = {}): ParseResult {
  const input = raw.replace(/[\s  $]/g, '');
  if (input === '') return { ok: false, error: 'empty' };
  if (input.startsWith('-') || input.startsWith('−')) return { ok: false, error: 'negative' };

  const match = /^(\d*)(?:[.,](\d*))?$/.exec(input);
  if (!match || (match[1] === '' && (match[2] ?? '') === '')) return { ok: false, error: 'invalid' };

  const whole = match[1] === '' ? '0' : match[1];
  const frac = match[2] ?? '';
  if (frac.length > 2) return { ok: false, error: 'tooManyDecimals' };
  if (whole.length > 9) return { ok: false, error: 'tooLarge' };

  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents)) return { ok: false, error: 'invalid' };
  if (cents > MAX_CENTS) return { ok: false, error: 'tooLarge' };
  if (cents === 0 && !opts.allowZero) return { ok: false, error: 'zero' };
  return { ok: true, cents };
}

/** Convert cents back to an editable input string (always "." decimal for EN, "," for FR). */
export function centsToInput(cents: number, lang: Lang): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const s = `${Math.floor(abs / 100)}${lang === 'fr' ? ',' : '.'}${String(abs % 100).padStart(2, '0')}`;
  return sign + s;
}

const formatters: Partial<Record<Lang, Intl.NumberFormat>> = {};

function fmt(lang: Lang): Intl.NumberFormat {
  return (formatters[lang] ??= new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }));
}

/**
 * Format integer cents for display. Division by 100 happens only here, for
 * presentation; integer values up to $1M are exactly representable.
 */
export function formatCents(cents: number, lang: Lang, opts: { signed?: boolean } = {}): string {
  const abs = fmt(lang).format(Math.abs(cents) / 100);
  if (opts.signed) {
    if (cents > 0) return `+${abs}`;
    if (cents < 0) return `−${abs}`;
    return abs;
  }
  return cents < 0 ? `−${abs}` : abs;
}

export function sumCents(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
