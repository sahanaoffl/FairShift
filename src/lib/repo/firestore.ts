import { Firestore } from "@google-cloud/firestore";
import type { Repository } from "@/src/lib/repo/types";
import type {
  AttendanceRecord, FeedbackEntry, Grievance, Organisation, PassportShare, SkillRecord, Worker,
} from "@/src/types";

export class FirestoreRepo implements Repository {
  private readonly db: Firestore;

  constructor(projectId: string) {
    this.db = new Firestore({ projectId });
  }

  private async list<T extends { id: string }>(collection: string, predicate: (value: T) => boolean): Promise<T[]> {
    const snapshot = await this.db.collection(collection).get();
    return snapshot.docs.map((document) => document.data() as T).filter(predicate);
  }

  private async get<T>(collection: string, id: string): Promise<T | undefined> {
    const document = await this.db.collection(collection).doc(id).get();
    return document.exists ? document.data() as T : undefined;
  }

  private async save<T extends { id: string }>(collection: string, value: T): Promise<void> {
    await this.db.collection(collection).doc(value.id).set(value);
  }

  listOrganisations(): Promise<Organisation[]> { return this.list("organisations", () => true); }
  getOrganisation(id: string): Promise<Organisation | undefined> { return this.get("organisations", id); }
  saveOrganisation(value: Organisation): Promise<void> { return this.save("organisations", value); }
  listWorkers(orgId: string): Promise<Worker[]> { return this.list("workers", (item: Worker) => item.organisationId === orgId); }
  getWorker(id: string): Promise<Worker | undefined> { return this.get("workers", id); }
  saveWorker(value: Worker): Promise<void> { return this.save("workers", value); }
  listAttendance(workerId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    return this.list("attendance", (item: AttendanceRecord) => item.workerId === workerId && (!from || item.workDate >= from) && (!to || item.workDate <= to));
  }
  listOrganisationAttendance(orgId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    return this.list("attendance", (item: AttendanceRecord) => item.organisationId === orgId && (!from || item.workDate >= from) && (!to || item.workDate <= to));
  }
  saveAttendance(value: AttendanceRecord): Promise<void> { return this.save("attendance", value); }
  listGrievances(orgId: string): Promise<Grievance[]> { return this.list("grievances", (item: Grievance) => item.organisationId === orgId); }
  async getGrievanceByTrackingHash(hash: string): Promise<Grievance | undefined> {
    return (await this.list("grievances", (item: Grievance) => item.trackingHash === hash))[0];
  }
  saveGrievance(value: Grievance): Promise<void> { return this.save("grievances", value); }
  listSkills(workerId: string): Promise<SkillRecord[]> { return this.list("skills", (item: SkillRecord) => item.workerId === workerId); }
  saveSkill(value: SkillRecord): Promise<void> { return this.save("skills", value); }
  async getPassport(token: string): Promise<{ worker: Worker; skills: SkillRecord[] } | undefined> {
    const share = await this.get<PassportShare>("passports", token);
    const worker = share ? await this.getWorker(share.workerId) : undefined;
    return worker ? { worker, skills: await this.listSkills(worker.id) } : undefined;
  }
  savePassport(value: PassportShare): Promise<void> { return this.save("passports", { ...value, id: value.token }); }
  listFeedback(orgId: string): Promise<FeedbackEntry[]> { return this.list("feedback", (item: FeedbackEntry) => item.organisationId === orgId); }
  saveFeedback(value: FeedbackEntry): Promise<void> { return this.save("feedback", value); }
  getCachedSummary(key: string): Promise<unknown | undefined> { return this.get<{ id: string; value: unknown }>("ai-cache", key).then((entry) => entry?.value); }
  cacheSummary(key: string, summary: unknown): Promise<void> { return this.save("ai-cache", { id: key, value: summary }); }
}
