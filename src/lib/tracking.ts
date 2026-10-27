import { createHash, randomBytes } from "node:crypto";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateTrackingCode(): string {
  const bytes = randomBytes(8);
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `FS-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function hashTrackingCode(code: string, salt = process.env.TRACKING_SALT ?? process.env.SESSION_SECRET): string {
  if (!salt && process.env.NODE_ENV === "production") {
    throw new Error("TRACKING_SALT must be configured in production");
  }
  return createHash("sha256").update(`${salt ?? "fairshift-local-demo"}:${code.trim().toUpperCase()}`).digest("hex");
}
