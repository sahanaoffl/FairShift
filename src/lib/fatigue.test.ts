import { describe, expect, it } from "vitest";
import { detectFatigue } from "@/src/lib/fatigue";
import type { AttendanceRecord } from "@/src/types";

function shifts(hours: number[], startDate = "2026-10-01"): AttendanceRecord[] {
  return hours.map((length, index) => {
    const date = new Date(Date.parse(`${startDate}T00:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
    return {
      id: `${index}`, organisationId: "org", workerId: "worker", workDate: date, shiftType: "Day",
      checkIn: `${date}T08:00:00Z`, checkOut: new Date(Date.parse(`${date}T08:00:00Z`) + length * 3_600_000).toISOString(),
      breakMinutes: 0, source: "manual",
    };
  });
}

describe("detectFatigue", () => {
  it("returns watch when no fatigue thresholds are met", () => expect(detectFatigue(shifts([8, 8])).severity).toBe("watch"));
  it("flags more than 60 hours in a rolling week", () => {
    const result = detectFatigue(shifts([10, 10, 10, 10, 10, 10, 2]));
    expect(result.reasons).toContain("weekly_hours");
  });
  it("does not flag exactly 60 weekly hours", () => expect(detectFatigue(shifts([10, 10, 10, 10, 10, 10])).reasons).not.toContain("weekly_hours"));
  it("flags six consecutive work days", () => expect(detectFatigue(shifts([8, 8, 8, 8, 8, 8])).reasons).toContain("consecutive_days"));
  it("does not flag five consecutive work days", () => expect(detectFatigue(shifts([8, 8, 8, 8, 8])).reasons).not.toContain("consecutive_days"));
  it("flags less than ten hours between shifts as high severity", () => {
    const records = shifts([8, 8]);
    records[1].checkIn = "2026-10-02T01:00:00Z";
    records[1].checkOut = "2026-10-02T09:00:00Z";
    expect(detectFatigue(records)).toMatchObject({ severity: "high", reasons: ["short_rest"] });
  });
  it("does not count missing checkout records", () => expect(detectFatigue([{ ...shifts([12])[0], checkOut: undefined }]).reasons).toEqual([]));
});
