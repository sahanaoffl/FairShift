import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/src/lib/repo";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return NextResponse.json({ error: "Passport not found." }, { status: 404 });
  const passport = await getRepository().getPassport(token);
  if (!passport) return NextResponse.json({ error: "Passport not found." }, { status: 404 });
  return NextResponse.json({ worker: { name: passport.worker.name, role: passport.worker.role }, skills: passport.skills });
}
