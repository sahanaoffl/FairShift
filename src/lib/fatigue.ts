import type { AttendanceRecord, FatigueFlag } from "@/src/types";

function completedShift(record: AttendanceRecord): { start: number; end: number; day: string; hours: number } | undefined {
  if (!record.checkOut) return undefined;
  const start = Date.parse(record.checkIn);
  const end = Date.parse(record.checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  const hours = Math.max(0, (end - start) / 3_600_000 - record.breakMinutes / 60);
  return { start, end, day: record.workDate, hours };
}

export function detectFatigue(records: AttendanceRecord[]): Pick<FatigueFlag, "severity" | "reasons"> {
  const shifts = records.map(completedShift).filter((shift): shift is NonNullable<typeof shift> => shift !== undefined)
    .sort((a, b) => a.start - b.start);
  const reasons = new Set<FatigueFlag["reasons"][number]>();
  const latest = shifts.at(-1)?.start ?? Date.now();
  const weekStart = latest - 7 * 24 * 60 * 60 * 1000;
  if (shifts.filter((shift) => shift.start >= weekStart && shift.start <= latest)
    .reduce((hours, shift) => hours + shift.hours, 0) > 60) reasons.add("weekly_hours");

  let consecutive = 0;
  let previousDay: string | undefined;
  for (const shift of shifts) {
    const day = Date.parse(`${shift.day}T00:00:00Z`);
    const previous = previousDay ? Date.parse(`${previousDay}T00:00:00Z`) : NaN;
    consecutive = day - previous === 86_400_000 ? consecutive + 1 : day === previous ? consecutive : 1;
    previousDay = shift.day;
    if (consecutive >= 6) reasons.add("consecutive_days");
  }
  for (let index = 1; index < shifts.length; index += 1) {
    const restHours = (shifts[index].start - shifts[index - 1].end) / 3_600_000;
    if (restHours >= 0 && restHours < 10) reasons.add("short_rest");
  }

  return {
    severity: reasons.has("weekly_hours") || reasons.has("short_rest") ? "high" : "watch",
    reasons: [...reasons],
  };
}
