# Build: React Native mobile app for the Riaura/Aaruchudar HR & Operations Dashboard

## Model & working style

This session should run at high effort. This is a large, multi-phase, long-horizon build — read this whole spec before writing any code, plan the full architecture up front, and work phase by phase. Do not shortcut the permission logic or invent features not listed here.

## What this is

I have an existing, live **Next.js 16 web app** — an internal HR/operations dashboard for **Aaruchudar Technologies** (single company, single-tenant, ~18 real employees, not a SaaS product). Backend is Next.js API routes + Prisma + Turso (SQLite), deployed and working.

I want a **React Native mobile app that is the same product on a phone** — same users, same roles, same permissions, same screens, same data, same business rules. The website stays as-is. **This folder is the new, separate React Native project.** The mobile app is a client of the existing web backend — it calls the same `/api/*` endpoints over HTTPS.

**Do not reimplement the backend, the database, or the seed data in this project.** The database already has the real users. Do not invent new features, roles, screens, or permission rules beyond what's specified here.

## Tech stack (use exactly this)

- **Expo** (managed workflow) + **Expo Router** (file-based routing) + **TypeScript**
- **NativeWind** for styling (the web app is Tailwind — classes translate almost 1:1)
- **TanStack Query** for server state, fetching, and cache invalidation
- **expo-secure-store** for the auth tokenmake 
- **lucide-react-native** for icons (web uses `lucide-react`, so every icon maps 1:1)
- **date-fns** for dates
- **react-native-gifted-charts** or **Victory Native** for bar charts (web uses Recharts)
- **expo-image-picker** + `expo-document-picker` for attachments
- API base URL from an env/config value, e.g. `EXPO_PUBLIC_API_URL` — never hardcoded

## Authentication — how it works today and the one change needed

Today the web backend authenticates with an **httpOnly session cookie** (`riaura_session`):
- `POST /api/auth/login` `{email, password}` → verifies against `Employee.passwordHash` (scrypt-style hash), creates a `Session` row (random 32-byte token, SHA-256 hash stored, 30-day expiry, userAgent + IP recorded), sets the cookie, returns `{user}` where user = `{id, name, email, avatar (initials), avatarColor, role (UI form like "super-admin"), roleLabel, dept, title, phone, location, permissions[]}`.
- `GET /api/auth/me` → same user shape from the cookie.
- `POST /api/auth/logout` → deletes the session row and clears the cookie.
- Every failed and successful login is written to the audit log.

