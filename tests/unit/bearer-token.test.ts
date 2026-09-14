import { describe, expect, it } from "vitest";
import { readBearerToken } from "@/features/auth/presentation/bearer-token";

describe("readBearerToken", () => {
  it.each(["Bearer", "bearer", "BEARER"])(
    "accepts the case-insensitive %s scheme",
    (scheme) => {
      expect(readBearerToken(`${scheme} header.payload.signature`)).toBe(
        "header.payload.signature",
      );
    },
  );

  it("accepts multiple separating spaces and opaque Bearer credentials", () => {
    expect(readBearerToken("Bearer   abc-._~+/123==")).toBe("abc-._~+/123==");
  });

  it.each([
    undefined,
    "",
    "Bearer",
    "Bearer ",
    "Basic abc",
    "Bearer\tabc",
    "Bearer abc extra",
    "Bearer abc,def",
    "Bearer abc\ndef",
    "Bearer abc\n",
    "Bearer abc\r\n",
    "Bearer ab=c",
  ])("rejects a missing or malformed header: %s", (header) => {
    expect(readBearerToken(header)).toBeUndefined();
  });
});
