import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { getIndustryProfile } from "@/src/lib/industry";
import { rateLimit } from "@/src/lib/rate-limit";
import { getRepository } from "@/src/lib/repo";
import { generateTrackingCode, hashTrackingCode } from "@/src/lib/tracking";
import { triageReport } from "@/src/lib/triage";

const reportSchema = z.object({
  category: z.string().min(2).max(80),
  text: z.string().trim().min(5).max(2000),
  attachmentDataUrl: z.string().max(420_000).regex(/^data:image\/(?:jpeg|png|webp);base64,/).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`report:${ip}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Please wait before submitting another report." }, { status: 429 });
  const input = reportSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Add a report of at least five characters and a supported image." }, { status: 400 });
  const organisation = await getRepository().getOrganisation(session.organisationId);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  const profile = getIndustryProfile(organisation.industry);
  if (!profile.reportCategories.some((category) => category.key === input.data.category)) {
    return NextResponse.json({ error: "Choose a report category for this industry." }, { status: 400 });
  }
  const code = generateTrackingCode();
  const triage = await triageReport(input.data.text, input.data.category, organisation.industry);
  const createdAt = new Date().toISOString();
  await getRepository().saveGrievance({
    id: randomUUID(), organisationId: organisation.id,
    trackingHash: hashTrackingCode(code), category: triage.category, text: input.data.text,
    urgency: triage.urgency, englishSummary: triage.englishSummary,
    englishTranslation: triage.englishTranslation, keyThemes: triage.keyThemes,
    triageSource: triage.triageSource, status: "submitted", createdAt, updatedAt: createdAt,
    ...(input.data.attachmentDataUrl ? { attachmentDataUrl: input.data.attachmentDataUrl } : {}),
  });
  return NextResponse.json({ trackingCode: code, message: "Save this code to check your report status." }, { status: 201 });
}
