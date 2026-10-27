import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { createCheckInToken } from "@/src/lib/qr";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  const token = await createCheckInToken(session.organisationId);
  return NextResponse.json({ token, expiresAt: Date.now() + 60_000 });
}
