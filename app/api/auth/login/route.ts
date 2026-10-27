import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE } from "@/src/lib/auth";
import { getRepository } from "@/src/lib/repo";
import { getAdminPinHash } from "@/src/lib/seed";
import { rateLimit } from "@/src/lib/rate-limit";

const loginSchema = z.object({
  role: z.enum(["worker", "admin"]),
  organisationId: z.string().min(1).max(100),
  pin: z.string().regex(/^\d{4}$/),
  workerId: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`login:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Too many attempts. Try again in one minute." }, { status: 429 });
  const input = loginSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Enter a valid PIN and account." }, { status: 400 });

  const repo = getRepository();
  const organisation = await repo.getOrganisation(input.data.organisationId);
  if (!organisation) return NextResponse.json({ error: "Account not found." }, { status: 401 });
  let session;
  if (input.data.role === "admin") {
    if (!await bcrypt.compare(input.data.pin, getAdminPinHash())) return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
    session = { sub: `admin:${organisation.id}`, role: "admin" as const, organisationId: organisation.id, name: "Site administrator" };
  } else {
    if (!input.data.workerId) return NextResponse.json({ error: "Choose your name." }, { status: 400 });
    const worker = await repo.getWorker(input.data.workerId);
    if (!worker || worker.organisationId !== organisation.id || !worker.active ||
      !await bcrypt.compare(input.data.pin, worker.pinHash)) {
      return NextResponse.json({ error: "Name or PIN is incorrect." }, { status: 401 });
    }
    session = { sub: worker.id, role: "worker" as const, organisationId: worker.organisationId, name: worker.name };
  }
  const token = await createSessionToken(session);
  const response = NextResponse.json({ role: session.role, name: session.name });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 12,
  });
  return response;
}
