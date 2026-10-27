import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getIndustryProfile } from "@/src/lib/industry";
import { detectFatigue } from "@/src/lib/fatigue";
import { getRepository } from "@/src/lib/repo";
import type { Worker } from "@/src/types";

function dateInIndia(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

function sanitizeWorker(worker: Worker) {
  return {
    id: worker.id, organisationId: worker.organisationId, name: worker.name, role: worker.role,
    language: worker.language, payMode: worker.payMode, hourlyRateRupees: worker.hourlyRateRupees,
    monthlySalaryRupees: worker.monthlySalaryRupees, active: worker.active,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const repo = getRepository();
  const [worker, organisation] = await Promise.all([repo.getWorker(session.sub), repo.getOrganisation(session.organisationId)]);
  if (!worker || !organisation || worker.organisationId !== session.organisationId) return NextResponse.json({ error: "Worker account not found." }, { status: 404 });
  const today = dateInIndia();
  const now = new Date();
  const weekStart = dateInIndia(new Date(now.getTime() - 6 * 86_400_000));
  const [records, skills] = await Promise.all([
    repo.listAttendance(worker.id, weekStart, today),
    repo.listSkills(worker.id),
  ]);
  const todayRecords = records.filter((record) => record.workDate === today);
  const current = records.find((record) => !record.checkOut);
  const fatigue = detectFatigue(records);
  return NextResponse.json({
    worker: sanitizeWorker(worker), organisation, profile: getIndustryProfile(organisation.industry),
    records: todayRecords, current, weeklyHours: records.reduce((hours, record) => {
      if (!record.checkOut) return hours;
      return hours + Math.max(0, (Date.parse(record.checkOut) - Date.parse(record.checkIn)) / 3_600_000 - record.breakMinutes / 60);
    }, 0),
    fatigue: fatigue.reasons.length ? fatigue : undefined, skills,
  });
}
