import { Suspense } from "react";
import { PublicPassport } from "@/src/components/PublicPassport";

export default function PublicPassportPage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<main className="public-passport"><p>Loading passport…</p></main>}><PassportPage params={params} /></Suspense>;
}

async function PassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicPassport token={token} />;
}
