"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DemoBar } from "@/src/components/DemoBar";
import type { Language, PayLine, Payslip, SkillRecord } from "@/src/types";

type View = "home" | "pay" | "report" | "track" | "passport" | "feedback";
interface WorkerPayload {
  worker: { name: string; role: string; language: Language };
  organisation: { name: string; industry: "construction" | "college" };
  profile: {
    name: string;
    shiftTypes: string[];
    reportCategories: { key: string; icon: string; labels: Record<Language, string> }[];
  };
  records: Attendance[];
  current?: Attendance;
  weeklyHours: number;
  fatigue?: { severity: "watch" | "high"; reasons: string[] };
  skills: SkillRecord[];
}
interface Attendance { id: string; workDate: string; checkIn: string; checkOut?: string; breakMinutes: number; shiftType: string }
interface PayPayload { month: string; records: Attendance[]; payslip: Payslip }
interface TrackingResult { status: string; category: string; publicReply?: string; timeline: { key: string; complete: boolean; at?: string }[] }
interface PassportPayload { worker: { name: string; role: string }; skills: SkillRecord[] }
interface SpeechRecognitionResultLike { transcript: string }
interface SpeechRecognitionLike {
  lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start(): void;
}
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

const words: Record<Language, Record<string, string>> = {
  en: {
    home: "Home", pay: "My pay", report: "Speak up", track: "Track report", passport: "Skill passport", feedback: "Feedback",
    checkIn: "Check in", checkOut: "Check out", checking: "Saving…", fallback: "Check in without camera", scan: "Scan workplace QR",
    today: "Today's hours", week: "This week's hours", shift: "Current shift", payTitle: "Your explained pay",
    listen: "🔊 Listen to my pay", days: "See the days", reports: "Reports", submit: "Send anonymous report",
    anonymous: "Your name is NOT saved with this report.", saveCode: "Save this code to check your report status.",
    review: "Needs review — this time was not included in your pay. Ask your manager to correct it.",
    submitted: "Submitted", in_review: "In review", resolved: "Resolved", send: "Submit feedback",
  },
  ta: {
    home: "முகப்பு", pay: "என் ஊதியம்", report: "குரல் கொடு", track: "புகார் நிலை", passport: "திறன் சான்று", feedback: "கருத்து",
    checkIn: "பணிக்கு வருகை", checkOut: "பணி முடிவு", checking: "சேமிக்கிறது…", fallback: "கேமரா இல்லாமல் வருகை", scan: "QR குறியீட்டை ஸ்கேன் செய்",
    today: "இன்றைய நேரம்", week: "இந்த வார நேரம்", shift: "தற்போதைய பணி", payTitle: "உங்கள் ஊதிய விளக்கம்",
    listen: "🔊 ஊதிய விளக்கத்தைக் கேள்", days: "நாட்களைக் காட்டு", reports: "புகார்கள்", submit: "பெயரில்லாமல் அனுப்பு",
    anonymous: "இந்தப் புகாருடன் உங்கள் பெயர் சேமிக்கப்படாது.", saveCode: "நிலையைப் பார்க்க இந்தக் குறியீட்டை சேமிக்கவும்.",
    review: "சரிபார்க்க வேண்டும் — இந்த நேரம் ஊதியத்தில் சேர்க்கப்படவில்லை.", submitted: "சமர்ப்பிக்கப்பட்டது", in_review: "பரிசீலனையில்", resolved: "தீர்க்கப்பட்டது", send: "கருத்தை அனுப்பு",
  },
  hi: {
    home: "होम", pay: "मेरी तनख्वाह", report: "आवाज़ उठाएँ", track: "रिपोर्ट देखें", passport: "कौशल पासपोर्ट", feedback: "सुझाव",
    checkIn: "काम पर आएँ", checkOut: "काम पूरा", checking: "सहेज रहे हैं…", fallback: "कैमरे के बिना हाज़िरी", scan: "कार्यस्थल QR स्कैन करें",
    today: "आज के घंटे", week: "इस सप्ताह के घंटे", shift: "वर्तमान पाली", payTitle: "आपकी तनख्वाह का हिसाब",
    listen: "🔊 तनख्वाह सुनें", days: "दिन देखें", reports: "रिपोर्ट", submit: "गुमनाम रिपोर्ट भेजें",
    anonymous: "इस रिपोर्ट के साथ आपका नाम सहेजा नहीं जाएगा।", saveCode: "स्थिति देखने के लिए यह कोड सहेजें।",
    review: "जाँच ज़रूरी — इस समय को वेतन में शामिल नहीं किया गया है।", submitted: "जमा", in_review: "जाँच जारी", resolved: "हल हुआ", send: "सुझाव भेजें",
  },
};

