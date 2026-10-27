"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DemoRole = "worker" | "admin";
type Industry = "construction" | "college";

export function DemoBar({ role, industry, canSwitch = false }: { role?: DemoRole; industry?: Industry; canSwitch?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Industry>(industry ?? "construction");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (process.env.NEXT_PUBLIC_DEMO !== "true") return null;

  async function act(action: "login" | "switch", loginRole: DemoRole, selectedIndustry = selected) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/demo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role: loginRole, industry: selectedIndustry }),
      });
      const result = await response.json() as { error?: string; path?: string };
      if (!response.ok) throw new Error(result.error ?? "Demo action failed.");
      if (action === "login" && result.path) router.push(result.path);
      else window.location.reload();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Demo action failed."); }
    finally { setBusy(false); }
  }

  return <section className="demo-bar" aria-label="Demo controls"><strong>DEMO</strong><label><span className="sr-only">Industry</span><select value={selected} disabled={busy} onChange={(event) => {
    const next = event.target.value as Industry;
    setSelected(next);
    if (role && canSwitch) void act("switch", role, next);
  }}><option value="construction">Construction Site</option><option value="college">College</option></select></label>
    <button className="button button-small button-light" disabled={busy} onClick={() => void act("login", "worker")}>Sample worker</button>
    <button className="button button-small button-dark" disabled={busy} onClick={() => void act("login", "admin")}>Sample admin</button>
    {message && <span role="alert">{message}</span>}
  </section>;
}
