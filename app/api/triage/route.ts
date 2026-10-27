import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { getRepository } from "@/src/lib/repo";
import { triageReport } from "@/src/lib/triage";

const schema = z.object({ category: z.string().min(1).max(80), text: z.string().trim().min(5).max(2000) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid report content." }, { status: 400 });
  const organisation = await getRepository().getOrganisation(session.organisationId);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  return NextResponse.json(await triageReport(input.data.text, input.data.category, organisation.industry));
}
