"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { DemoBar } from "@/src/components/DemoBar";
import { calculatePay } from "@/src/lib/pay";
import type { PayRules, Payslip, SkillRecord, Urgency } from "@/src/types";

const DashboardCharts = dynamic(() => import("@/src/components/DashboardCharts"), {
  ssr: false,
  loading: () => <div className="chart-card muted">Loading charts…</div>,
});

type AdminView = "dashboard" | "reports" | "workforce" | "qr" | "payroll" | "feedback";
interface DashboardData {
  organisation: { id: string; name: string; industry: "construction" | "college"; payRules: PayRules };
  todayAttendance: number; openReports: number; urgentReports: number; fatigueCount: number;
  fatigue: { name: string; role: string; severity: string; reasons: string[] }[];
  trend: { date: string; attendance: number }[];
  categories: { category: string; reports: number }[];
  overtimeByTeam: { role: string; hours: number }[];
  retentionRisk: { workerId: string; name: string; role: string; score: number; reasons: string[] }[];
}
interface Report {
  id: string; category: string; urgency: Urgency; summary: string; translation: string;
  status: "submitted" | "in_review" | "resolved"; publicReply?: string;
  trackingPrefix: string; ageDays: number; createdAt: string; triageSource: string; attachmentDataUrl?: string;
}
interface Worker {
  id: string; name: string; role: string; payMode: "daily" | "hourly" | "monthly";
  attendanceDays: number; fatigue: { severity: string; reasons: string[] }; skills: SkillRecord[];
  hourlyRateRupees: number; monthlySalaryRupees?: number;
  attendance: { id: string; workDate: string; checkIn: string; checkOut?: string; shiftType: string }[];
}
interface PayrollItem { worker: Worker; records: { id: string; workDate: string; checkIn: string; checkOut?: string; breakMinutes: number; shiftType: string }[]; payslip: Payslip }
interface PayrollData { organisation: DashboardData["organisation"]; month: string; payroll: PayrollItem[] }
interface FeedbackData { count: number; protected: boolean; averages?: { manager: number; policies: number; conditions: number } }

const nav: { href: string; label: string; view: AdminView; icon: string }[] = [
  { href: "/admin", label: "Overview", view: "dashboard", icon: "⌂" },
  { href: "/admin/reports", label: "Reports", view: "reports", icon: "◉" },
  { href: "/admin/workforce", label: "Workforce", view: "workforce", icon: "♙" },
  { href: "/admin/checkin-qr", label: "Check-in QR", view: "qr", icon: "▦" },
  { href: "/admin/payroll", label: "Payroll", view: "payroll", icon: "₹" },
  { href: "/admin/feedback", label: "Feedback", view: "feedback", icon: "♡" },
];

