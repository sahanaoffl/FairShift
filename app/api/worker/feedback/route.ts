import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { rateLimit } from "@/src/lib/rate-limit";
import { getRepository } from "@/src/lib/repo";

const feedbackSchema = z.object({
  managerRating: z.number().int().min(1).max(5),
  policiesRating: z.number().int().min(1).max(5),
  conditionsRating: z.number().int().min(1).max(5),
  text: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`feedback:${ip}`, 2, 24 * 60 * 60_000)) return NextResponse.json({ error: "Feedback limit reached for today." }, { status: 429 });
  const input = feedbackSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Ratings must be between one and five." }, { status: 400 });
  const entry = {
    id: randomUUID(), organisationId: session.organisationId, ...input.data,
    createdAt: new Date().toISOString(),
  };
  await getRepository().saveFeedback(entry);
  return NextResponse.json({ ok: true }, { status: 201 });
}
