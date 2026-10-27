import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimitsForTests } from "@/src/lib/rate-limit";

afterEach(resetRateLimitsForTests);

describe("rateLimit", () => {
  it("allows requests up to the configured maximum", () => {
    expect(rateLimit("user", 2, 1000, 0)).toBe(true);
    expect(rateLimit("user", 2, 1000, 1)).toBe(true);
    expect(rateLimit("user", 2, 1000, 2)).toBe(false);
  });
  it("resets the counter after its window", () => {
    rateLimit("user", 1, 1000, 0);
    expect(rateLimit("user", 1, 1000, 1000)).toBe(true);
  });
  it("keeps separate caller keys independent", () => {
    rateLimit("one", 1, 1000, 0);
    expect(rateLimit("two", 1, 1000, 0)).toBe(true);
  });
});
