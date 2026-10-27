import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getRepository } from "@/src/lib/repo";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const entries = await getRepository().listFeedback(session.organisationId);
  if (entries.length < 5) return NextResponse.json({ count: entries.length, protected: true });
  const average = (key: "managerRating" | "policiesRating" | "conditionsRating") =>
    Math.round(entries.reduce((sum, entry) => sum + entry[key], 0) / entries.length * 10) / 10;
  return NextResponse.json({
    count: entries.length, protected: false,
    averages: {
      manager: average("managerRating"), policies: average("policiesRating"), conditions: average("conditionsRating"),
    },
  });
}
