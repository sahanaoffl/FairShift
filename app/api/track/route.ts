import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/src/lib/rate-limit";
import { getRepository } from "@/src/lib/repo";
import { hashTrackingCode } from "@/src/lib/tracking";

const trackSchema = z.object({ code: z.string().regex(/^FS-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/i) });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`track:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many lookups. Try again shortly." }, { status: 429 });
  const input = trackSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Enter a valid tracking code." }, { status: 400 });
  const grievance = await getRepository().getGrievanceByTrackingHash(hashTrackingCode(input.data.code));
  if (!grievance) return NextResponse.json({ error: "No report was found for this code." }, { status: 404 });
  return NextResponse.json({
    status: grievance.status, category: grievance.category, publicReply: grievance.publicReply,
    timeline: [
      { key: "submitted", complete: true, at: grievance.createdAt },
      { key: "in_review", complete: grievance.status === "in_review" || grievance.status === "resolved", at: grievance.status === "submitted" ? undefined : grievance.updatedAt },
      { key: "resolved", complete: grievance.status === "resolved", at: grievance.status === "resolved" ? grievance.updatedAt : undefined },
    ],
  });
}
