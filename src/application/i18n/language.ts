import { DEFAULT_LANGUAGE, type Language, SUPPORTED_LANGUAGES } from "./language-codes";

function baseLanguage(tag: string): Language | undefined {
  const base = tag.trim().toLowerCase().split("-")[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base ?? "")
    ? (base as Language)
    : undefined;
}

export function resolveLanguage(explicit?: string, accepted?: string): Language {
  const preferred = baseLanguage(explicit ?? "");
  if (preferred) return preferred;

  const ranges = (accepted ?? "").split(",").map((entry, index) => {
    const [rawTag = "", ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const rawWeight = quality?.trim().slice(2);
    const weight =
      rawWeight === undefined
        ? 1
        : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(rawWeight)
          ? Number(rawWeight)
          : 0;
    return { tag: rawTag.trim(), weight, index };
  });

  // A specific range (including q=0) takes precedence over a wildcard.
  const candidates = SUPPORTED_LANGUAGES.map((language) => {
    const specific = ranges.filter((range) => baseLanguage(range.tag) === language);
    const matches = specific.length
      ? specific
      : ranges.filter((range) => range.tag === "*");
    const best = matches.sort((a, b) => b.weight - a.weight || a.index - b.index)[0];
    return { language, weight: best?.weight ?? 0, index: best?.index ?? Infinity };
  });
  return (
    candidates
      .filter((candidate) => candidate.weight > 0)
      .sort((a, b) => b.weight - a.weight || a.index - b.index)[0]?.language ??
    DEFAULT_LANGUAGE
  );
}
