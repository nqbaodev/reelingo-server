import i18next from "i18next";
import { z } from "zod";
import { DEFAULT_LANGUAGE, LANGUAGE, type Language, SUPPORTED_LANGUAGES } from "./language-codes";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

export type MessageKey = keyof typeof en;
export type MessageParams = Readonly<Record<string, string | number>>;

// Typing every catalog against the English keys makes a missing translation a
// compile error instead of a silent runtime fallback.
const catalogs: Record<Language, Record<MessageKey, string>> = {
  [LANGUAGE.EN]: en,
  [LANGUAGE.VI]: vi,
};

// Zod's own validation messages (the 422 `details[].message`) are localized by
// the same table, so adding a language here forces adding its Zod locale too.
const zodLocales: Record<Language, z.core.$ZodErrorMap> = {
  [LANGUAGE.EN]: z.locales.en().localeError,
  [LANGUAGE.VI]: z.locales.vi().localeError,
};

void i18next.init({
  resources: Object.fromEntries(
    Object.entries(catalogs).map(([lng, translation]) => [lng, { translation }]),
  ),
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // Resources are inline, so init can complete synchronously before the first request.
  initAsync: false,
  interpolation: {
    // ICU-style single braces, matching Lokalise/format.js rather than i18next's {{ }} default.
    prefix: "{",
    suffix: "}",
    // Messages are returned as JSON, never rendered as HTML.
    escapeValue: false,
  },
});

/**
 * The only place the app talks to i18next. Language is passed per call rather
 * than via `changeLanguage`, so concurrent requests never share state.
 */
export function translate(
  key: MessageKey,
  language: string = DEFAULT_LANGUAGE,
  params: MessageParams = {},
): string {
  return i18next.t(key, { lng: language, ...params });
}

/** Error map for `schema.safeParse(data, { error })`, so Zod issues follow the request language. */
export function zodErrorMap(language: string = DEFAULT_LANGUAGE): z.core.$ZodErrorMap {
  return zodLocales[isSupported(language) ? language : DEFAULT_LANGUAGE];
}

function isSupported(language: string): language is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}
