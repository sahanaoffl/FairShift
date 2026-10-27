import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fairshift_session";
export interface Session {
  sub: string;
  role: "worker" | "admin";
  organisationId: string;
  name: string;
}

function configuredSecret(): string {
  return process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "fairshift-local-demo-session-secret-change-me");
}

export function hasSessionSecret(): boolean {
  return configuredSecret().length >= 32;
}

function secret(): Uint8Array {
  const value = configuredSecret();
  if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, organisationId: session.organisationId, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<Session | undefined> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string" ||
      (payload.role !== "worker" && payload.role !== "admin") ||
      typeof payload.organisationId !== "string" || typeof payload.name !== "string") return undefined;
    return {
      sub: payload.sub, role: payload.role,
      organisationId: payload.organisationId, name: payload.name,
    };
  } catch {
    return undefined;
  }
}
