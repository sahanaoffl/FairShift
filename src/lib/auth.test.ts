import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/src/lib/session-token";
import type { Session } from "@/src/lib/session-token";

describe("signed sessions", () => {
  const session: Session = { sub: "worker-1", role: "worker", organisationId: "org-1", name: "Sample worker" };
  it("round-trips role and organization claims", async () => {
    const token = await createSessionToken(session);
    expect(await verifySessionToken(token)).toEqual(session);
  });
  it("rejects a token with a changed signature", async () => {
    const token = await createSessionToken(session);
    expect(await verifySessionToken(`${token.slice(0, -1)}x`)).toBeUndefined();
  });
  it("rejects malformed tokens", async () => expect(await verifySessionToken("not-a-session")).toBeUndefined());
});
