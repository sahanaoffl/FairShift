import bcrypt from "bcryptjs";
import { industryProfiles } from "@/src/lib/industry";
import type { AttendanceRecord, Grievance, Organisation, SkillRecord, Worker } from "@/src/types";

export const demoPins = { worker: "1234", admin: "2468" };
const pinHash = bcrypt.hashSync(demoPins.worker, "$2a$10$abcdefghijklmnopqrstuu");
const adminPinHash = bcrypt.hashSync(demoPins.admin, "$2a$10$abcdefghijklmnopqrstuu");
const names = [
  ["Arun Kumar", "en"], ["Meena Devi", "ta"], ["Ravi Shankar", "hi"], ["Lakshmi", "ta"],
  ["Suresh", "en"], ["Priya", "hi"], ["Kannan", "ta"], ["Amit", "hi"],
] as const;
const categories = ["safety_hazard", "wage_issue", "harassment", "equipment", "facilities", "pay_issue", "workload"];

export interface SeedData {
  organisations: Organisation[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  grievances: Grievance[];
  skills: SkillRecord[];
}

export function createSeedData(): SeedData {
  const organisations: Organisation[] = [
    { id: "org-construction", name: "Chennai BuildWorks", industry: "construction", payRules: industryProfiles.construction.payRules },
    { id: "org-college", name: "South City College", industry: "college", payRules: industryProfiles.college.payRules },
  ];
  const workers: Worker[] = organisations.flatMap((org) => names.map(([name, language], index) => {
    const role = industryProfiles[org.industry].roles[index % industryProfiles[org.industry].roles.length];
    return {
      id: `${org.id}-worker-${index + 1}`, organisationId: org.id, name, role,
      language, pinHash, active: true,
      payMode: org.industry === "college" && index === 3 ? "hourly" : org.industry === "college" ? "monthly" : "daily",
      hourlyRateRupees: org.industry === "college" ? 125 : 100,
      ...(org.industry === "college" ? { monthlySalaryRupees: 20_000 } : {}),
    };
  }));
  const attendance: AttendanceRecord[] = [];
  const now = new Date("2026-10-27T12:00:00.000Z");
  for (const worker of workers) {
    for (let offset = 1; offset <= 30; offset += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
      if ((date.getUTCDay() === 0 && !worker.id.endsWith("2")) || (worker.id.endsWith("8") && offset % 4 === 0)) continue;
      const workDate = date.toISOString().slice(0, 10);
      const overtime = worker.id.endsWith("1") && offset <= 8 ? 3 : offset % 7 === 0 ? 2 : 0;
      const startHour = worker.id.endsWith("2") && offset === 1 ? "00" : "08";
      const start = new Date(`${workDate}T${startHour}:00:00.000Z`);
      const end = new Date(start.getTime() + (8 + overtime) * 3_600_000);
      attendance.push({
        id: `att-${worker.id}-${workDate}`, organisationId: worker.organisationId, workerId: worker.id,
        workDate, shiftType: worker.organisationId === "org-construction" ? "Day" : "Morning",
        checkIn: start.toISOString(), checkOut: end.toISOString(), breakMinutes: 0, source: "manual",
      });
    }
  }
  const grievances: Grievance[] = organisations.flatMap((org) =>
    Array.from({ length: 10 }, (_, index) => {
      const category = categories[(index + (org.industry === "college" ? 2 : 0)) % categories.length];
      const createdAt = new Date(now.getTime() - index * 3 * 86_400_000).toISOString();
      return {
        id: `${org.id}-grievance-${index + 1}`, organisationId: org.id,
        trackingHash: `demo-hash-${org.id}-${index + 1}`, category,
        text: category === "safety_hazard" ? "Missing helmet and unsafe scaffolding near the work area." : `Please review the ${category.replace("_", " ")} concern.`,
        urgency: index === 0 ? "high" : "medium",
        englishSummary: `Reported concern: ${category.replace("_", " ")}.`,
        englishTranslation: "", keyThemes: [category], triageSource: "rules",
        status: index < 3 ? "submitted" : index < 7 ? "in_review" : "resolved",
        ...(index >= 7 ? { publicReply: "Thank you. The team has reviewed this concern." } : {}),
        createdAt, updatedAt: createdAt,
      };
    }),
  );
  const skills: SkillRecord[] = workers.map((worker, index) => ({
    id: `skill-${worker.id}`, organisationId: worker.organisationId, workerId: worker.id,
    name: industryProfiles[worker.organisationId === "org-construction" ? "construction" : "college"].skills[index % 4],
    issuer: "FairShift Training Centre",
    issuedAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 10)).toISOString().slice(0, 10),
    verified: index % 2 === 0,
  }));
  return { organisations, workers, attendance, grievances, skills };
}

export function getAdminPinHash(): string {
  return adminPinHash;
}
