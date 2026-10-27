export type Language = "en" | "ta" | "hi";
export type Role = string;
export type ShiftType = string;

export interface Organisation {
  id: string;
  name: string;
  industry: "construction" | "college";
  payRules: PayRules;
}

export interface Worker {
  id: string;
  organisationId: string;
  name: string;
  role: Role;
  language: Language;
  pinHash: string;
  payMode: "daily" | "hourly" | "monthly";
  hourlyRateRupees: number;
  monthlySalaryRupees?: number;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  organisationId: string;
  workerId: string;
  workDate: string;
  shiftType: ShiftType;
  checkIn: string;
  checkOut?: string;
  breakMinutes: number;
  source: "qr" | "manual";
}

export interface PayRules {
  currency: "INR";
  payMode: "daily" | "hourly" | "monthly";
  hourlyRateRupees: number;
  monthlySalaryRupees?: number;
  expectedMonthlyHours?: number;
  regularHoursPerShift: number;
  overtimeMultiplier: number;
  deductions: { key: string; ratePercent: number }[];
}

export interface PayLine {
  key: string;
  params: Record<string, string | number>;
  recordIds: string[];
}

export interface Payslip {
  regularHours: number;
  overtimeHours: number;
  grossRegular: number;
  grossOvertime: number;
  gross: number;
  deductions: { key: string; amount: number }[];
  net: number;
  lines: PayLine[];
  needsReviewRecordIds: string[];
}

export type GrievanceStatus = "submitted" | "in_review" | "resolved";
export type Urgency = "low" | "medium" | "high" | "critical";

export interface Grievance {
  id: string;
  organisationId: string;
  trackingHash: string;
  category: string;
  text: string;
  urgency: Urgency;
  englishSummary: string;
  englishTranslation: string;
  keyThemes: string[];
  triageSource: "ai" | "rules";
  attachmentDataUrl?: string;
  status: GrievanceStatus;
  publicReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  organisationId: string;
  managerRating: number;
  policiesRating: number;
  conditionsRating: number;
  text?: string;
  createdAt: string;
}

export interface SkillRecord {
  id: string;
  organisationId: string;
  workerId: string;
  name: string;
  issuer: string;
  issuedAt: string;
  verified: boolean;
}

export interface FatigueFlag {
  workerId: string;
  severity: "watch" | "high";
  reasons: ("weekly_hours" | "consecutive_days" | "short_rest")[];
}

export interface PassportShare {
  token: string;
  workerId: string;
  organisationId: string;
  createdAt: string;
}
