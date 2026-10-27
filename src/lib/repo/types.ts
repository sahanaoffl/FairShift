import type {
  AttendanceRecord, FeedbackEntry, Grievance, Organisation, PassportShare, SkillRecord, Worker,
} from "@/src/types";

export interface Repository {
  listOrganisations(): Promise<Organisation[]>;
  getOrganisation(id: string): Promise<Organisation | undefined>;
  saveOrganisation(organisation: Organisation): Promise<void>;
  listWorkers(organisationId: string): Promise<Worker[]>;
  getWorker(workerId: string): Promise<Worker | undefined>;
  saveWorker(worker: Worker): Promise<void>;
  listAttendance(workerId: string, from?: string, to?: string): Promise<AttendanceRecord[]>;
  listOrganisationAttendance(organisationId: string, from?: string, to?: string): Promise<AttendanceRecord[]>;
  saveAttendance(record: AttendanceRecord): Promise<void>;
  listGrievances(organisationId: string): Promise<Grievance[]>;
  getGrievanceByTrackingHash(hash: string): Promise<Grievance | undefined>;
  saveGrievance(grievance: Grievance): Promise<void>;
  listSkills(workerId: string): Promise<SkillRecord[]>;
  saveSkill(skill: SkillRecord): Promise<void>;
  getPassport(token: string): Promise<{ worker: Worker; skills: SkillRecord[] } | undefined>;
  savePassport(share: PassportShare): Promise<void>;
  listFeedback(organisationId: string): Promise<FeedbackEntry[]>;
  saveFeedback(entry: FeedbackEntry): Promise<void>;
  getCachedSummary(key: string): Promise<unknown | undefined>;
  cacheSummary(key: string, summary: unknown): Promise<void>;
}
