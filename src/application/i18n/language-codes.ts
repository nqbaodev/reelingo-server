/** Language codes the API can answer in. Add one here and TypeScript lists every catalog to extend. */
export const LANGUAGE = {
  EN: "en",
  VI: "vi",
} as const;

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export const SUPPORTED_LANGUAGES: readonly Language[] = Object.values(LANGUAGE);
export const DEFAULT_LANGUAGE: Language = LANGUAGE.EN;
