# Product Specification — Yourself

**Document type:** Product specification (features, purpose, behavior)  
**Repository:** `mine-software` (monorepo)  
**Primary application:** `productivity-app/` (React frontend + Express API)  
**Product name (in-app):** Yourself (`productivity-app/frontend/src/constants/app.ts`)

---

## 1. Purpose and vision

**Yourself** is a personal productivity and self-management system. It helps a single user:

- **Structure ambitions** across time horizons (year → month → week → day) with optional parent/child goal trees.
- **Execute work** through focused sessions (timed Pomodoro-style work, reflection on outcomes, optional framework fields).
- **Track honest performance** with timezone-aware progress rollups, dashboards, and distinction between “no data yet” and “0% achieved.”
- **Reflect and learn** via structured journaling (life journal + goal-linked journals) and explicit failure logs.
- **Recover from mistakes** with soft-delete (trash), restore, and exports—without losing the option to wipe everything when starting fresh.

The product is **not** positioned as team collaboration software; it is an individual’s operating system for goals, sessions, and reflection, backed by authenticated API storage and local client state.

---

## 2. Target user and success criteria

| Audience | Primary need |
|----------|----------------|
| Individual knowledge workers, students, or anyone running personal systems | One place to plan goals, run focus sessions, journal, and see performance over time |

**Success looks like:** the user can log in, define goals with optional plans and frameworks, complete or skip sessions consistently, see dashboard trends that match their calendar timezone, export a PDF summary or JSON backup, and safely delete or restore items without silent data loss.

---

## 3. Technical architecture (how it runs)

| Layer | Role |
|-------|------|
| **Frontend** | Vite + React + React Router (`HashRouter`). UI state via Zustand; offline-capable structured storage via Dexie (IndexedDB) for entities such as goals, sessions, journals. |
| **Backend** | Express REST API on Node; SQLite via `sql.js` with persistence to disk (`DB_PATH` or default `./productivity.db`). |
| **Authentication** | Firebase Authentication (email/password and Google sign-in on the client; Firebase Admin verifies `Bearer` tokens on `/api/*` except health). |
| **Time** | Client sends `X-User-Timezone` (IANA zone) on API calls; progress and calendar logic use the user’s zone for day/week/month boundaries. |
| **Workspace** | Root `package.json` orchestrates `dev:api`, `dev:app`, `build:api`, `build:app` under `productivity-app/`. A separate `dashboard-app/` package exists in the repo but is not the shipped “Yourself” product UI. |

---

## 4. Core concepts (domain model)

### 4.1 Frameworks

Templates that define **named keys** (e.g. focus, method) with labels and optional descriptions. Goals can attach to a framework so session or goal data can be captured in a consistent shape.

### 4.2 Goals

- **Types:** `yearly`, `monthly`, `weekly`, `daily`.
- **Categories (optional):** spirituality, finance, health, relation.
- **Hierarchy:** Goals may have a `parentId` or be independent (`isIndependent`).
- **Plan (for yearly / monthly / weekly):** Structured plan stored in goal `data` (e.g. 12 months, 4 weeks, 7 days) with per-slot text; supports generating the next granularity of child goals from the plan.
- **Status:** `active`, `done`, `not_done`, `skipped` (and backend may mark completion when auto-progress crosses a high threshold).
- **Progress:** `0–100`, computed from session activity; `progressHasData` distinguishes “no sessions yet” from a real zero.

### 4.3 Sessions (timed focus)

Linked to a goal. Support **work/rest durations**, optional **alarm** when work block ends, **framework fields** captured during the session, and completion metadata: whether the goal was achieved, mistakes, improvement ideas, or skip reason. Sessions can be **active**, **completed**, or **skipped**.

### 4.4 Daily simple sessions

For **daily** goals, lighter-weight **checklist-style** instances: pending / done / missed, with optional notes—complementary to full timer sessions for the same goal where applicable.

### 4.5 Journals

- **Life journal (daily):** Sections for thinking, emotions, problems/solutions, ideas (structured sub-fields).
- **Goal-linked journals:** Filtered by goal timeframe and category; can store guided answers (e.g. completion, mistakes, improvement) tied to a goal and date.

### 4.6 Failures

Manual log entries attached to either a **session** or a **goal**, with a required note—used to capture setbacks explicitly for review.

### 4.7 Trash (soft delete)

Deleted entities are recoverable from a **Trash** area until permanently purged.

---

## 5. Feature specification by area

### 5.1 Authentication and access

- Unauthenticated users are redirected to **Login**.
- Login supports **email/password** (sign up + sign in) and **Google** (where configured).
- All API routes under `/api` (except documented health checks) require a valid Firebase ID token.
- If Firebase env vars are missing, the app should surface a clear configuration error rather than failing silently.

### 5.2 Navigation and shell

