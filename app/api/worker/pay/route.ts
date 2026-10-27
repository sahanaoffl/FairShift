import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/lib/auth";
import { calculatePay } from "@/src/lib/pay";
import { getRepository } from "@/src/lib/repo";

const querySchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const month = querySchema.safeParse(request.nextUrl.searchParams.get("month") ?? undefined);
  if (!month.success) return NextResponse.json({ error: "Month must use YYYY-MM format." }, { status: 400 });
  const repo = getRepository();
  const [worker, organisation] = await Promise.all([repo.getWorker(session.sub), repo.getOrganisation(session.organisationId)]);
  if (!worker || !organisation || worker.organisationId !== session.organisationId) return NextResponse.json({ error: "Worker account not found." }, { status: 404 });
  const monthValue = month.data ?? new Date().toISOString().slice(0, 7);
  const from = `${monthValue}-01`;
  const monthStart = new Date(`${from}T00:00:00Z`);
  const to = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const records = await repo.listAttendance(worker.id, from, to);
  const rules = { ...organisation.payRules, payMode: worker.payMode, hourlyRateRupees: worker.hourlyRateRupees, monthlySalaryRupees: worker.monthlySalaryRupees };
  return NextResponse.json({ month: monthValue, records, payslip: calculatePay(records, rules), rules });
}
