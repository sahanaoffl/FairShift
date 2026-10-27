import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { calculatePay } from "@/src/lib/pay";
import { getRepository } from "@/src/lib/repo";

const settingsSchema = z.object({
  overtimeMultiplier: z.number().min(1).max(3),
  deductions: z.array(z.object({ key: z.string().min(1).max(30), ratePercent: z.number().min(0).max(30) })).max(5),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const monthInput = z.string().regex(/^\d{4}-\d{2}$/).optional().safeParse(request.nextUrl.searchParams.get("month") ?? undefined);
  if (!monthInput.success) return NextResponse.json({ error: "Month must use YYYY-MM format." }, { status: 400 });
  const repo = getRepository();
  const organisation = await repo.getOrganisation(session.organisationId);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  const month = monthInput.data ?? new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const start = new Date(`${from}T00:00:00Z`);
  const to = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const [workers, records] = await Promise.all([
    repo.listWorkers(session.organisationId), repo.listOrganisationAttendance(session.organisationId, from, to),
  ]);
  const payroll = workers.map((worker) => {
    const workerRecords = records.filter((record) => record.workerId === worker.id);
    return {
      worker: { id: worker.id, name: worker.name, role: worker.role, payMode: worker.payMode, hourlyRateRupees: worker.hourlyRateRupees, monthlySalaryRupees: worker.monthlySalaryRupees },
      records: workerRecords,
      payslip: calculatePay(workerRecords, { ...organisation.payRules, payMode: worker.payMode, hourlyRateRupees: worker.hourlyRateRupees, monthlySalaryRupees: worker.monthlySalaryRupees }),
    };
  });
  return NextResponse.json({ organisation, month, payroll });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const input = settingsSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid payroll settings." }, { status: 400 });
  const repo = getRepository();
  const organisation = await repo.getOrganisation(session.organisationId);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  await repo.saveOrganisation({ ...organisation, payRules: { ...organisation.payRules, ...input.data } });
  return NextResponse.json({ ok: true });
}
