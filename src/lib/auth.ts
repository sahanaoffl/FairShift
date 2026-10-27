import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/src/lib/session-token";
export { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/src/lib/session-token";
import type { Session } from "@/src/lib/session-token";
export type { Session } from "@/src/lib/session-token";

export async function getSession(): Promise<Session | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : undefined;
}
