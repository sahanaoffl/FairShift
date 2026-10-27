import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { SESSION_COOKIE, verifySessionToken } from "@/src/lib/session-token";
import { setRepositoryForTests } from "@/src/lib/repo";
import { MemoryRepo } from "@/src/lib/repo/memory";

function loginRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("login API", () => {
  beforeEach(() => {
    setRepositoryForTests(new MemoryRepo());
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    setRepositoryForTests(undefined);
    vi.unstubAllEnvs();
  });

  it.each([
    {
      role: "worker",
      organisationId: "org-construction",
      workerId: "org-construction-worker-1",
      pin: "1234",
    },
    { role: "admin", organisationId: "org-construction", pin: "2468" },
  ])("returns a JSON service error when session signing is not configured for $role", async (credentials) => {
    vi.stubEnv("SESSION_SECRET", "");
    const response = await POST(loginRequest(credentials));

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "Sign in is temporarily unavailable." });
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it.each([
    {
      role: "worker",
      organisationId: "org-construction",
      workerId: "org-construction-worker-1",
      pin: "1234",
    },
    { role: "admin", organisationId: "org-construction", pin: "2468" },
  ])("creates an authenticated session for a valid $role login", async (credentials) => {
    vi.stubEnv("SESSION_SECRET", "fairshift-test-session-secret-with-at-least-32-characters");
    const response = await POST(loginRequest(credentials));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({ role: credentials.role });
    const token = response.cookies.get(SESSION_COOKIE)?.value;
    expect(token).toBeTruthy();
    await expect(verifySessionToken(token!)).resolves.toMatchObject({ role: credentials.role });
  });
});
