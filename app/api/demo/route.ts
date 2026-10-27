import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/src/lib/session-token";
import { getRepository } from "@/src/lib/repo";

const actionSchema = z.object({
  action: z.enum(["login", "switch"]),
  role: z.enum(["worker", "admin"]),
  industry: z.enum(["construction", "college"]),
});

export async function GET() {
  const repo = getRepository();
  const organisations = await repo.listOrganisations();
  const workers = await Promise.all(organisations.map(async (organisation) => ({
    organisationId: organisation.id,
    workers: (await repo.listWorkers(organisation.id)).map(({ id, name, role, language }) => ({ id, name, role, language })),
  })));
  return NextResponse.json({ organisations: organisations.map(({ id, name, industry }) => ({ id, name, industry })), workers });
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO !== "true") return NextResponse.json({ error: "Demo controls are disabled." }, { status: 404 });
  const input = actionSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid demo action." }, { status: 400 });
  const repo = getRepository();
  const organisation = (await repo.listOrganisations()).find((item) => item.industry === input.data.industry);
  if (!organisation) return NextResponse.json({ error: "Sample organisation not found." }, { status: 404 });
  let session;
  if (input.data.action === "switch") {
    const current = await getSession();
    if (!current || current.role !== input.data.role) return NextResponse.json({ error: "Sign in before switching industries." }, { status: 401 });
    if (current.role === "worker") {
      const worker = (await repo.listWorkers(organisation.id)).find((item) => item.active);
      if (!worker) return NextResponse.json({ error: "Sample worker not found." }, { status: 404 });
      session = { sub: worker.id, role: "worker" as const, organisationId: organisation.id, name: worker.name };
    } else {
      session = { sub: `admin:${organisation.id}`, role: "admin" as const, organisationId: organisation.id, name: "Site administrator" };
    }
  } else if (input.data.role === "worker") {
    const worker = (await repo.listWorkers(organisation.id)).find((item) => item.active);
    if (!worker) return NextResponse.json({ error: "Sample worker not found." }, { status: 404 });
    session = { sub: worker.id, role: "worker" as const, organisationId: organisation.id, name: worker.name };
  } else {
    session = { sub: `admin:${organisation.id}`, role: "admin" as const, organisationId: organisation.id, name: "Site administrator" };
  }
  const response = NextResponse.json({ role: session.role, path: session.role === "worker" ? "/worker" : "/admin" });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(session), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return response;
}
