import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getWeeklySummary } from "@/src/lib/summary";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  return NextResponse.json(await getWeeklySummary(session.organisationId));
}
