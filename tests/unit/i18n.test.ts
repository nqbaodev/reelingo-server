import { describe, expect, it } from "vitest";
import { I18n, resolveLanguage, translate } from "@/core/i18n";

describe("translate", () => {
  it("returns the catalog entry for the requested language", () => {
    expect(translate(I18n.routeNotFound, "vi")).toBe("Không tìm thấy đường dẫn");
  });

  it("interpolates params and leaves unfilled placeholders untouched", () => {
    expect(translate(I18n.emailInUse, "en", { email: "a@b.com" })).toBe(
      "Email a@b.com is already in use",
    );
    expect(translate(I18n.emailInUse, "en")).toBe("Email {email} is already in use");
  });

  it("does not HTML-escape interpolated values in a JSON API", () => {
    expect(translate(I18n.emailInUse, "en", { email: "a&b<c>" })).toBe(
      "Email a&b<c> is already in use",
    );
  });

  it("falls back to English for an unsupported language", () => {
    expect(translate(I18n.somethingWentWrong, "fr")).toBe("Something went wrong");
  });
});

describe("resolveLanguage", () => {
  it("prefers the explicit X-Language header over Accept-Language", () => {
    expect(resolveLanguage("vi", "en")).toBe("vi");
    expect(resolveLanguage("vi-VN", "en")).toBe("vi");
  });

  it("honours Accept-Language quality weights", () => {
    expect(resolveLanguage(undefined, "vi;q=0.8, en;q=0.9")).toBe("en");
    expect(resolveLanguage(undefined, "en;q=0, vi")).toBe("vi");
  });

  it("defaults to English when nothing usable is sent", () => {
    expect(resolveLanguage(undefined, undefined)).toBe("en");
    expect(resolveLanguage("ja", "fr, de")).toBe("en");
  });
});
