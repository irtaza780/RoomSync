import { formatCents } from '../domain/money';
import type { Lang } from '../domain/types';
import { en, type StringKey } from './en';
import { fr } from './fr';

export type { StringKey };

const tables: Record<Lang, Record<StringKey, string>> = { en, fr };

export type Vars = Record<string, string | number>;

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export interface Translator {
  lang: Lang;
  t: (key: StringKey, vars?: Vars) => string;
  /** Plural helper: uses `${key}.one` / `${key}.other`. French treats 0 and 1 as singular. */
  tp: (base: string, n: number, vars?: Vars) => string;
  money: (cents: number) => string;
  signed: (cents: number) => string;
}

const cache: Partial<Record<Lang, Translator>> = {};

export function getTranslator(lang: Lang): Translator {
  const hit = cache[lang];
  if (hit) return hit;
  const table = tables[lang];
  const tr: Translator = {
    lang,
    t: (key, vars) => interpolate(table[key] ?? en[key] ?? key, vars),
    tp: (base, n, vars) => {
      const one = lang === 'fr' ? n < 2 : n === 1;
      const key = `${base}.${one ? 'one' : 'other'}` as StringKey;
      return interpolate(table[key] ?? key, { n, ...vars });
    },
    money: (c) => formatCents(c, lang),
    signed: (c) => formatCents(c, lang, { signed: true }),
  };
  cache[lang] = tr;
  return tr;
}

export function listNames(names: string[], lang: Lang): string {
  if (names.length <= 1) return names.join('');
  const and = lang === 'fr' ? ' et ' : ' and ';
  return names.slice(0, -1).join(', ') + and + names[names.length - 1];
}
