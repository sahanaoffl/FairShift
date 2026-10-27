"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PublicPassportData {
  worker: { name: string; role: string };
  skills: { id: string; name: string; issuer: string; issuedAt: string; verified: boolean }[];
}

export function PublicPassport({ token }: { token: string }) {
  const [data, setData] = useState<PublicPassportData>();
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/passport/${encodeURIComponent(token)}`).then(async (response) => {
      const result = await response.json() as PublicPassportData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Passport not found.");
      setData(result);
    }).catch((reason: Error) => setError(reason.message));
  }, [token]);

  return <main className="public-passport"><Link className="brand" href="/">Fair<span>Shift</span></Link>
    {error ? <p role="alert">{error}</p> : data ? <section className="passport-paper">
      <p className="eyebrow">PORTABLE SKILL PASSPORT</p><h1>{data.worker.name}</h1><p>{data.worker.role}</p>
      <h2>Skills and certifications</h2>{data.skills.map((skill) => <article className="skill-item" key={skill.id}><span>✦</span><div><strong>{skill.name} {skill.verified && <span className="verified">✓ Verified</span>}</strong><small>{skill.issuer} · {new Date(skill.issuedAt).toLocaleDateString()}</small></div></article>)}
      <button className="button button-primary print-hide" onClick={() => window.print()}>Print passport</button>
    </section> : <p>Loading passport…</p>}
  </main>;
}
