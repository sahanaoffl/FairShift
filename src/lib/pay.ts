import type { AttendanceRecord, PayLine, PayRules, Payslip } from "@/src/types";

function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

function rateToPaise(rate: number): number {
  return Math.round(rate * 100);
}

function durationHours(record: AttendanceRecord): number | undefined {
  if (!record.checkOut) return undefined;
  const elapsedMinutes = (Date.parse(record.checkOut) - Date.parse(record.checkIn)) / 60_000;
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) return undefined;
  return Math.max(0, elapsedMinutes - Math.max(0, record.breakMinutes)) / 60;
}

export function calculatePay(records: AttendanceRecord[], rules: PayRules): Payslip {
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let regularPaise = 0;
  let overtimePaise = 0;
  const review = records.filter((record) => durationHours(record) === undefined);
  const workedRecords = records.filter((record) => !review.includes(record));
  const recordHours = new Map<string, number>();
  const regularRatePaise = rules.payMode === "monthly" && rules.monthlySalaryRupees && rules.expectedMonthlyHours
    ? rateToPaise(rules.monthlySalaryRupees) / rules.expectedMonthlyHours
    : rateToPaise(rules.hourlyRateRupees);

  for (const record of workedRecords) {
    const hours = durationHours(record) ?? 0;
    const regular = Math.min(hours, rules.regularHoursPerShift);
    const overtime = Math.max(0, hours - rules.regularHoursPerShift);
    regularMinutes += Math.round(regular * 60);
    overtimeMinutes += Math.round(overtime * 60);
    regularPaise += regularRatePaise * regular;
    overtimePaise += regularRatePaise * overtime * rules.overtimeMultiplier;
    recordHours.set(record.id, hours);
  }

  const grossPaise = Math.round(regularPaise + overtimePaise);
  const deductions = rules.deductions.map(({ key, ratePercent }) => ({
    key,
    amountPaise: Math.round(grossPaise * ratePercent / 100),
  }));
  const totalDeductionsPaise = deductions.reduce((total, item) => total + item.amountPaise, 0);
  const workedIds = workedRecords.map((record) => record.id);
  const overtimeIds = workedRecords
    .filter((record) => (recordHours.get(record.id) ?? 0) > rules.regularHoursPerShift)
    .map((record) => record.id);
  const lines: PayLine[] = [
    { key: "regular_pay", params: { hours: regularMinutes / 60, amount: toRupees(regularPaise) }, recordIds: workedIds },
    { key: "overtime_pay", params: { hours: overtimeMinutes / 60, multiplier: rules.overtimeMultiplier, amount: toRupees(overtimePaise) }, recordIds: overtimeIds },
    ...deductions.map(({ key, amountPaise }) => ({
      key: `deduction_${key}`,
      params: { amount: toRupees(amountPaise) },
      recordIds: workedIds,
    })),
    ...review.map((record) => ({ key: "needs_review", params: {}, recordIds: [record.id] })),
  ];

  return {
    regularHours: Math.round(regularMinutes / 60 * 100) / 100,
    overtimeHours: Math.round(overtimeMinutes / 60 * 100) / 100,
    grossRegular: toRupees(regularPaise),
    grossOvertime: toRupees(overtimePaise),
    gross: toRupees(grossPaise),
    deductions: deductions.map(({ key, amountPaise }) => ({ key, amount: toRupees(amountPaise) })),
    net: toRupees(grossPaise - totalDeductionsPaise),
    lines,
    needsReviewRecordIds: review.map((record) => record.id),
  };
}