**Required backend change (flag it, don't fake it):** mobile can't use httpOnly browser cookies reliably. The login endpoint must additionally return the raw session **token in the JSON body** for mobile clients (e.g. when the request carries a header like `x-client: mobile`), and the backend's `getCurrentUser()` must accept `Authorization: Bearer <token>` as an alternative to the cookie. The `Session` table already stores hashed tokens, so this is a small change on the web repo — **list exactly what needs changing there and I'll apply it in the web project; build this app assuming bearer-token auth works.**

Store the token in `expo-secure-store`, attach it on every request, and on 401 clear it and return to the Login screen.

## Roles — exactly 7, do not add or rename

DB values → UI values → labels:

| DB role | UI role string | Label |
|---|---|---|
| `super_admin` | `super-admin` | Super Admin |
| `first_level_manager` | `1st-level-manager` | 1st Level Manager |
| `second_level_manager` | `2nd-level-manager` | 2nd Level Manager |
| `manager` | `manager` | Manager |
| `team_lead` | `team-lead` | Team Lead |
| `hr_admin` | `hr-admin` | HR Admin |
| `employee` | `employee` | Employee |

### Permission system

Navigation/screens are gated by **permission strings** stored per-role in a `RolePermission` table and returned in the `permissions[]` array at login. `"*"` means everything. The full permission vocabulary:

`dashboard, employees, departments, teams, projects, tasks, attendance, leave, payroll, kpi, okr, analytics, reports, settings, my-work, employee-profile, knowledge, calendar, meetings, roles, audit, profile, eod, expense-claims`

Current defaults per role (the server is the source of truth — always render nav from the fetched `permissions[]`, never from this hardcoded table):

- **super_admin**: `*`
- **first_level_manager**: dashboard, employees, teams, projects, tasks, attendance, leave, payroll, kpi, okr, analytics, reports, settings, my-work, employee-profile, eod, expense-claims
- **second_level_manager**: same as above minus payroll and settings
- **manager**: dashboard, employees, teams, projects, tasks, attendance, leave, my-work, employee-profile, knowledge, eod, expense-claims
- **team_lead**: dashboard, projects, tasks, attendance, leave, my-work, employee-profile, knowledge, calendar, meetings, eod, expense-claims
- **hr_admin**: dashboard, employees, departments, teams, attendance, leave, payroll, my-work, employee-profile, settings, roles, audit, reports, knowledge, eod, expense-claims
- **employee**: dashboard, my-work, tasks, attendance, leave, calendar, meetings, knowledge, profile, eod, expense-claims

### Hard role rules enforced by the API (mirror them in the UI)

- **`canApprove` = `super_admin` only** — leave approval/rejection, viewing other employees' attendance, and the org-wide "who's punched in today" view.
- **`isHrAdmin` = `super_admin` or `hr_admin`** — employee create/edit/delete, departments CRUD, payroll grant, expense-claim approval, KPI CRUD, projects create, API keys, audit log, viewing all EOD reports, sending EOD reminder emails.
- **Task visibility**: tasks are private to the assignee/assigner, except `TASK_ADMIN_ROLES` = super_admin, manager, first_level_manager, second_level_manager, team_lead who can see and manage everyone's tasks.
- **Ops Expense Log**: gated by **email, not role** — only `vignesh@aaruchudar.com` can submit entries; that user and `super_admin` can view the log; **only `super_admin` can delete entries**. Super admins see a "Submitted By" column and spend-by-month/spend-by-week bar charts; the submitter sees only their own entries.
- **Roles & Permissions screen**: only `super_admin` can edit; `super_admin`'s own `*` grant can never be modified.
- **Salary visibility** on employee profiles is restricted to privileged roles.

## The real users (already in the production DB — do NOT reseed; listed so you understand the org)

Default password for everyone: `Welcome@2026`. Two departments: **TECH** and **NON-TECH**.

| Name | Title | Role | Email |
|---|---|---|---|
| Aashika N | CEO | super_admin | ash@aaruchudar.com |
| Venkat B | Co-Founder | super_admin | venkat@aaruchudar.com |
| Chief Financial Advisor | Chief Financial Advisor | super_admin | cfa@aaruchudar.com |
| Madhesh G | Manager | manager | madhesh@aaruchudar.com |
| Raji Muthuramalingam | Manager | manager | raji@aaruchudar.com |
| Kishore Bk | Project Manager | team_lead | projects@aaruchudar.com |
| Shiyam Sundar G | R&D Specialist - 2 & Data Analyst | employee (NON-TECH) | shiyam@aaruchudar.com |
| Thirukumaran A | R&D Specialist - 1 | employee (NON-TECH) | thirukumaran@aaruchudar.com |
| Jagadeesan S | Power BI | employee (TECH) | jagadeesan@aaruchudar.com |
| Shelsia Sharon | Train the Trainer | employee (NON-TECH) | shelsia@aaruchudar.com |
| Niroshini A | Train the Trainer | employee (NON-TECH) | niroshini@aaruchudar.com |
| Sanjay S | Power BI Specialist | employee (TECH) | sanjay@aaruchudar.com |
| Lalitha Kishore J | Analytics & Research Associate - I | employee (TECH) | kishore@aaruchudar.com |
| Aditya Yadav | Software Developer - 1 | employee (TECH) | aditya@aaruchudar.com |
| Shourya Bodla | R&D Specialist - 1 | employee (NON-TECH) | shourya@aaruchudar.com |
| Rishabh Mishra | Web & App Developer - I | employee (TECH) | rishabh@aaruchudar.com |
| Yana Wadhavan | Product Manager | employee (TECH) | yana@aaruchudar.com |
| Jyotsna Pandey | Neuroscientist | employee (NON-TECH) | jyotsna@aaruchudar.com |

(Plus `vignesh@aaruchudar.com` — the ops-expense submitter.) Use Aditya's or a super_admin login for testing different permission levels.

## Data model (backend already has all of this — build typed interfaces + API calls against it)

**Employee**: name, email, avatarInitials + avatarColor (Tailwind class like `bg-indigo-500` — render initials in a colored circle, no photos), role, roleLabel, title, phone, location, status (active/on_leave/inactive), salary (₹, annual), permissions, joinedAt, dob, departmentId, managerId (self-relation → org chart).
**Department**: name, color, budget, head. **Team**: name, department, lead, members.
**Attendance**: one row per employee per day — punchIn, punchOut, status (`present`/`late`/`absent`), hoursWorked. **Late = punch-in after 09:15.**
**LeaveType** (Annual 12d, Sick 6d, Paid 6d, Unpaid 15d) / **LeaveBalance** (total, used per type) / **LeaveRequest** (dates, days, reason, status pending/approved/rejected, reviewedBy).
**Project**: name, code, client, department, manager, priority (critical/high/medium/low), status (planning/in-progress/review/on-hold/completed), budget, spent, members. **Task**: title, project, assignee, assignedBy, priority, status (todo/in-progress/review/done), dueDate, tags[], description, estimateHours, comments, activity log.
**CalendarEvent**: date, times, allDay, type (meeting/focus/event/deadline/holiday), color, attendeeIds[]. Seeded with Indian national holidays (Independence Day, Diwali, etc.).
**Meeting**: date, start/end time, type (video/in-person/phone/hybrid), gmeetLink, room, agenda, recurrence, attendees.
**PayrollRecord**: employee + month ("2026-06"), amount, status pending/paid, grantedBy. **OperatingExpense**: category (Operations/Marketing/Infrastructure/Travel/Benefits/Training) + month, amount vs budgetAmount.
**KPI**: name, department, current vs target, unit, trend, period. **Objective/KeyResult**: quarter, year, progress %, on-track/at-risk.
**KnowledgeArticle**: title, content, category, author, views.
**Notification**: type, title, body, read flag, link (screen id to deep-link to).
**AuditLogEntry**: actor, action, resource, ip, severity (info/warning/danger).
**ApiKey**, **Invoice**, **OrgSettings** (companyName "Riaura Technologies Inc.", currency, notification prefs, security prefs).
**ExpenseClaim**: category (Travel/Meals/Office Supplies/Software/Other), amount, date, description, status pending/approved/rejected, reviewer.
**OpsExpense**: payeeName, reason, description, paymentMode (cash/online/cheque), amount, date, screenshotUrl — **screenshot is required when paymentMode is "online" and rejected otherwise**.
**EODReport**: one per employee per day — summary, blockers, tomorrowPlan, taskIds[] (links to the user's open tasks), attachments[] `{name,url,size,type}` — **max 5 files, 5MB each, images/PDF only**.

**Currency is ₹ (INR) everywhere**, formatted with `toLocaleString("en-IN")`.

## API endpoints (all exist — the app consumes them)

Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
Profile: `GET/PATCH /api/profile`, `POST /api/profile/password`
Dashboard: `GET /api/dashboard/stats` · Search: `GET /api/search?q=`
Employees: `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/[id]` · Org chart: `GET /api/org-chart`
Departments: `GET/POST /api/departments`, `PATCH/DELETE /api/departments/[id]` · Teams: `GET/POST /api/teams`, `PATCH/DELETE /api/teams/[id]`
Projects: `GET/POST /api/projects` · Tasks: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`, `POST /api/tasks/[id]/comments` (`GET /api/tasks?assignee=<name>` filters)
Calendar: `GET/POST /api/calendar` · Meetings: `GET/POST /api/meetings`, `DELETE /api/meetings/[id]` (creator or approver only; cancellation notifies attendees)
Attendance: `GET /api/attendance` (today status, monthly stats, 15-row log, heatmap, per-month `?year=&month=` calendar; super_admin also gets `team` + `todayAll` arrays), `POST /api/attendance` `{action:"in"|"out"}` — 409 on double punch
Leave: `GET/POST /api/leave`, `PATCH /api/leave/[id]` (approve/reject — super_admin only; approval decrements balance and notifies)
Payroll: `GET/POST /api/payroll` · Op expenses: `GET/POST /api/expenses`
Expense claims: `GET/POST /api/expense-claims`, `PATCH /api/expense-claims/[id]` (approve/reject — HR admin)
Ops expense log: `GET/POST /api/ops-expenses`, `DELETE /api/ops-expenses/[id]` (super_admin only), `POST /api/ops-expenses/upload` (returns Cloudinary signature)
EOD: `GET/POST /api/eod` (GET returns today's report if submitted, history, compliance; POST upserts today's), `GET /api/eod/all` (HR admin), `POST /api/eod/remind` (HR admin — emails non-submitters), `POST /api/eod/upload` (Cloudinary signature; body `{existingCount}`)
KPI: `GET/POST /api/kpi`, `PATCH/DELETE /api/kpi/[id]` · OKR: `GET/POST /api/okr` · Performance: `GET/POST /api/performance`
Analytics: `GET /api/analytics` · Reports export: `GET /api/reports/export?type=` (CSV download — on mobile, open in browser / share sheet)
Knowledge: `GET/POST /api/knowledge` · Notifications: `GET/PATCH /api/notifications`
Settings: `GET/PATCH /api/settings` · Roles: `GET/PATCH /api/roles` · Audit: `GET /api/audit` · Billing: `GET /api/billing`
Sessions: `GET /api/sessions`, `DELETE /api/sessions/[id]` · API keys: `GET/POST /api/api-keys`, `DELETE /api/api-keys/[id]`

### File upload flow (EOD attachments + ops-expense screenshots)

Two-step signed upload — the app never holds a Cloudinary secret:
1. `POST /api/eod/upload` (or `/api/ops-expenses/upload`) → returns `{cloudName, apiKey, timestamp, folder, signature}`. EOD passes `{existingCount}` in the body and gets a 400 if the report already has 5 attachments.
2. `POST https://api.cloudinary.com/v1_1/{cloudName}/auto/upload` as multipart form-data with `file, api_key, timestamp, signature, folder` → response `secure_url` is what gets stored on the record.
Client-side limits before upload: 5MB per file; EOD accepts images + PDF, ops-expense screenshots images only.

## Screens (match the web app's nav groups; adapt layout to mobile, not the feature set)

**Login** (email + password) → then permission-gated navigation:

- **Overview**: Dashboard (stat cards) · My Work (tabs: Today, My Tasks, Projects, Goals, Schedule; Today shows open tasks / projects / attendance summary cards)
- **Organization**: Employees (directory + profile detail: attendance %, open tasks, projects, salary if permitted) · Departments · Teams
- **Work**: Projects · Tasks (**Kanban columns: To Do / In Progress / Review / Done** — on mobile, horizontally swipeable columns or a segmented list; task detail with comments + activity) · Calendar (month grid with event dots + holidays) · Meetings
- **HR**: Attendance (**punch in / punch out button**, hours today ticking, monthly stats: present days, avg hours vs 8h target, late arrivals; per-month calendar of past punch in/out times) · Leave (balances per type, request form, and for super_admin an approvals queue) · Payroll · Expenses (category vs budget) · Expense Claims (submit + HR approval queue) · Expense Log (Vignesh + super_admin only, as specified above)
- **Analytics**: KPI · OKR · Analytics · Reports (CSV export via share sheet/browser)
- **Workspace**: Knowledge Base · Notifications (unread badge on the nav icon; tapping deep-links via the notification's `link` field) · EOD Report (form: what you accomplished, blockers, top-3 tomorrow priorities, checkbox-link open tasks, attachments; history list with per-day detail; compliance count)
- **Admin**: Settings (org/notifications/security/API-keys tabs) · Roles & Permissions (permission-toggle grid per role) · Audit Logs · Billing
- **Profile**: own info + change password + theme toggle + logout

**Mobile navigation**: bottom tab bar with the 5 most-used items — Dashboard, My Work, Tasks, Attendance, More — where **More** opens the full grouped menu (filtered to the user's permissions, same group labels as above: Overview / Organization / Work / HR / Analytics / Workspace / Admin).

## Visual design — match the web app

- **Dark mode default** with a light-mode toggle (persist in AsyncStorage). Dark: near-black slate backgrounds (`#0B1120`-ish), cards `slate-800/40` with `white/[0.06]` hairline borders. Light: `slate-50` background, white cards, `slate-200` borders.
- **Indigo accent** (`indigo-600` `#4F46E5`) for primary buttons, active nav, links, focus states.
- **Badges** everywhere for statuses, semantic variants: success = emerald, warning = amber, danger = red/rose, info = indigo, purple = violet, default = slate. Priority mapping: critical→danger, high→warning, medium→info, low→default.
- **Avatars** are initials in colored circles (`avatarInitials` + `avatarColor` from the API), sizes sm/md/lg.
- Cards: `rounded-xl`, thin border, no heavy shadows. Section titles small and semibold; muted secondary text (`slate-400`/`slate-500`).
- Charts: bar charts with rounded tops, indigo `#4F46E5` and emerald `#22C55E` fills, subtle dashed grid.
- All amounts in ₹ with en-IN formatting.

## Build phases — stop after each for my review

1. **Foundation**: Expo scaffold, NativeWind theme (dark/light tokens), API client with bearer token + 401 handling, TanStack Query setup, Login → Me → permission-gated tab/More navigation shell with all route stubs. Also output the exact backend diff needed for bearer-token auth.
2. **Personal core**: Dashboard, My Work, Profile (+password change, theme, logout), Notifications, Attendance (punch in/out + stats + history calendar), EOD Report (incl. Cloudinary attachments), Leave (balances + request).
3. **Org & work**: Employees + employee profile, Departments, Teams, Projects, Tasks kanban + detail + comments, Calendar, Meetings.
4. **Money**: Payroll, Expense Claims (+ approval queue), Expense Log (+ signed screenshot upload, super_admin delete), Operating Expenses, Leave approvals queue.
5. **Analytics & admin**: KPI, OKR, Analytics, Reports export, Knowledge Base, Settings, Roles & Permissions, Audit Logs, Billing.

## First step

Before writing code: (1) confirm the plan and the env config you'll use for `EXPO_PUBLIC_API_URL`, (2) list the exact backend changes needed in the web repo for bearer-token auth so I can apply them there, then (3) scaffold Phase 1 only.
