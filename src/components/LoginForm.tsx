"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoBar } from "@/src/components/DemoBar";

interface OrganisationOption { id: string; name: string; industry: string }
interface WorkerOption { id: string; name: string; role: string; language: string }
interface DemoData {
  organisations: OrganisationOption[];
  workers: { organisationId: string; workers: WorkerOption[] }[];
}

export function LoginForm({ role }: { role: "worker" | "admin" }) {
  const router = useRouter();
  const [data, setData] = useState<DemoData>();
  const [organisationId, setOrganisationId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/demo").then(async (response) => {
      if (!response.ok) throw new Error("Could not load demo accounts.");
      const result = await response.json() as DemoData;
      setData(result);
      setOrganisationId(result.organisations[0]?.id ?? "");
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  const workers = data?.workers.find((item) => item.organisationId === organisationId)?.workers ?? [];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, organisationId, pin, ...(role === "worker" ? { workerId } : {}) }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign in failed.");
      router.push(role === "worker" ? "/worker" : "/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <a className="skip-link" href="#login-form">Skip to sign in</a>
      <div className="login-card">
        <DemoBar role={role} />
        <Link className="brand" href="/">Fair<span>Shift</span></Link>
        <p className="eyebrow">FAIR WORK STARTS HERE</p>
        <h1>{role === "worker" ? "Welcome back" : "Admin sign in"}</h1>
        <p className="muted">{role === "worker" ? "Your work, pay and voice — all in one place." : "Review workforce wellbeing and workplace reports."}</p>
        <form id="login-form" onSubmit={submit} className="form-stack">
          <label>Workplace
            <select value={organisationId} onChange={(event) => { setOrganisationId(event.target.value); setWorkerId(""); }} required>
              {data?.organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}
            </select>
          </label>
          {role === "worker" && <label>Your name
            <select value={workerId} onChange={(event) => setWorkerId(event.target.value)} required>
              <option value="">Choose your name</option>
              {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.role}</option>)}
            </select>
          </label>}
          <label>{role === "worker" ? "4-digit PIN" : "Admin PIN"}
            <input inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} required />
          </label>
          <p className="helper-text">Demo PIN: {role === "worker" ? "1234" : "2468"}</p>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="button button-primary" disabled={busy || !data}>{busy ? "Signing in…" : "Continue"}</button>
        </form>
        <Link className="text-link" href={role === "worker" ? "/admin/login" : "/worker/login"}>
          {role === "worker" ? "Administrator? Sign in here" : "Worker? Sign in here"}
        </Link>
      </div>
    </main>
  );
}
