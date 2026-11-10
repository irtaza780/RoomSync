import { MAX_CENTS, type MoneyErrorCode } from '../domain/money';
import type { Translator } from '../i18n';

export function moneyError(code: MoneyErrorCode | undefined, tr: Translator): string | undefined {
  if (!code) return undefined;
  return tr.t(`err.money.${code}`, { zero: tr.money(0), max: tr.money(MAX_CENTS) });
}

/** Currency affix for inputs: "$ 12.50" in English, "12,50 $" in French. */
export function currencyAffix(lang: 'en' | 'fr') {
  return lang === 'fr' ? { suffix: '$' } : { prefix: '$' };
}
