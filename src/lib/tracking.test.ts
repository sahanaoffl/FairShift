import { describe, expect, it } from "vitest";
import { generateTrackingCode, hashTrackingCode } from "@/src/lib/tracking";

describe("tracking codes", () => {
  it("generates human-readable codes with the expected format", () => expect(generateTrackingCode()).toMatch(/^FS-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/));
  it("hashes codes deterministically with the provided salt", () => expect(hashTrackingCode("FS-ABCD-EFGH", "salt")).toBe(hashTrackingCode("FS-ABCD-EFGH", "salt")));
  it("normalizes case and surrounding whitespace", () => expect(hashTrackingCode(" fs-abcd-efgh ", "salt")).toBe(hashTrackingCode("FS-ABCD-EFGH", "salt")));
  it("uses the salt to prevent cross-environment matching", () => expect(hashTrackingCode("FS-ABCD-EFGH", "one")).not.toBe(hashTrackingCode("FS-ABCD-EFGH", "two")));
});
