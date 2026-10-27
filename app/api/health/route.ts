import { NextResponse } from "next/server";
import { getRepository } from "@/src/lib/repo";
import { FirestoreRepo } from "@/src/lib/repo/firestore";

export async function GET() {
  const repository = getRepository();
  const backend = repository instanceof FirestoreRepo ? "firestore" : "memory";
  return NextResponse.json({ status: "ok", repository: backend, timestamp: new Date().toISOString() });
}
