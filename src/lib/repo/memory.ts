import { createSeedData } from "@/src/lib/seed";
import type { Repository } from "@/src/lib/repo/types";
import type {
  AttendanceRecord, FeedbackEntry, Grievance, Organisation, PassportShare, SkillRecord, Worker,
} from "@/src/types";

export class MemoryRepo implements Repository {
  private readonly organisations = new Map<string, Organisation>();
  private readonly workers = new Map<string, Worker>();
  private readonly attendance = new Map<string, AttendanceRecord>();
  private readonly grievances = new Map<string, Grievance>();
  private readonly skills = new Map<string, SkillRecord>();
  private readonly passports = new Map<string, PassportShare>();
  private readonly feedback = new Map<string, FeedbackEntry>();
  private readonly summaries = new Map<string, unknown>();

  constructor(seed = createSeedData()) {
    seed.organisations.forEach((value) => this.organisations.set(value.id, value));
    seed.workers.forEach((value) => this.workers.set(value.id, value));
    seed.attendance.forEach((value) => this.attendance.set(value.id, value));
    seed.grievances.forEach((value) => this.grievances.set(value.id, value));
    seed.skills.forEach((value) => this.skills.set(value.id, value));
  }

  async listOrganisations(): Promise<Organisation[]> { return [...this.organisations.values()]; }
  async getOrganisation(id: string): Promise<Organisation | undefined> { return this.organisations.get(id); }
  async saveOrganisation(value: Organisation): Promise<void> { this.organisations.set(value.id, value); }
  async listWorkers(orgId: string): Promise<Worker[]> { return [...this.workers.values()].filter((item) => item.organisationId === orgId); }
  async getWorker(id: string): Promise<Worker | undefined> { return this.workers.get(id); }
  async saveWorker(value: Worker): Promise<void> { this.workers.set(value.id, value); }

  async listAttendance(workerId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    return [...this.attendance.values()].filter((item) => item.workerId === workerId && (!from || item.workDate >= from) && (!to || item.workDate <= to));
  }

  async listOrganisationAttendance(orgId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    return [...this.attendance.values()].filter((item) => item.organisationId === orgId && (!from || item.workDate >= from) && (!to || item.workDate <= to));
  }

  async saveAttendance(value: AttendanceRecord): Promise<void> { this.attendance.set(value.id, value); }
  async listGrievances(orgId: string): Promise<Grievance[]> { return [...this.grievances.values()].filter((item) => item.organisationId === orgId); }
  async getGrievanceByTrackingHash(hash: string): Promise<Grievance | undefined> {
    return [...this.grievances.values()].find((item) => item.trackingHash === hash);
  }
  async saveGrievance(value: Grievance): Promise<void> { this.grievances.set(value.id, value); }
  async listSkills(workerId: string): Promise<SkillRecord[]> { return [...this.skills.values()].filter((item) => item.workerId === workerId); }
  async saveSkill(value: SkillRecord): Promise<void> { this.skills.set(value.id, value); }

  async getPassport(token: string): Promise<{ worker: Worker; skills: SkillRecord[] } | undefined> {
    const share = this.passports.get(token);
    const worker = share ? this.workers.get(share.workerId) : undefined;
    return worker ? { worker, skills: await this.listSkills(worker.id) } : undefined;
  }

  async savePassport(value: PassportShare): Promise<void> { this.passports.set(value.token, value); }
  async listFeedback(orgId: string): Promise<FeedbackEntry[]> { return [...this.feedback.values()].filter((item) => item.organisationId === orgId); }
  async saveFeedback(value: FeedbackEntry): Promise<void> { this.feedback.set(value.id, value); }
  async getCachedSummary(key: string): Promise<unknown | undefined> { return this.summaries.get(key); }
  async cacheSummary(key: string, summary: unknown): Promise<void> { this.summaries.set(key, summary); }
}