export function AdminWorkspace({ view }: { view: AdminView }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData>();
  const [reports, setReports] = useState<Report[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payroll, setPayroll] = useState<PayrollData>();
  const [feedback, setFeedback] = useState<FeedbackData>();
  const [qr, setQr] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState(1.5);
  const [deductions, setDeductions] = useState<PayRules["deductions"]>([]);
  const [month, setMonth] = useState("");
  const [industry, setIndustry] = useState<"construction" | "college">("construction");
  const [skillForm, setSkillForm] = useState({ workerId: "", name: "", issuer: "FairShift Training Centre", issuedAt: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => setMonth(new Date().toISOString().slice(0, 7)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (view === "dashboard") {
        const response = await fetch("/api/admin/dashboard");
        const result = await response.json() as DashboardData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load dashboard.");
        setDashboard(result); setIndustry(result.organisation.industry);
      } else if (view === "reports") {
        const response = await fetch("/api/admin/reports");
        const result = await response.json() as Report[] | { error?: string };
        if (!response.ok || !Array.isArray(result)) throw new Error(Array.isArray(result) ? "Could not load reports." : result.error ?? "Could not load reports.");
        setReports(result);
      } else if (view === "workforce") {
        const response = await fetch("/api/admin/workforce");
        const result = await response.json() as { workers: Worker[]; organisation: DashboardData["organisation"]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load workforce.");
        setWorkers(result.workers); setIndustry(result.organisation.industry);
        setSkillForm((current) => ({ ...current, workerId: current.workerId || result.workers[0]?.id || "" }));
      } else if (view === "payroll") {
        if (!month) return;
        const response = await fetch(`/api/admin/payroll?month=${month}`);
        const result = await response.json() as PayrollData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load payroll.");
        setPayroll(result); setMultiplier(result.organisation.payRules.overtimeMultiplier); setDeductions(result.organisation.payRules.deductions);
      } else if (view === "feedback") {
        const response = await fetch("/api/admin/feedback");
        const result = await response.json() as FeedbackData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load feedback.");
        setFeedback(result);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load this page."); }
    finally { setLoading(false); }
  }, [month, view]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  useEffect(() => {
    if (view !== "qr") return;
    let active = true;
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/admin/checkin-qr");
        const result = await response.json() as { token?: string; error?: string };
        if (!response.ok || !result.token) throw new Error(result.error ?? "Could not create a QR code.");
        const image = await QRCode.toDataURL(result.token, { width: 280, margin: 2, color: { dark: "#123d32", light: "#ffffff" } });
        if (active) { setQr(result.token); setQrImage(image); setSecondsLeft(60); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Could not create a QR code."); }
    };
    void fetchToken();
    const timer = setInterval(() => setSecondsLeft((seconds) => {
      if (seconds <= 1) { void fetchToken(); return 60; }
      return seconds - 1;
    }), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [view]);

  async function updateReport(report: Report, status: Report["status"], publicReply: string) {
    try {
      const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, status, publicReply }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update report.");
      setNotice("Report status and reply saved."); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update report."); }
  }

  async function savePayrollRules() {
    if (!payroll) return;
    try {
      const response = await fetch("/api/admin/payroll", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overtimeMultiplier: multiplier, deductions }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save pay rules.");
      setNotice("Pay rules saved."); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save pay rules."); }
  }

  async function saveSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/workforce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", ...skillForm }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not add skill.");
      setNotice("Skill added and verified."); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add skill."); }
  }

  async function verifySkill(skillId: string) {
    try {
      const response = await fetch("/api/admin/workforce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", skillId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not verify skill.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not verify skill."); }
  }

  function exportCsv() {
    if (!payroll) return;
    const rows = [["Worker", "Role", "Month", "Regular hours", "Overtime hours", "Gross INR", "Deductions INR", "Net INR"]];
    for (const item of payroll.payroll) {
      const computed = computeItem(item, payroll.organisation.payRules, multiplier, deductions);
      rows.push([item.worker.name, item.worker.role, payroll.month, String(computed.regularHours), String(computed.overtimeHours), computed.gross.toFixed(2), (computed.gross - computed.net).toFixed(2), computed.net.toFixed(2)]);
    }
    const csv = rows.map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `fairshift-payroll-${payroll.month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const profileSkills = industry === "construction" ? ["Scaffolding", "Electrical", "Working at Height", "First Aid"] : ["Fire Safety", "First Aid", "Lab Safety", "Computer Basics"];
  const title = nav.find((item) => item.view === view)?.label ?? "Overview";

  return <main className="admin-shell"><a className="skip-link" href="#admin-content">Skip to main content</a>
    <header className="topbar"><Link className="brand" href="/">Fair<span>Shift</span><small className="admin-tag">ADMIN</small></Link><div className="topbar-actions"><strong className="muted">{dashboard?.organisation.name ?? payroll?.organisation.name ?? "Workplace dashboard"}</strong><button className="button button-small button-quiet" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); }}>Sign out</button></div></header>
    {(dashboard || payroll) && <DemoBar role="admin" industry={dashboard?.organisation.industry ?? payroll?.organisation.industry} canSwitch />}
    <div className="app-layout admin-layout"><aside className="side-nav" aria-label="Admin navigation"><div className="profile-chip"><span className="avatar">A</span><div><strong>Administrator</strong><small>Workplace overview</small></div></div><nav>{nav.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}><span>{item.icon}</span> {item.label}</Link>)}</nav></aside>
      <section id="admin-content" className="workspace"><div className="workspace-heading"><div><p className="eyebrow">{dashboard?.organisation.name ?? payroll?.organisation.name ?? "FAIRSHIFT"}</p><h1>{title}</h1></div></div>
        {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
        {loading && <p className="muted">Loading current workplace data…</p>}
        {view === "dashboard" && dashboard && <><div className="admin-stat-grid">
          <Stat label="Today's attendance" value={dashboard.todayAttendance} note="Checked in today" />
          <Stat label="Open reports" value={dashboard.openReports} note="Need follow-up" />
          <Stat label="Urgent reports" value={dashboard.urgentReports} note="High or critical" warning />
          <Stat label="Fatigue flags" value={dashboard.fatigueCount} note="Review shift patterns" warning={dashboard.fatigueCount > 0} />
        </div><DashboardCharts trend={dashboard.trend} categories={dashboard.categories} overtimeByTeam={dashboard.overtimeByTeam} />
          <section className="admin-panel"><div className="section-title"><div><p className="eyebrow">TRANSPARENT SIGNALS</p><h2>Retention risk</h2></div><span className="muted">Explainable indicators, not a decision</span></div>
            <p className="helper-text">Unresolved reports are included only as organisation-wide context and are never linked to a worker.</p>
            {dashboard.retentionRisk.length ? dashboard.retentionRisk.map((item) => <article className="risk-row" key={item.workerId}><div><strong>{item.name}</strong><small>{item.role}</small><p>{item.reasons.join(" · ")}</p></div><span className={`risk-score ${item.score >= 50 ? "risk-high" : ""}`}>{item.score}<small>/100</small></span></article>) : <p className="muted">No current risk signals.</p>}
          </section>
          <section className="admin-panel"><div className="section-title"><div><p className="eyebrow">AI-ASSISTED · ANONYMISED</p><h2>AI weekly summary</h2></div><Link className="text-link" href="/admin/reports">Review reports</Link></div><SummaryCard /></section>
          {dashboard.fatigue.length > 0 && <section className="admin-panel"><h2>Fatigue signals</h2>{dashboard.fatigue.map((item, index) => <p key={`${item.name}-${index}`}><strong>{item.name}</strong> · {item.role}: {item.reasons.join(", ").replaceAll("_", " ")}</p>)}</section>}
        </>}
        {view === "reports" && <div className="admin-panel"><div className="section-title"><div><p className="eyebrow">ANONYMOUS REPORTS</p><h2>Follow up fairly</h2></div><span className="muted">{reports.length} reports</span></div><p className="privacy-callout">Reporter identity is never collected or shown. The short hash prefix is only for tracking references.</p>
          {reports.map((report) => <ReportCard key={report.id} report={report} onSave={updateReport} />)}</div>}
        {view === "workforce" && <><div className="admin-panel"><h2>Workforce roster</h2><div className="table-scroll"><table><thead><tr><th>Worker</th><th>Role</th><th>Attendance days</th><th>Fatigue</th></tr></thead><tbody>{workers.map((worker) => <tr key={worker.id}><td>{worker.name}</td><td>{worker.role}</td><td><details><summary>{worker.attendanceDays} records</summary><ul className="attendance-history">{worker.attendance.map((record) => <li key={record.id}>{record.workDate} · {record.shiftType} · {new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{record.checkOut ? ` – ${new Date(record.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · Needs review"}</li>)}</ul></details></td><td>{worker.fatigue.reasons.length ? <span className="badge badge-warn">{worker.fatigue.severity}: {worker.fatigue.reasons.join(", ").replaceAll("_", " ")}</span> : <span className="badge">No flag</span>}</td></tr>)}</tbody></table></div></div>
          <div className="admin-panel"><h2>Skills and certifications</h2><form className="skill-form" onSubmit={saveSkill}><label>Worker<select value={skillForm.workerId} onChange={(event) => setSkillForm({ ...skillForm, workerId: event.target.value })}>{workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name}</option>)}</select></label><label>Skill<select value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.target.value })}><option value="">Choose a skill</option>{profileSkills.map((skill) => <option key={skill}>{skill}</option>)}</select></label><label>Issuer<input value={skillForm.issuer} onChange={(event) => setSkillForm({ ...skillForm, issuer: event.target.value })} required /></label><label>Issued on<input type="date" value={skillForm.issuedAt} onChange={(event) => setSkillForm({ ...skillForm, issuedAt: event.target.value })} required /></label><button className="button button-primary">Add verified skill</button></form>
            {workers.flatMap((worker) => worker.skills.map((skill) => <div className="skill-row" key={skill.id}><span>{worker.name} · <strong>{skill.name}</strong> · {skill.issuer} · {skill.verified ? "Verified" : "Unverified"}</span>{!skill.verified && <button className="button button-small button-secondary" onClick={() => verifySkill(skill.id)}>Verify</button>}</div>))}</div></>}
        {view === "qr" && <div className="qr-admin-card"><p className="eyebrow">ROTATING CHECK-IN CODE</p><h2>Scan to start a shift</h2>{qrImage ? <Image src={qrImage} alt="Rotating workplace check-in QR code" width={280} height={280} unoptimized /> : <p>Creating a secure code…</p>}<p className="countdown">{secondsLeft}s <span>until code refreshes</span></p><p className="muted">This signed code expires after 60 seconds and only works for this workplace.</p>{qr && <details><summary>Manual verification token</summary><code className="qr-token">{qr}</code></details>}</div>}
        {view === "payroll" && payroll && <><section className="admin-panel"><div className="section-title"><div><p className="eyebrow">CONFIGURE PAY RULES</p><h2>Payroll preview</h2></div><button className="button button-secondary" onClick={exportCsv}>Export CSV</button></div><div className="pay-settings"><label>Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label>Overtime multiplier<input type="number" min="1" max="3" step=".05" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} /></label>{deductions.map((item, index) => <label key={item.key}>{item.key.toUpperCase()} deduction %<input type="number" min="0" max="30" step=".05" value={item.ratePercent} onChange={(event) => setDeductions((current) => current.map((deduction, position) => position === index ? { ...deduction, ratePercent: Number(event.target.value) } : deduction))} /></label>)}<button className="button button-primary" onClick={savePayrollRules}>Save pay rules</button></div></section><div className="admin-panel payroll-list"><h2>Worker payslips · {payroll.month}</h2>{payroll.payroll.map((item) => { const result = computeItem(item, payroll.organisation.payRules, multiplier, deductions); return <article className="payroll-row" key={item.worker.id}><div><strong>{item.worker.name}</strong><small>{item.worker.role} · {result.regularHours} regular h · {result.overtimeHours} overtime h</small></div><div><strong>₹{result.net.toFixed(2)}</strong><small>Gross ₹{result.gross.toFixed(2)}</small></div></article>; })}</div></>}
        {view === "feedback" && <div className="admin-panel"><p className="eyebrow">ANONYMOUS FEEDBACK</p><h2>How the team feels</h2>{feedback?.protected ? <div className="notice-card"><strong>Breakdown protected</strong><p>Only {feedback.count} feedback {feedback.count === 1 ? "entry is" : "entries are"} available. A group of at least five is required before showing ratings.</p></div> : feedback?.averages && <><p className="muted">Based on {feedback.count} anonymous responses. Individual entries are not available.</p><div className="feedback-grid"><Score label="Manager fairness" value={feedback.averages.manager} /><Score label="Policy fairness" value={feedback.averages.policies} /><Score label="Work conditions" value={feedback.averages.conditions} /></div></>}</div>}
      </section>
    </div><footer className="footer-note">FairShift · Workplace data is limited to your organisation.</footer></main>;
}

function computeItem(item: PayrollItem, rules: PayRules, multiplier: number, deductions: PayRules["deductions"]) {
  return calculatePay(item.records.map((record) => ({ ...record, organisationId: "", workerId: "", source: "manual" as const })), {
    ...rules, payMode: item.worker.payMode, hourlyRateRupees: item.worker.hourlyRateRupees,
    monthlySalaryRupees: item.worker.monthlySalaryRupees, overtimeMultiplier: multiplier, deductions,
  });
}

function Stat({ label, value, note, warning = false }: { label: string; value: number; note: string; warning?: boolean }) {
  return <article className={`admin-stat ${warning ? "stat-warning" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ReportCard({ report, onSave }: { report: Report; onSave: (report: Report, status: Report["status"], reply: string) => Promise<void> }) {
  const [status, setStatus] = useState(report.status);
  const [reply, setReply] = useState(report.publicReply ?? "");
  const ageDays = report.ageDays;
  return <article className="report-card"><div className="report-card-head"><div><span className={`badge ${report.urgency === "critical" || report.urgency === "high" ? "badge-warn" : ""}`}>{report.urgency}</span><strong>{report.category.replaceAll("_", " ")}</strong></div><small>{ageDays} days · code {report.trackingPrefix}</small></div><p>{report.summary}</p>{report.translation && report.translation !== report.summary && <details><summary>Original report text</summary><p>{report.translation}</p></details>}{report.attachmentDataUrl && <a href={report.attachmentDataUrl} target="_blank" rel="noreferrer">View anonymous attachment</a>}
    <div className="report-controls"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Report["status"])}><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select></label><label>Public reply<textarea rows={2} value={reply} maxLength={1000} onChange={(event) => setReply(event.target.value)} placeholder="This reply is visible to the worker with their tracking code." /></label><button className="button button-primary" onClick={() => onSave(report, status, reply)}>Save update</button></div><small className="muted">Triage: {report.triageSource}</small>
  </article>;
}

function SummaryCard() {
  const [summary, setSummary] = useState<{ themes: string[]; risks: string[]; actions: string[]; source: string }>();
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/summary", { method: "POST" }).then(async (response) => {
      const result = await response.json() as typeof summary & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Weekly summary is not available.");
      if (result) setSummary(result);
    }).catch((reason: Error) => setError(reason.message));
  }, []);
  return summary ? <div className="summary-grid"><SummaryColumn title="Themes" items={summary.themes} /><SummaryColumn title="Risks" items={summary.risks} /><SummaryColumn title="Suggested actions" items={summary.actions} /><small className="muted">Source: {summary.source} · Aggregated workplace data only</small></div> : <p className="muted">{error || "Preparing anonymised summary…"}</p>;
}

function SummaryColumn({ title, items }: { title: string; items: string[] }) {
  return <div><strong>{title}</strong>{items.map((item) => <p key={item}>{item}</p>)}</div>;
}

function Score({ label, value }: { label: string; value: number }) {
  return <article className="score-card"><span>{label}</span><strong>{value}<small>/5</small></strong></article>;
}
