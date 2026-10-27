import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { getRepository } from "@/src/lib/repo";

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["submitted", "in_review", "resolved"]),
  publicReply: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const reports = await getRepository().listGrievances(session.organisationId);
  return NextResponse.json(reports.map((report) => ({
    id: report.id, category: report.category, urgency: report.urgency,
    summary: report.englishSummary, translation: report.englishTranslation,
    status: report.status, publicReply: report.publicReply,
    trackingPrefix: report.trackingHash.slice(0, 8),
    ageDays: Math.max(0, Math.floor((Date.now() - Date.parse(report.createdAt)) / 86_400_000)),
    createdAt: report.createdAt, triageSource: report.triageSource,
    attachmentDataUrl: report.attachmentDataUrl,
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const input = updateSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid report update." }, { status: 400 });
  const repo = getRepository();
  const report = (await repo.listGrievances(session.organisationId)).find((item) => item.id === input.data.id);
  if (!report) return NextResponse.json({ error: "Report not found in your organisation." }, { status: 404 });
  const updated = {
    ...report, status: input.data.status, updatedAt: new Date().toISOString(),
    ...(input.data.publicReply !== undefined ? { publicReply: input.data.publicReply } : {}),
  };
  await repo.saveGrievance(updated);
  return NextResponse.json({ ok: true });
}
