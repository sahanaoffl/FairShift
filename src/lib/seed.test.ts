import { describe, expect, it } from "vitest";
import { detectFatigue } from "@/src/lib/fatigue";
import { createSeedData, demoPins } from "@/src/lib/seed";
import { MemoryRepo } from "@/src/lib/repo/memory";

describe("FairShift demo seed", () => {
  it("creates two organizations with eight workers each", () => {
    const seed = createSeedData();
    expect(seed.organisations).toHaveLength(2);
    expect(seed.workers.filter((worker) => worker.organisationId === "org-construction")).toHaveLength(8);
    expect(seed.workers.filter((worker) => worker.organisationId === "org-college")).toHaveLength(8);
  });
  it("creates a month of attendance, skills and ten grievances per industry", () => {
    const seed = createSeedData();
    expect(seed.attendance.length).toBeGreaterThan(300);
    expect(seed.skills).toHaveLength(16);
    expect(seed.grievances.filter((item) => item.organisationId === "org-construction")).toHaveLength(10);
    expect(seed.grievances.filter((item) => item.organisationId === "org-college")).toHaveLength(10);
  });
  it("includes fixed demo PINs and language variation", () => {
    const seed = createSeedData();
    expect(demoPins).toEqual({ worker: "1234", admin: "2468" });
    expect(seed.workers.map((worker) => worker.language)).toEqual(expect.arrayContaining(["en", "ta", "hi"]));
  });
  it("includes deterministic hours and at least two fatigue cases", () => {
    const first = createSeedData();
    const second = createSeedData();
    expect(first.attendance).toEqual(second.attendance);
    const flags = ["org-construction-worker-1", "org-construction-worker-2"].map((workerId) =>
      detectFatigue(first.attendance.filter((record) => record.workerId === workerId)),
    );
    expect(flags[0].reasons).toContain("weekly_hours");
    expect(flags[1].reasons).toContain("short_rest");
  });
  it("keeps repository reads scoped to the requested worker and organization", async () => {
    const repository = new MemoryRepo(createSeedData());
    const own = await repository.listAttendance("org-construction-worker-1");
    const other = await repository.listAttendance("org-college-worker-1");
    expect(own.every((record) => record.workerId === "org-construction-worker-1")).toBe(true);
    expect(other.every((record) => record.organisationId === "org-college")).toBe(true);
  });
});
