import pino from "pino";
import { describe, expect, it } from "vitest";
import { NotFoundError, ServiceUnavailableError, ValidationError } from "@/core/errors";
import { I18n } from "@/core/i18n";

describe("AppError", () => {
  it("keeps the wrapped failure on the native error.cause", () => {
    const root = new Error("API key not valid");
    const err = new ServiceUnavailableError(I18n.serviceUnavailable, { params: { service: "AI generation" }, cause: root });

    expect(err.cause).toBe(root);
    expect(err.message).toBe(I18n.serviceUnavailable);
    expect(err.statusCode).toBe(503);
  });

  it("leaves cause undefined when none is given", () => {
    const err = new NotFoundError(I18n.userNotFound, { params: { id: "u1" } });

    expect(err.cause).toBeUndefined();
    expect(err.params).toEqual({ id: "u1" });
  });

  it("carries client-safe details separately from the cause", () => {
    const details = [{ path: "email", message: "Invalid email" }];
    const err = new ValidationError(I18n.validationFailed, { details, cause: new Error("zod") });

    expect(err.details).toEqual(details);
    expect((err.cause as Error).message).toBe("zod");
  });

  it("surfaces the whole cause chain through pino's default err serializer", () => {
    const root = new Error("API key not valid");
    const middle = new Error("Gemini text generation is unavailable", { cause: root });
    const err = new ServiceUnavailableError(I18n.serviceUnavailable, { cause: middle });

    const serialized = pino.stdSerializers.err(err) as { type: string; message: string };

    expect(serialized.type).toBe("ServiceUnavailableError");
    expect(serialized.message).toBe(
      "serviceUnavailable: Gemini text generation is unavailable: API key not valid",
    );
  });
});
