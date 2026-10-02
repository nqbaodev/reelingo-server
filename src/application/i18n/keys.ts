import en from "./locales/en.json";
import type { MessageKey } from "./translator";

/**
 * Typed handle for every message key, derived from `en.json` so there is
 * nothing to keep in sync. Call sites write `I18n.userNotFound` instead of the
 * raw `"userNotFound"` string and get autocomplete and rename safety.
 */
export const I18n = Object.fromEntries(Object.keys(en).map((key) => [key, key])) as {
  readonly [K in MessageKey]: K;
};
