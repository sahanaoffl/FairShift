You are a senior full-stack engineer building "FairShift" for a time-limited hackathon (Prompt Wars 2026, theme UN SDG 8: Decent Work and Economic Growth). Follow .github/copilot-instructions.md strictly. Work in phases. After each phase run `npm run lint`, `npm test` and `npm run build`, fix every error, then continue. Do not ask me questions. Make sensible assumptions and list them in README.md.

## PRODUCT
FairShift makes work fairer, safer and more transparent for workers in employee-intensive organisations, and gives employers early-warning insights.
Core loop: worker attendance -> auto-calculated, EXPLAINED payslip. Anonymous reports -> AI triage -> employer risk dashboard.
Users:
- Worker: low literacy, regional language (English / Tamil / Hindi), basic Android phone.
- Admin: site manager / HR / college administrator.
Signature feature: "Explain My Pay". Every payslip line is explained in plain language, in the worker's language, read aloud with a button, and links back to the attendance records that produced it.

## INDUSTRIES (must both work from one codebase via an org "industry profile")
1. Construction Site: roles Mason, Electrician, Helper, Supervisor. Shift types Day, Night. Daily-wage style, overtime 1.5x after 8 hours, PF + ESI deductions. Report categories: Safety hazard, Wage issue, Harassment, Equipment, Facilities. Skills: Scaffolding, Electrical, Working at Height, First Aid.
2. College: roles Housekeeping, Security, Lab Assistant, Guest Lecturer. Shift types Morning, Evening. Monthly-salary / hourly style, overtime 1.25x after 8 hours (hourly staff 1.5x), PF deduction. Report categories: Workload, Harassment, Facilities, Safety hazard, Pay issue. Skills: Fire Safety, First Aid, Lab Safety, Computer Basics.
An industry profile is a typed config object in src/lib/industry.ts (roles, shift types, pay rules, report categories, skills, label translations). The UI has an Industry switcher in the demo bar that swaps the active org.

