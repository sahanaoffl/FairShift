import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getRepository } from "@/src/lib/repo";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const repo = getRepository();
  const worker = await repo.getWorker(session.sub);
  if (!worker || worker.organisationId !== session.organisationId) return NextResponse.json({ error: "Worker account not found." }, { status: 404 });
  const skills = await repo.listSkills(worker.id);
  return NextResponse.json({ worker: { name: worker.name, role: worker.role }, skills });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "worker") return NextResponse.json({ error: "Worker session required." }, { status: 401 });
  const token = randomBytes(24).toString("base64url");
  await getRepository().savePassport({ token, workerId: session.sub, organisationId: session.organisationId, createdAt: new Date().toISOString() });
  return NextResponse.json({ token });
}
