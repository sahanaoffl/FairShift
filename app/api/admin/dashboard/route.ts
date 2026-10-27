import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { detectFatigue } from "@/src/lib/fatigue";
import { getRepository } from "@/src/lib/repo";

function dateKey(offset: number): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now.getTime() - offset * 86_400_000));
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const repo = getRepository();
  const [organisation, workers, grievances, attendance] = await Promise.all([
    repo.getOrganisation(session.organisationId), repo.listWorkers(session.organisationId),
    repo.listGrievances(session.organisationId), repo.listOrganisationAttendance(session.organisationId, dateKey(20), dateKey(0)),
  ]);
  if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  const today = dateKey(0);
  const open = grievances.filter((item) => item.status !== "resolved");
  const fatigue = workers.map((worker) => ({ workerId: worker.id, name: worker.name, role: worker.role, ...detectFatigue(attendance.filter((item) => item.workerId === worker.id)) }))
    .filter((worker) => worker.reasons.length > 0);
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = dateKey(13 - index);
    return { date, attendance: attendance.filter((record) => record.workDate === date).length };
  });
  const categories = [...new Set(grievances.map((item) => item.category))].map((category) => ({
    category, reports: grievances.filter((item) => item.category === category).length,
  }));
  const overtimeByTeam = workers.map((worker) => ({
    role: worker.role,
    hours: attendance.filter((record) => record.workerId === worker.id && record.checkOut)
      .reduce((hours, record) => hours + Math.max(0, (Date.parse(record.checkOut!) - Date.parse(record.checkIn)) / 3_600_000 - record.breakMinutes / 60 - 8), 0),
  })).reduce<{ role: string; hours: number }[]>((groups, item) => {
    const existing = groups.find((group) => group.role === item.role);
    if (existing) existing.hours += item.hours;
    else groups.push({ ...item });
    return groups;
  }, []);

  const riskList = workers.map((worker) => {
    const workerRecords = attendance.filter((item) => item.workerId === worker.id);
    const recent = workerRecords.filter((item) => item.workDate >= dateKey(7)).length;
    const prior = workerRecords.filter((item) => item.workDate < dateKey(7) && item.workDate >= dateKey(14)).length;
    const attendanceDrop = prior > 0 ? Math.max(0, Math.round((prior - recent) / prior * 100)) : 0;
    const lateArrivals = workerRecords.filter((item) => new Date(item.checkIn).getUTCHours() >= 9).length;
    const overtimeHours = workerRecords.reduce((sum, record) => sum + (record.checkOut ? Math.max(0, (Date.parse(record.checkOut) - Date.parse(record.checkIn)) / 3_600_000 - 8) : 0), 0);
    const reasons: string[] = [];
    let score = 0;
    if (attendanceDrop >= 25) { score += Math.min(35, attendanceDrop * 0.35); reasons.push(`Attendance down ${attendanceDrop}%`); }
    if (lateArrivals >= 3) { score += Math.min(20, lateArrivals * 2); reasons.push(`${lateArrivals} late arrivals in the period`); }
    if (overtimeHours >= 20) { score += Math.min(25, overtimeHours); reasons.push(`${overtimeHours.toFixed(0)} overtime hours`); }
    if (open.length > 0) { score += 10; reasons.push(`${open.length} unresolved workplace reports (organisation-wide, not linked to workers)`); }
    return { workerId: worker.id, name: worker.name, role: worker.role, score: Math.min(100, Math.round(score)), reasons };
  }).filter((worker) => worker.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  return NextResponse.json({
    organisation, todayAttendance: attendance.filter((record) => record.workDate === today).length,
    openReports: open.length, urgentReports: open.filter((item) => item.urgency === "high" || item.urgency === "critical").length,
    fatigueCount: fatigue.length, fatigue, trend, categories, overtimeByTeam, retentionRisk: riskList,
  });
}
