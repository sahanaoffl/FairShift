import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

function signingKey(): Uint8Array {
  const configured = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "fairshift-local-demo-session-secret-change-me");
  if (configured.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(configured);
}

export async function createCheckInToken(organisationId: string): Promise<string> {
  return new SignJWT({ purpose: "checkin", organisationId, nonce: randomUUID() })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("60s").sign(signingKey());
}

export async function verifyCheckInToken(token: string, organisationId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    return payload.purpose === "checkin" && payload.organisationId === organisationId;
  } catch {
    return false;
  }
}