Primary routes (authenticated):

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — performance overview, charts, aggregates by goal type and category |
| `/goals` | Goal hierarchy, frameworks, plans, session entry points, status actions |
| `/journal` | Life journal + goal journal browser with filters |
| `/failures` | Failure log CRUD linked to goals or sessions |
| `/session` | Focus session UI (typically opened with `?goalId=`) |
| `/trash` | Restore or permanently delete soft-deleted items |

**Session** is reachable from Goals (not necessarily in the main nav). Sidebar (desktop) and bottom nav (mobile) cover the main sections.

### 5.3 Dashboard

- Loads goals and computes **dashboard stats** (e.g. breakdowns by daily/weekly/monthly/yearly and by category).
- Presents **visual trends** (e.g. area charts) for performance over time.
- Intended as the at-a-glance **honest mirror** of how goal types and life areas are trending—not just a trophy screen.

### 5.4 Goals

- List and drill into goals with **expand/collapse**, category chips, and type grouping.
- Create/edit goals via modal; manage **frameworks** via dedicated modal.
- **Goal plan editor** for plannable types; ability to **spawn child goals** aligned to plan slots (year → month → week → day).
- Actions include marking outcomes, opening **goal journal** prompts on completion-oriented flows, starting **timer sessions**, and managing **daily simple sessions** (add, mark done/missed, notes).
- Integrates confirmations and toasts for destructive or important actions.

### 5.5 Session (focus timer)

- Restores an **active session** from storage if the user returns mid-session.
- Configurable **work and rest minutes**, optional **alarm sounds**, focus vs. non-focus display modes.
- On end: capture whether the goal was achieved, mistakes, improvements; persist session to backend/local model.
- Skip flow captures a reason where applicable.

### 5.6 Journal

- **Daily tab:** Life journal only—save when at least one field has content.
- **Goals tab:** Pick timeframe (Daily/Weekly/Monthly/Yearly) and category; expand per-goal blocks to view or add content aligned to that goal’s journal type.

### 5.7 Failures

- List failures with context; add new failure with type (session vs goal), linked id, and note.
- Edit and delete with confirmation patterns consistent with the rest of the app.

### 5.8 Trash

- Fetch aggregated deleted items; **restore** to active lists or **purge** permanently with strong confirmation on purge.

### 5.9 Export and data control

From the layout (sidebar):

- **Export Summary (PDF):** For the **currently selected goal**, build a PDF including plan (if present), sub-goals, relevant journal Q&A excerpts, and session counts (timer + simple sessions for daily goals).
- **Export Full Backup (JSON):** Download a complete backup of user data via the export API path used by the client.
- **System Wipe:** Clear local IndexedDB tables and call backend clear; reload the app—intended as a nuclear reset with explicit user confirmation.

---

## 6. Progress and fairness rules (backend intent)

Progress is derived from **completed sessions** (and achievement flags where applicable), aggregated in the user’s **timezone**:

- **Daily portfolio-style metrics** combine multiple daily goals per calendar day.
- **Weekly** views use a Monday–Sunday (or zone-equivalent) window; days without activity contribute **0%** toward the weekly average so empty days are not ignored.
- **Monthly / yearly** rollups average lower tiers only for periods that actually have data (see `backend/src/services/progress.ts` comments for the exact policy).
- When rolled-up progress crosses an **auto-complete threshold** (~99.5%) while a goal is still `active`, the system may mark it **completed** automatically.

This behavior is part of the **desired product contract**: numbers should match how a user experiences their calendar, not UTC midnight in a random zone.

---

## 7. Non-functional expectations

| Area | Expectation |
|------|-------------|
| **Security** | API protected by Firebase tokens; no anonymous multi-tenant data access. |
| **Reliability** | Client retries selected writes (e.g. daily simple session POST) on transient gateway errors. |
| **Privacy** | Data is user-scoped; exports and wipe are user-initiated. |
| **UX** | Dark, focused UI; motion for feedback; mobile-friendly nav. |

---

## 8. Configuration (operators)

**Frontend:** `VITE_FIREBASE_*`, `VITE_API_BASE` (normalized to API prefix).  
**Backend:** `DB_PATH`, Firebase Admin credentials, `PORT` (default `3001`).

---

## 9. Out of scope (current codebase)

- Multi-user teams, sharing, or real-time collaboration.
- Native mobile apps (web-first).
- The default Vite template in `dashboard-app/` as a user-facing product surface for Yourself.

---

## 10. Document maintenance

When features or routes change, update this specification alongside:

- `productivity-app/frontend/src/App.tsx` (routes)
- `productivity-app/backend/src/index.ts` (API surface)
- `productivity-app/backend/src/types.ts` and `productivity-app/frontend/src/db/index.ts` (schema alignment)

---

*This specification describes the running **Yourself** productivity application as implemented under `productivity-app/` and the intended product behavior inferred from that implementation.*
