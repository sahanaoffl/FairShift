import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { detectFatigue } from "@/src/lib/fatigue";
import { getIndustryProfile } from "@/src/lib/industry";
import { getRepository } from "@/src/lib/repo";

const skillSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), workerId: z.string().min(1), name: z.string().min(2).max(80), issuer: z.string().min(2).max(100), issuedAt: z.string().date() }),
  z.object({ action: z.literal("verify"), skillId: z.string().min(1) }),
]);

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const repo = getRepository();
  const [organisation, workers, records] = await Promise.all([
    repo.getOrganisation(session.organisationId), repo.listWorkers(session.organisationId),
    repo.listOrganisationAttendance(session.organisationId),
  ]);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  const roster = await Promise.all(workers.map(async (worker) => {
    const safeWorker = {
      id: worker.id, organisationId: worker.organisationId, name: worker.name, role: worker.role,
      language: worker.language, payMode: worker.payMode, hourlyRateRupees: worker.hourlyRateRupees,
      monthlySalaryRupees: worker.monthlySalaryRupees, active: worker.active,
    };
    const workerRecords = records.filter((record) => record.workerId === worker.id);
    return {
      ...safeWorker,
      fatigue: detectFatigue(workerRecords),
      attendanceDays: workerRecords.length,
      attendance: workerRecords.map((record) => ({
        id: record.id, workDate: record.workDate, checkIn: record.checkIn,
        checkOut: record.checkOut, shiftType: record.shiftType,
      })),
      skills: await repo.listSkills(worker.id),
    };
  }));
  return NextResponse.json({ organisation, workers: roster });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const input = skillSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid skill update." }, { status: 400 });
  const repo = getRepository();
  if (input.data.action === "verify") {
    const skillId = input.data.skillId;
    const workers = await repo.listWorkers(session.organisationId);
    for (const worker of workers) {
      const skill = (await repo.listSkills(worker.id)).find((item) => item.id === skillId);
      if (skill) {
        await repo.saveSkill({ ...skill, verified: true });
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "Skill not found in your organisation." }, { status: 404 });
  }
  const worker = await repo.getWorker(input.data.workerId);
  if (!worker || worker.organisationId !== session.organisationId) return NextResponse.json({ error: "Worker not found in your organisation." }, { status: 404 });
  const organisation = await repo.getOrganisation(session.organisationId);
  if (!organisation || !getIndustryProfile(organisation.industry).skills.includes(input.data.name)) return NextResponse.json({ error: "Choose a skill from this industry's skill list." }, { status: 400 });
  await repo.saveSkill({
    id: randomUUID(), organisationId: session.organisationId, workerId: worker.id,
    name: input.data.name, issuer: input.data.issuer, issuedAt: input.data.issuedAt, verified: true,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
