/**
 * i18n runtime: t(key), setLocale, getLocale, onLocaleChange.
 * Persists only the locale in localStorage. Default 'en'.
 */
import type { Locale } from '@/core/types';
import { en } from './en';
import { cs } from './cs';

const LOCALE_STORAGE_KEY = 'kitsune.locale';

const dictionaries: Record<Locale, Record<string, string>> = { en, cs };

function loadInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'cs') return stored;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

let currentLocale: Locale = loadInitialLocale();
const listeners = new Set<(locale: Locale) => void>();

/** Resolve an i18n key in the current locale. Unknown keys echo back. */
export function t(key: string): string {
  return dictionaries[currentLocale][key] ?? key;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  for (const listener of [...listeners]) listener(locale);
}

export function toggleLocale(): Locale {
  setLocale(currentLocale === 'en' ? 'cs' : 'en');
  return currentLocale;
}

/** Subscribe to locale switches. Returns an unsubscribe function. */
export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
