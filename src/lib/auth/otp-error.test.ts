import { describe, expect, it } from "vitest";

import { isUnknownAddress } from "./otp-error";

describe("isUnknownAddress", () => {
  it("reads the refusal codes as « that address is nobody »", () => {
    expect(
      isUnknownAddress({
        code: "otp_disabled",
        message: "Signups not allowed for otp",
      }),
    ).toBe(true);
    expect(
      isUnknownAddress({
        code: "signup_disabled",
        message: "Signups not allowed",
      }),
    ).toBe(true);
  });

  it("falls back on the wording when no code came with it", () => {
    // A server that predates the `code` field still says it in the message,
    // and the answer the screen gives must not depend on that.
    expect(isUnknownAddress({ message: "Signups not allowed for otp" })).toBe(
      true,
    );
    expect(
      isUnknownAddress({ code: null, message: "Signup not allowed" }),
    ).toBe(true);
  });

  it("leaves a genuine breakdown alone", () => {
    expect(
      isUnknownAddress({
        code: "unexpected_failure",
        message: "Error sending confirmation email",
      }),
    ).toBe(false);
    expect(isUnknownAddress({ message: "Database is not available" })).toBe(
      false,
    );
  });
});
