import { describe, expect, it } from "vitest";
import { calculatePay } from "@/src/lib/pay";
import type { AttendanceRecord, PayRules } from "@/src/types";

const rules: PayRules = {
  currency: "INR", payMode: "hourly", hourlyRateRupees: 100,
  regularHoursPerShift: 8, overtimeMultiplier: 1.5,
  deductions: [{ key: "pf", ratePercent: 12 }, { key: "esi", ratePercent: 0.75 }],
};

function record(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "a1", organisationId: "org", workerId: "worker", workDate: "2026-10-01",
    shiftType: "Day", checkIn: "2026-10-01T08:00:00Z", checkOut: "2026-10-01T16:00:00Z",
    breakMinutes: 0, source: "manual", ...overrides,
  };
}

describe("calculatePay", () => {
  it("calculates regular wages", () => expect(calculatePay([record()], rules).gross).toBe(800));
  it("calculates overtime at the configured multiplier", () => {
    const pay = calculatePay([record({ checkOut: "2026-10-01T18:00:00Z" })], rules);
    expect(pay.overtimeHours).toBe(2);
    expect(pay.grossOvertime).toBe(300);
  });
  it("deducts unpaid breaks from hours", () => expect(calculatePay([record({ breakMinutes: 60 })], rules).regularHours).toBe(7));
  it("handles a shift crossing midnight", () => {
    const pay = calculatePay([record({ checkIn: "2026-10-01T22:00:00Z", checkOut: "2026-10-02T08:00:00Z" })], rules);
    expect(pay.regularHours).toBe(8);
    expect(pay.overtimeHours).toBe(2);
  });
  it("flags missing checkout without guessing hours", () => {
    const pay = calculatePay([record({ checkOut: undefined })], rules);
    expect(pay.regularHours).toBe(0);
    expect(pay.needsReviewRecordIds).toEqual(["a1"]);
  });
  it("flags invalid checkout times for review", () => expect(calculatePay([record({ checkOut: "bad" })], rules).needsReviewRecordIds).toEqual(["a1"]));
  it("does not accept negative duration", () => expect(calculatePay([record({ checkOut: "2026-10-01T07:00:00Z" })], rules).needsReviewRecordIds).toEqual(["a1"]));
  it("has no overtime at exactly eight hours", () => expect(calculatePay([record()], rules).overtimeHours).toBe(0));
  it("combines multiple records", () => expect(calculatePay([record(), record({ id: "a2", workDate: "2026-10-02" })], rules).regularHours).toBe(16));
  it("computes configured deductions", () => expect(calculatePay([record()], rules).deductions).toEqual([{ key: "pf", amount: 96 }, { key: "esi", amount: 6 }]));
  it("rounds pay values to paise", () => {
    const pay = calculatePay([record({ checkOut: "2026-10-01T08:01:00Z" })], { ...rules, hourlyRateRupees: 99.99 });
    expect(Number.isInteger(pay.gross * 100)).toBe(true);
  });
  it("applies monthly salary proportionally to hours", () => {
    const pay = calculatePay([record()], { ...rules, payMode: "monthly", monthlySalaryRupees: 20_000, expectedMonthlyHours: 200 });
    expect(pay.grossRegular).toBe(800);
  });
  it("preserves source record references for explanations", () => expect(calculatePay([record()], rules).lines[0].recordIds).toEqual(["a1"]));
  it("handles zero break duration", () => expect(calculatePay([record({ breakMinutes: 0 })], rules).gross).toBe(800));
  it("returns zero pay for no records", () => expect(calculatePay([], rules).net).toBe(0));
});
