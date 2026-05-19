/**
 * i18n — minimal locale system.
 *
 * Two locales: "en" (default) and "cs" (Czech).
 * Active locale is stored in localStorage under "kitsune-locale" so it
 * persists across page reloads. It's also mirrored into the Phaser
 * global registry so scenes can read it without going through the DOM.
 *
 * Usage:
 *   import { t, getLocale, setLocale } from "@/i18n";
 *   t("title.subtitle")           // → localized string
 *   t("dialog.yanagi.intro")      // → ...
 *
 * Missing keys log a console warning and fall back to the key itself.
 * Mid-game locale changes emit a "locale-changed" event on the window so
 * UI components can re-render.
 */

import { en } from "./en";
import { cs } from "./cs";

export type Locale = "en" | "cs";
export type TranslationDict = Record<string, string>;

const STORAGE_KEY = "kitsune-locale";
const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, TranslationDict> = { en, cs };

let activeLocale: Locale = readStoredLocale();

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "cs") return stored;
  } catch {
    // localStorage may be unavailable (SSR / sandboxed iframes).
  }
  return DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  return activeLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === activeLocale) return;
  activeLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent("locale-changed", { detail: { locale } }),
  );
}

export function toggleLocale(): Locale {
  setLocale(activeLocale === "en" ? "cs" : "en");
  return activeLocale;
}

/**
 * Look up a translation by dotted key. If the key isn't present in the
 * active locale, fall back to English; if it isn't there either, return
 * the key itself (and warn once).
 *
 * Supports `{name}` placeholders via the optional params arg.
 */
const warnedKeys = new Set<string>();
export function t(key: string, params?: Record<string, string>): string {
  const lookup = dictionaries[activeLocale][key] ?? dictionaries.en[key];
  if (lookup === undefined) {
    if (!warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`[i18n] Missing translation for key "${key}"`);
    }
    return key;
  }
  if (!params) return lookup;
  return lookup.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

/**
 * Register a listener that re-fires whenever the locale changes.
 * Returns an unsubscribe function.
 */
export function onLocaleChange(handler: (locale: Locale) => void): () => void {
  const wrapped = (e: Event): void => {
    const ce = e as CustomEvent<{ locale: Locale }>;
    handler(ce.detail.locale);
  };
  window.addEventListener("locale-changed", wrapped);
  return () => window.removeEventListener("locale-changed", wrapped);
}