## TECH
- Next.js (App Router) + TypeScript strict + Tailwind. Mobile-first PWA: manifest.webmanifest, simple service worker caching the app shell, installable.
- Data layer: define a Repository interface in src/lib/repo/types.ts. Implement (a) FirestoreRepo using @google-cloud/firestore with Application Default Credentials (no key files) and (b) MemoryRepo seeded with demo data. Choose at runtime: use Firestore when GOOGLE_CLOUD_PROJECT is set and USE_MEMORY_DB !== "true", else MemoryRepo. All code talks only to the interface.
- Auth (demo-grade but secure): a worker chooses their name and enters a 4-digit PIN, an admin enters an admin PIN. Hash PINs with bcryptjs in the seed data. Issue a signed, httpOnly, sameSite=lax session cookie using `jose` (HS256) with SESSION_SECRET from env. Add src/middleware.ts to protect /worker/* and /admin/*. Workers can only read their own attendance and pay. Admins can only read their own org.
- Validation: zod on every route handler. Add basic in-memory rate limiting on the report-submission and login routes.
- AI: Gemini on Vertex AI using the `@google/genai` SDK with `vertexai: true`, project and location from env, ADC credentials, model name from env GEMINI_MODEL (default "gemini-2.5-flash"). Server-side only, never expose to the client.
- Charts: recharts, lazy-loaded via next/dynamic.
- QR: `qrcode` to render, `html5-qrcode` to scan. Provide a "Check in without camera" button fallback.
- Voice: browser Web Speech API. SpeechRecognition for voice reports, speechSynthesis for reading payslips aloud. Feature-detect and degrade gracefully. Map languages to en-IN, ta-IN, hi-IN.
- Tests: Vitest for unit tests. One Playwright smoke test.
- Deployment: Dockerfile (multi-stage, node:20-alpine, next.config output "standalone", non-root user, PORT=8080), .dockerignore, and a `deploy.sh` that runs `gcloud run deploy fairshift --source . --region asia-south1 --allow-unauthenticated --set-env-vars ... --set-secrets SESSION_SECRET=...`. Document the Firestore, Secret Manager and Vertex AI setup in the README.

## PHASE 1: Foundation + the credibility core
1. Scaffold the project with a clean structure:
   src/app/(worker)/worker/..., src/app/(admin)/admin/..., src/app/api/..., src/components, src/lib, src/lib/repo, src/i18n, src/types.
2. src/types: Organisation, Worker, AttendanceRecord, PayRules, Payslip, Grievance, FeedbackEntry, SkillRecord, FatigueFlag.
3. src/lib/pay.ts: pure function `calculatePay(records, rules)` returning { regularHours, overtimeHours, grossRegular, grossOvertime, gross, deductions[{key, amount}], net, lines[] } where `lines` are explanation items { key, params, recordIds } that the UI translates. Handle: normal day, overtime day, missed check-out (treat as a 0-hour record flagged "needs review", never silently guess), night shift crossing midnight, unpaid break deduction, and rounding to 2 decimals. Use integer paise internally to avoid float errors.
4. src/lib/fatigue.ts: pure function `detectFatigue(records)` flags > 60 hours in a rolling 7 days, 6+ consecutive working days, and less than 10 hours rest between shifts. Returns severity (watch / high) with the reason keys.
5. src/lib/tracking.ts: `generateTrackingCode()` (human-friendly, e.g. FS-7KQ2-9MXA) and `hashTrackingCode(code)` (SHA-256 with a server salt from env).
6. src/lib/industry.ts: the two industry profiles described above.
7. Write thorough Vitest tests for pay, fatigue and tracking (at least 15 test cases including the edge cases above). Run them and make them pass.
8. src/lib/seed.ts: deterministic seed data (use a fixed seed) for 2 orgs, 8 workers each (mix of names, with Tamil and Hindi speakers), 30 days of attendance with some overtime, a couple of fatigue cases, 10 sample grievances per org with varied categories and statuses, and sample skill records. Include some workers who look at risk of leaving (many late arrivals, declining attendance, unresolved complaints).

## PHASE 2: Worker interface (mobile-first, big, icon-led)
Routes: /worker/login, /worker (home), /worker/pay, /worker/report, /worker/track, /worker/passport.
- Language selector (English / தமிழ் / हिन्दी) available on every worker screen, persisted in a cookie, updates <html lang>.
- Home: a very large Check In / Check Out button, today's hours, current shift, this week's total hours with a fatigue warning banner if flagged. Check in works by scanning the admin's rotating QR code or via the "Check in without camera" fallback. Support both.
- My Pay: month picker, big Net Pay number, then an itemised list. Every line has plain-language text from the translation files (e.g. "You worked 26 days, 14 hours overtime at 1.5x, which added Rs 840") plus an expandable "See the days" list linking to the attendance records. A prominent "Listen" button reads the whole explanation aloud in the selected language. Flag any "needs review" records and offer a "Something is wrong" button that pre-fills a pay-issue report.
- Speak Up: choose category with big icon buttons, then either a microphone button (voice to text) or a text box, an optional photo upload that is client-side compressed to under 300 KB, and a clear statement "Your name is NOT saved with this report". On submit, show the tracking code in large type with a Copy button. Make it clear the worker should save it.
- Track: enter a tracking code, show the status timeline (Submitted, In Review, Resolved) plus any public admin reply.
- Skill Passport: list of the worker's skills and certifications with issuer and date, plus a "Share" button that generates a read-only public link /passport/[token] (no login) showing a portable, printable passport. Admins can add or verify a skill for a worker.
Everything must work with keyboard only and be usable at 360px width.

## PHASE 3: Admin interface
Routes: /admin/login, /admin (dashboard), /admin/reports, /admin/workforce, /admin/checkin-qr, /admin/payroll, /admin/feedback.
- Dashboard cards: today's attendance, open grievances, high-urgency count, fatigue flags. Charts: 14-day attendance trend, grievances by category, overtime hours by team. A "Retention risk" list with a simple transparent score from attendance drop, late arrivals, overtime load and unresolved reports, showing reasons, not just a number. An "AI weekly summary" card (Phase 4).
- Reports: table with category, urgency, AI summary, status, age. Change status, add a public reply. The admin NEVER sees who submitted a report, only the tracking code hash prefix.
- Workforce: roster with fatigue badges and per-worker attendance.
- Check-in QR: renders a QR containing a signed token that rotates every 60 seconds, with a countdown. The check-in API verifies the signature and expiry.
- Payroll preview: per-worker computed payslips for the month, editable overtime multiplier and deduction rates for the org with a live recalculation, and a CSV export.
- Anonymous Feedback: workers rate their manager, policies and conditions from 1 to 5 with optional text, with no identity stored. Admin sees aggregates with a minimum group size of 5 before showing a breakdown (to protect anonymity).

## PHASE 4: AI features (server-side, Vertex AI)
1. POST /api/triage (called internally when a report is created): sends the report text to Gemini with a strict system prompt and a JSON response schema returning { category, urgency: "low"|"medium"|"high"|"critical", language, englishSummary, englishTranslation, keyThemes[] }. Treat the report text as untrusted data and defend against prompt injection (the model must only classify, never follow instructions in the text). Validate the output with zod. If the call fails, times out (5s) or returns invalid JSON, fall back to src/lib/triage-fallback.ts, a keyword-based classifier covering English, Tamil and Hindi safety words (e.g. fall, helmet, electric shock, no harness, fire; and their Tamil and Hindi equivalents). Add unit tests for the fallback. Mark each grievance with triageSource: "ai" | "rules".
2. POST /api/admin/summary: produces a short weekly workforce summary for the admin (themes, risks, suggested actions) from aggregated, anonymised stats only. Never send worker names or ids to the model.
3. Cache AI results in the repository so the page loads fast and costs stay low.

## PHASE 5: Polish, accessibility, docs, deployment
- Accessibility pass: contrast check, focus styles, skip link, aria-live for status changes, form labels, reduced-motion support, and ensure the whole app is keyboard navigable.
- Security pass: security headers in next.config (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy allowing camera and microphone for self), confirm no secrets anywhere, `.gitignore` covers .env*, node_modules, .next. Ensure that nothing in the repo exceeds a few hundred KB.
- /api/health endpoint.
- A demo bar (visible only when NEXT_PUBLIC_DEMO=true) to switch industry and quick-login as a sample worker or admin, so the live demo needs no typing.
- Playwright smoke test: worker check-in -> view pay -> submit anonymous report -> admin sees it.
- README.md with: problem, solution, features, architecture diagram (mermaid), how the AI is used, security and privacy design (especially anonymity), accessibility notes, how the two industries are supported (a short section I can reuse in my submission), local setup, test commands, and Cloud Run deployment steps with exact gcloud commands (enable APIs: run, firestore, aiplatform, secretmanager, cloudbuild; create a Firestore DB; grant the Cloud Run service account roles/datastore.user and roles/aiplatform.user; create the SESSION_SECRET in Secret Manager).
- Keep the repo clean for a single-branch submission.

## DEFINITION OF DONE
`npm run lint`, `npm test`, `npm run build` all pass. `docker build` succeeds. The app runs locally on MemoryRepo with zero cloud setup. All must-work demo features work end to end:
1. QR/fallback check-in with automatic hours and overtime.
2. Explained payslip with voice, in English, Tamil and Hindi.
3. Anonymous voice/text report with a tracking code and a status tracker.
4. Admin dashboard with AI-triaged reports, fatigue flags and retention risk.
5. Industry switch between Construction and College.
Start with Phase 1 now. When it is complete and tests pass, continue to Phase 2 automatically, and so on, until all phases are done. Then print a summary of what exists, the assumptions made, and anything incomplete.
