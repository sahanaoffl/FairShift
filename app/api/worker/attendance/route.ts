import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { getIndustryProfile } from "@/src/lib/industry";
import { getRepository } from "@/src/lib/repo";
import { verifyCheckInToken } from "@/src/lib/qr";

const attendanceSchema = z.object({
  action: z.enum(["check_in", "check_out"]),
  qrToken: z.string().max(2000).optional(),
  shiftType: z.string().max(40).optional(),
});

function dateInIndia(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const input = attendanceSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid attendance action." }, { status: 400 });
  const repo = getRepository();
  const worker = await repo.getWorker(session.sub);
  if (!worker || worker.organisationId !== session.organisationId) return NextResponse.json({ error: "Worker account not found." }, { status: 404 });
  const now = new Date();
  const today = dateInIndia(now);
  const rangeStart = dateInIndia(new Date(now.getTime() - 7 * 86_400_000));
  const records = await repo.listAttendance(worker.id, rangeStart, today);
  const current = records.find((item) => !item.checkOut);
  if (input.data.action === "check_in") {
    if (current) return NextResponse.json({ error: "You are already checked in." }, { status: 409 });
    if (input.data.qrToken && !await verifyCheckInToken(input.data.qrToken, session.organisationId)) {
      return NextResponse.json({ error: "This QR code has expired. Scan the current code." }, { status: 400 });
    }
    const organisation = await repo.getOrganisation(session.organisationId);
    if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
    const profile = getIndustryProfile(organisation.industry);
    const shiftType = input.data.shiftType ?? profile.shiftTypes[0];
    if (!profile.shiftTypes.includes(shiftType)) return NextResponse.json({ error: "Choose a shift type for this industry." }, { status: 400 });
    const record = {
      id: randomUUID(), organisationId: session.organisationId, workerId: worker.id,
      workDate: today, shiftType,
      checkIn: now.toISOString(), breakMinutes: 0, source: input.data.qrToken ? "qr" as const : "manual" as const,
    };
    await repo.saveAttendance(record);
    return NextResponse.json({ record });
  }
  if (!current) return NextResponse.json({ error: "Check in before checking out." }, { status: 409 });
  const updated = { ...current, checkOut: now.toISOString() };
  await repo.saveAttendance(updated);
  return NextResponse.json({ record: updated });
}