function storedLanguage(fallback: Language): Language {
  if (typeof document === "undefined") return fallback;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith("fairshift_lang="))?.split("=")[1];
  return cookie === "ta" || cookie === "hi" || cookie === "en" ? cookie : fallback;
}

async function compressPhoto(file: File): Promise<string> {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not open this image."));
  });
  let scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  let quality = 0.8;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) { URL.revokeObjectURL(url); throw new Error("Photo compression is not supported on this device."); }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size < 300_000) {
      URL.revokeObjectURL(url);
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the compressed image."));
        reader.readAsDataURL(blob);
      });
    }
    scale *= 0.8;
    quality = Math.max(0.35, quality - 0.08);
  }
  URL.revokeObjectURL(url);
  throw new Error("This photo could not be compressed under 300 KB.");
}

function speechLocale(language: Language): string {
  return language === "ta" ? "ta-IN" : language === "hi" ? "hi-IN" : "en-IN";
}

export function WorkerWorkspace({ view }: { view: View }) {
  const pathname = usePathname();
  const router = useRouter();
  const [payload, setPayload] = useState<WorkerPayload>();
  const [payData, setPayData] = useState<PayPayload>();
  const [language, setLanguage] = useState<Language>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [tracking, setTracking] = useState<TrackingResult>();
  const [newCode, setNewCode] = useState("");
  const [category, setCategory] = useState("");
  const [reportText, setReportText] = useState("");
  const [photo, setPhoto] = useState("");
  const [passport, setPassport] = useState<PassportPayload>();
  const [shareUrl, setShareUrl] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState("");
  const [ratings, setRatings] = useState({ managerRating: 3, policiesRating: 3, conditionsRating: 3 });
  const [feedbackText, setFeedbackText] = useState("");
  const t = words[language];
  const [month, setMonth] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setMonth(new Date().toISOString().slice(0, 7)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/worker/me");
    if (!response.ok) throw new Error("Could not load your worker account. Please sign in again.");
    const value = await response.json() as WorkerPayload;
    setPayload(value);
    setLanguage(storedLanguage(value.worker.language));
    document.documentElement.lang = storedLanguage(value.worker.language) === "ta" ? "ta-IN" : storedLanguage(value.worker.language) === "hi" ? "hi-IN" : "en";
    setSelectedShiftType(value.current?.shiftType ?? value.profile.shiftTypes[0]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { refresh().catch((reason: Error) => setError(reason.message)); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (view === "pay" && month) fetch(`/api/worker/pay?month=${month}`).then(async (response) => {
      const result = await response.json() as PayPayload & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load pay.");
      setPayData(result);
    }).catch((reason: Error) => setError(reason.message));
    if (view === "passport") fetch("/api/worker/passport").then(async (response) => {
      if (!response.ok) throw new Error("Could not load your skill passport.");
      setPassport(await response.json() as PassportPayload);
    }).catch((reason: Error) => setError(reason.message));
  }, [view, month]);

  useEffect(() => {
    if (view === "report") {
      const reportRouteCategory = new URLSearchParams(window.location.search).get("category");
      if (!reportRouteCategory) return;
      const timer = window.setTimeout(() => setCategory(reportRouteCategory), 0);
      return () => window.clearTimeout(timer);
    }
  }, [view]);

  function chooseLanguage(next: Language) {
    setLanguage(next);
    document.cookie = `fairshift_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "ta" ? "ta-IN" : next === "hi" ? "hi-IN" : "en";
  }

  async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
    return result;
  }

  async function attendance(action: "check_in" | "check_out", qrToken?: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await post("/api/worker/attendance", { action, shiftType: selectedShiftType, ...(qrToken ? { qrToken } : {}) });
      setNotice(action === "check_in" ? "You are checked in. Have a safe shift!" : "You are checked out.");
      setScanOpen(false);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save attendance."); }
    finally { setBusy(false); }
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await post("/api/worker/report", { category, text: reportText, ...(photo ? { attachmentDataUrl: photo } : {}) }) as { trackingCode: string };
      setNewCode(result.trackingCode);
      setReportText(""); setPhoto("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send report."); }
    finally { setBusy(false); }
  }

  async function lookupReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setTracking(undefined);
    try { setTracking(await post("/api/track", { code: trackingCode }) as TrackingResult); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Report not found."); }
    finally { setBusy(false); }
  }

  async function createShare() {
    setBusy(true); setError("");
    try {
      const result = await post("/api/worker/passport", {}) as { token: string };
      const url = `${window.location.origin}/passport/${result.token}`;
      setShareUrl(url);
      if (navigator.share) await navigator.share({ title: "My FairShift skill passport", url });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create a share link."); }
    finally { setBusy(false); }
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {     await post("/api/worker/feedback", { ...ratings, text: feedbackText }); setNotice("Thank you. Your feedback is anonymous."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send feedback."); }
    finally { setBusy(false); }
  }

  function listenPay() {
    if (!payData || !("speechSynthesis" in window)) { setError("Voice playback is not available in this browser."); return; }
    const text = payData.payslip.lines.map((line) => payLineText(line, language)).join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale(language);
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice input is not supported on this device. Please type your report."); return; }
    const recognition = new Recognition();
    recognition.lang = speechLocale(language);
    recognition.onresult = (event) => setReportText((existing) => `${existing} ${event.results[0][0].transcript}`.trim());
    recognition.onerror = () => setError("Voice input stopped. You can type your report instead.");
    recognition.start();
  }

  const links: { href: string; label: string; path: string }[] = [
    { href: "/worker", label: t.home, path: "/worker" }, { href: "/worker/pay", label: t.pay, path: "/worker/pay" },
    { href: "/worker/report", label: t.report, path: "/worker/report" }, { href: "/worker/track", label: t.track, path: "/worker/track" },
    { href: "/worker/passport", label: t.passport, path: "/worker/passport" }, { href: "/worker/feedback", label: t.feedback, path: "/worker/feedback" },
  ];

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Link className="brand" href="/">Fair<span>Shift</span></Link>
        <div className="topbar-actions">
          <label className="language-control"><span className="sr-only">Language</span>
            <select aria-label="Choose language" value={language} onChange={(event) => chooseLanguage(event.target.value as Language)}>
              <option value="en">English</option><option value="ta">தமிழ்</option><option value="hi">हिन्दी</option>
            </select>
          </label>
          <button className="button button-small button-quiet" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/worker/login"); }}>Sign out</button>
        </div>
      </header>
      {payload && <DemoBar role="worker" industry={payload.organisation.industry} canSwitch />}
      <div className="app-layout">
        <aside className="side-nav" aria-label="Worker navigation">
          <div className="profile-chip"><span className="avatar">{payload?.worker.name.slice(0, 1) ?? "…"}</span><div><strong>{payload?.worker.name ?? "Loading…"}</strong><small>{payload?.worker.role}</small></div></div>
          <nav>{links.map((link) => <Link key={link.href} aria-current={pathname === link.path ? "page" : undefined} href={link.href}>{link.label}</Link>)}</nav>
          <div className="side-note"><strong>{payload?.organisation.name ?? "FairShift"}</strong><span>{payload?.profile.name ?? "Workplace"}</span></div>
        </aside>
        <section id="main-content" className="workspace" aria-busy={!payload}>
          <div className="workspace-heading"><div><p className="eyebrow">{payload?.profile.name ?? "FAIRSHIFT"}</p><h1>{view === "home" ? `Hello${payload ? `, ${payload.worker.name.split(" ")[0]}` : ""}` : view === "pay" ? t.payTitle : view === "report" ? t.report : view === "track" ? t.track : view === "passport" ? t.passport : t.feedback}</h1></div></div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {notice && <p className="success-message" role="status">{notice}</p>}
          {!payload ? <p className="muted">Loading your information…</p> : null}

          {view === "home" && payload && <>
            <section className="attendance-card">
              <div><p className="eyebrow">{t.shift}</p>{payload.current ? <h2>{payload.current.shiftType} · In progress</h2> : <label className="shift-select"><span className="sr-only">{t.shift}</span><select aria-label={t.shift} value={selectedShiftType} onChange={(event) => setSelectedShiftType(event.target.value)}>{payload.profile.shiftTypes.map((shift) => <option key={shift}>{shift}</option>)}</select></label>}</div>
              <button className={`button check-button ${payload.current ? "button-dark" : "button-primary"}`} disabled={busy} onClick={() => payload.current ? attendance("check_out") : setScanOpen(!scanOpen)}>
                {busy ? t.checking : payload.current ? `↗ ${t.checkOut}` : `✓ ${t.checkIn}`}
              </button>
              {!payload.current && <button className="button button-secondary fallback-button" disabled={busy} onClick={() => attendance("check_in")}>{t.fallback}</button>}
              {!payload.current && <button className="text-link qr-toggle" onClick={() => setScanOpen(!scanOpen)}>{scanOpen ? "Close scanner" : t.scan}</button>}
              {scanOpen && <QrScanner onScan={(token) => attendance("check_in", token)} onError={setError} />}
              <p className="muted">Use your workplace QR or check in without a camera.</p>
            </section>
            <div className="stat-grid">
              <article className="stat-card"><span>{t.today}</span><strong>{payload.records.reduce((hours, item) => hours + (item.checkOut ? Math.max(0, (Date.parse(item.checkOut) - Date.parse(item.checkIn)) / 3_600_000 - item.breakMinutes / 60) : 0), 0).toFixed(1)}h</strong></article>
              <article className="stat-card"><span>{t.week}</span><strong>{payload.weeklyHours.toFixed(1)}h</strong></article>
              <article className="stat-card"><span>{t.shift}</span><strong>{payload.current?.shiftType ?? payload.records[0]?.shiftType ?? "—"}</strong></article>
            </div>
            {payload.fatigue && <div className={`notice-card ${payload.fatigue.severity === "high" ? "notice-high" : ""}`} role="status"><strong>Take care of yourself</strong><p>{payload.fatigue.reasons.map((reason) => reason === "weekly_hours" ? "Your hours are above 60 this week." : reason === "consecutive_days" ? "You have worked six or more days in a row." : "There was less than 10 hours between shifts.").join(" ")}</p></div>}
            <div className="shortcut-grid">
              <Link className="shortcut-card" href="/worker/pay"><span>₹</span><strong>Understand your pay</strong><small>Every amount explained</small></Link>
              <Link className="shortcut-card" href="/worker/report"><span>🗣️</span><strong>Speak up safely</strong><small>Your identity stays private</small></Link>
            </div>
          </>}

          {view === "pay" && payData && <>
            <div className="pay-hero"><span>Net pay · {new Date(`${payData.month}-01T00:00:00`).toLocaleDateString(language, { month: "long", year: "numeric" })}</span><strong>₹{payData.payslip.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><button className="button button-light" onClick={listenPay}>{t.listen}</button></div>
            {payData.payslip.needsReviewRecordIds.length > 0 && <div className="notice-card notice-high" role="alert"><strong>Time record needs checking</strong><p>{t.review}</p></div>}
            <div className="pay-lines">{payData.payslip.lines.map((line, index) => <PayLineCard key={`${line.key}-${index}`} line={line} records={payData.records} language={language} t={t} />)}</div>
            {payData.payslip.needsReviewRecordIds.length > 0 && <Link className="button button-secondary" href={`/worker/report?category=${payload?.organisation.industry === "college" ? "pay_issue" : "wage_issue"}`}>Something is wrong</Link>}
            <label className="month-picker">Choose month<input type="month" value={payData.month} onChange={(event) => setMonth(event.target.value)} /></label>
          </>}

          {view === "report" && (newCode ?           <div className="tracking-success"><div className="success-mark">✓</div><h2>Report sent safely</h2><p>{t.saveCode}</p><code>{newCode}</code><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(newCode)}>Copy code</button><button className="text-link" onClick={() => { setNewCode(""); router.push("/worker/track"); }}>Track this report</button></div> : <form className="form-stack panel" onSubmit={submitReport}>
            <p className="anonymous-note">🔒 {t.anonymous}</p>
            <fieldset><legend>What is this about?</legend><div className="category-grid">{payload?.profile.reportCategories.map((item) => <button type="button" key={item.key} aria-pressed={category === item.key} className={`category-button ${category === item.key ? "selected" : ""}`} onClick={() => setCategory(item.key)}><span>{item.icon}</span>{item.labels[language]}</button>)}</div></fieldset>
            <label>Tell us what happened<textarea rows={5} value={reportText} onChange={(event) => setReportText(event.target.value)} minLength={5} maxLength={2000} required placeholder="You can write in your language." /></label>
            <div className="inline-actions"><button type="button" className="button button-secondary" onClick={startVoiceInput}>🎙️ Speak your report</button><label className="button button-secondary file-button">Add a photo<input type="file" accept="image/*" capture="environment" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { setPhoto(await compressPhoto(file)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not compress photo."); }
            }} /></label></div>
            {photo && <p className="helper-text">Photo compressed and ready. <button className="text-link" type="button" onClick={() => setPhoto("")}>Remove</button></p>}
            <button className="button button-primary" disabled={busy || !category}>{busy ? "Sending…" : t.submit}</button>
          </form>)}

          {view === "track" && <div className="panel"><form className="form-stack" onSubmit={lookupReport}><label>Tracking code<input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="FS-7KQ2-9MXA" required /></label><button className="button button-primary" disabled={busy}>{busy ? "Checking…" : "Check status"}</button></form>
            {tracking && <div className="timeline"><h2>{tracking.category.replaceAll("_", " ")}</h2>{tracking.timeline.map((item) => <div key={item.key} className={`timeline-item ${item.complete ? "complete" : ""}`}><span className="timeline-dot" /><div><strong>{t[item.key] ?? item.key}</strong>{item.at && <small>{new Date(item.at).toLocaleString(language)}</small>}</div></div>)}{tracking.publicReply && <div className="reply-card"><strong>Workplace reply</strong><p>{tracking.publicReply}</p></div>}</div>}
          </div>}

          {view === "passport" && <div className="panel"><p className="muted">Your verified skills travel with you. Share this read-only page when you choose.</p><div className="skill-list">{passport?.skills.map((skill) => <article key={skill.id} className="skill-item"><span>✦</span><div><strong>{skill.name} {skill.verified && <span className="verified">✓ Verified</span>}</strong><small>{skill.issuer} · {new Date(skill.issuedAt).toLocaleDateString(language)}</small></div></article>)}</div><button className="button button-primary" disabled={busy} onClick={createShare}>↗ Share my passport</button>{shareUrl && <p className="share-link"><a href={shareUrl}>{shareUrl}</a><button className="button button-small button-secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy link</button></p>}</div>}

          {view === "feedback" && <form className="form-stack panel" onSubmit={submitFeedback}><p className="anonymous-note">Your ratings are stored without your name. Results are only shown for groups of five or more.</p>{(["managerRating", "policiesRating", "conditionsRating"] as const).map((field) => <label key={field}>{field === "managerRating" ? "How fair is your manager?" : field === "policiesRating" ? "How fair are workplace policies?" : "How are your work conditions?"}<select value={ratings[field]} onChange={(event) => setRatings((current) => ({ ...current, [field]: Number(event.target.value) }))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}<label>Optional comment<textarea rows={3} maxLength={500} value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} /></label><button className="button button-primary" disabled={busy}>{t.send}</button></form>}
        </section>
      </div>
      <footer className="footer-note">FairShift · Safer work. Fairer pay. A voice that matters.</footer>
    </main>
  );
}

function payLineText(line: PayLine, language: Language): string {
  const amount = Number(line.params.amount ?? 0).toFixed(2);
  const hours = Number(line.params.hours ?? 0);
  if (line.key === "regular_pay") {
    return language === "ta" ? `${hours} மணிநேரம் வேலை செய்தீர்கள். அடிப்படை ஊதியம் ₹${amount}.` : language === "hi" ? `आपने ${hours} घंटे काम किया। मूल वेतन ₹${amount}।` : `You worked ${hours} regular hours, earning ₹${amount}.`;
  }
  if (line.key === "overtime_pay") {
    return language === "ta" ? `${hours} கூடுதல் மணிநேரம் ${line.params.multiplier} மடங்கு ஊதியம். ₹${amount}.` : language === "hi" ? `${hours} अतिरिक्त घंटे ${line.params.multiplier} गुना दर पर। ₹${amount}।` : `You worked ${hours} overtime hours at ${line.params.multiplier} times, which added ₹${amount}.`;
  }
  if (line.key === "needs_review") {
    return language === "ta" ? "ஒரு வருகைப் பதிவில் வெளியேறும் நேரம் இல்லை. சரிபார்க்க வேண்டும்." : language === "hi" ? "एक हाज़िरी रिकॉर्ड में जाने का समय नहीं है। जाँच ज़रूरी है।" : "One attendance record has no check-out time and needs review.";
  }
  const deduction = line.key.includes("pf") ? "Provident Fund" : "ESI";
  return language === "ta" ? `${deduction} பிடித்தம் ₹${amount}.` : language === "hi" ? `${deduction} कटौती ₹${amount}।` : `${deduction} deduction: ₹${amount}.`;
}

function PayLineCard({ line, records, language, t }: { line: PayLine; records: Attendance[]; language: Language; t: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const amount = line.params.amount;
  const text = payLineText(line, language);
  return <article className="pay-line"><div><strong>{text}</strong>{typeof amount === "number" && <span>₹{amount.toFixed(2)}</span>}</div>{line.recordIds.length > 0 && <><button className="text-link" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : t.days} ({line.recordIds.length})</button>{expanded && <ul className="record-links">{records.filter((record) => line.recordIds.includes(record.id)).map((record) => <li key={record.id} id={record.id}><a href={`#${record.id}`}>{new Date(`${record.workDate}T00:00:00`).toLocaleDateString(language)} · {record.checkOut ? `${new Date(record.checkIn).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })} – ${new Date(record.checkOut).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}` : "Needs review"}</a></li>)}</ul>}</>}</article>;
}

function QrScanner({ onScan, onError }: { onScan: (token: string) => void; onError: (message: string) => void }) {
  const scannerId = `qr-reader-${useId().replaceAll(":", "")}`;
  const callbacks = useRef({ onScan, onError });
  useEffect(() => { callbacks.current = { onScan, onError }; }, [onError, onScan]);
  useEffect(() => {
    let stopScanner: (() => Promise<void>) | undefined;
    let active = true;
    import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (!active) return;
      const scanner = new Html5Qrcode(scannerId);
      stopScanner = () => scanner.stop();
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 220, height: 220 } }, (value) => callbacks.current.onScan(value), () => undefined);
      } catch {
        callbacks.current.onError("Camera unavailable. Use the no-camera check-in button.");
      }
    }).catch(() => callbacks.current.onError("QR scanner could not load."));
    return () => { active = false; if (stopScanner) void stopScanner().catch(() => undefined); };
  }, [scannerId]);
  return <div id={scannerId} className="qr-reader" aria-label="QR code scanner" />;
}
