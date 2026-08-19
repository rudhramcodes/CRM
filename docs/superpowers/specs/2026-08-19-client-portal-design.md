# Client Portal & Onboarding — Design Spec

**Date:** 2026-08-19
**Status:** Approved design (awaiting implementation plan)
**Scope:** Client login, onboarding + how-to guide, per-client project visibility (milestones/tasks), project chat + comments, client meetings. Invoices/payments explicitly out of scope for this phase.

---

## 1. Goals

1. Give every client a secure portal login with **first-login onboarding** (welcome + how-it-works guide).
2. Clients see **only their own projects** — milestones, tasks (read-only), with **commenting** on tasks and a **per-project chat** with the team.
3. Clients can **view and create meetings**, and staff can **invite clients** to meetings.
4. Portal is **venture-branded** (per-client `brand` theme).
5. Zero data leakage: server-enforced scoping, not just UI hiding.

## 2. Current State (verified)

| Area | State |
|---|---|
| `ROLES.CLIENT` | ✅ Already in `server/src/constants/index.js` with permissions (`projects:read`, `tasks:read`, `invoices:read`, `payments:read`, `meetings:read`) |
| `Project` model | ✅ `client: ObjectId ref 'Client'` (required); milestones/tasks embedded; `messages` chat embedded (text + images, `createdBy` ref User) |
| `Meeting` model | ✅ `client` ref + `attendees: [User]` + `createdBy`; emails already sent to linked client's email |
| `Task` model | ✅ `comments` embedded (`createdBy` ref User) |
| Auth stack | ✅ JWT (httpOnly cookies) + `verifyToken` + `authorize(...roles)`; login, forgot/reset password, email verify, refresh tokens |
| `Client` model | ❌ No `user` link, no password/auth fields — portal account must be added |
| Task read routes | 🔴 `GET /api/tasks`, `GET /api/tasks/:id` have **no role check** (only `verifyToken`) — security gap to close when client Users exist |
| Frontend | Tailwind v4 CSS-variable theme (`--color-primary-*` in `client/src/index.css`); `ProtectedRoute` (role-aware); `useAuth.login` hard-redirects to `/dashboard` |

## 3. Architecture

**Core mechanism:** each client gets a `User` document with `role: 'client'`; the `Client` document gets a `user` reference back to it. Every client-scoped API call resolves `req.user → Client` and filters data by that Client's `_id`.

```
STAFF APP (/dashboard, unchanged)          CLIENT PORTAL (/portal/*, new)
─────────────────────────────              ─────────────────────────────
Client detail → "Send Portal               Login → Onboarding (first time)
Invite" → creates User(role=client)              → Dashboard / Projects / Meetings
→ email set-password link                       / Guide / Profile
Meeting form → link client (exists)             All reads scoped by linked Client
→ client sees it in portal
```

**Why User-per-client:** reuses the entire existing auth system (login, tokens, refresh, password reset, email verification, `verifyToken`/`authorize` middleware, notifications, sockets). A client is just another "User" everywhere — comments, meeting attendees, notification recipients. The alternative (embedding credentials on the `Client` model) would duplicate the whole auth stack.

## 4. Data Model Changes

| Model | Change | Notes |
|---|---|---|
| `Client` (`server/src/modules/clients/client.model.js`) | + `user: { type: ObjectId, ref: 'User', default: null }` (sparse unique index), + `portalInviteToken: String`, + `portalInviteExpires: Date` | Backward compatible; existing clients get no portal until invited |
| `User` (`server/src/modules/auth/auth.model.js`) | + `onboardingCompleted: { type: Boolean, default: false }` | Role enum already includes `client` — no change there |
| `Project` | none | `client` ref + `messages` already sufficient |
| `Task` | none | `comments` already sufficient |
| `Meeting` | none | `client` ref + `createdBy` already sufficient |

## 5. Backend — API Design

### 5.1 Invite flow (staff-initiated)

| Endpoint | Roles | Behavior |
|---|---|---|
| `POST /api/clients/:id/invite` | super_admin, admin, manager | Creates `User` (`role: 'client'`, email = client.email, name = contactPerson, random unused password), links `Client.user`, sets `portalInviteToken` (random, hashed like existing reset tokens) + 7-day expiry, emails **set-password link** (`/portal/accept-invite?token=…`). Re-send regenerates token. 409 if portal user already exists and is active. |
| `POST /api/auth/client/accept-invite` | public (token-gated) | `{ token, password }` → validates token + expiry, sets password, `isEmailVerified = true`, `isActive = true`, clears invite token. Reuses `validatePasswordAgainstPolicy` from settings service. |

Plumbing: invite logic lives in the clients module (`client.service.js`) but reuses `User` model + email service. Rate-limit both endpoints (15 min / 10 attempts, matching `auth.routes.js` pattern).

### 5.2 Client profile

| Endpoint | Roles | Behavior |
|---|---|---|
| `GET /api/clients/me` | client | Returns linked `Client` doc (populated companyName, brand, contactPerson, email, phone) + portal stats: project count by status, upcoming meeting count. 404 if no linked Client. |

### 5.3 Client-scoped project reads + chat (modify existing routes)

Add `ROLES.CLIENT` to the existing `authorize(...)` list AND enforce ownership in the service for:

| Endpoint | Behavior for client role |
|---|---|
| `GET /api/projects` | Only `project.client = req.clientProfile._id` |
| `GET /api/projects/:id` | 404/403 unless `project.client` matches |
| `GET /api/projects/:id/messages` | Scoped same as project read |
| `POST /api/projects/:id/messages` | **Per-project chat** — client posts text + images (existing multer upload, 5 images). `createdBy` = client's User id |
| `GET /api/projects/:id/activities` | Scoped same as project read (activity feed) |
| `GET /api/tasks/:id` | Only if the task's `project` belongs to the client |
| `POST /api/tasks/:id/comments` | Client comments on tasks of their projects |
| `DELETE /api/tasks/:id/comments/:commentId` | Client may delete **only own** comments |

`POST /:id/messages` and task-comment routes also get **ownership checks** for client role (comment only where `project.client` matches).

### 5.4 Client-scoped meetings (modify existing routes)

| Endpoint | Behavior for client role |
|---|---|
| `GET /api/meetings` | `meeting.client = clientProfile._id` **OR** client's User id in `meeting.attendees` |
| `GET /api/meetings/:id` | Ownership check as above |
| `POST /api/meetings` | Client can create: server forces `client = own Client`, `createdBy = own User`, attendees restricted to **staff users only** (client picks from `GET /api/users` staff list). Zoho link generation unchanged. Conflict detection unchanged. |
| `DELETE /api/meetings/:id` | Client may cancel **only meetings where `createdBy` = their own User id** |

`GET /api/users/portal-staff` — new route in `users.routes.js`, registered **before** `/:id` (same pattern as the existing `/stats` route). Authorized for `ROLES.CLIENT`; returns active staff (`role in [super_admin, admin, manager, employee]`, `isActive: true`) as lean `{_id, name, email, avatar}` only. Existing `GET /api/users` stays staff-only.

### 5.5 🔴 Security fix (must ship with this phase)

`GET /api/tasks` and `GET /api/tasks/:id` (and the other un-guarded task routes: `/watching`, `/subtasks`, `/dependencies`, time entries) currently have only `verifyToken`. Once client Users exist they'd read every task. Fix: make task read routes role-aware — staff roles see all (existing behavior), `client` role is scoped to tasks whose `project.client` matches the linked Client, and client role is blocked from mutation routes not explicitly listed above (they already exclude client via `authorize`, verified).

### 5.6 Client-scoping middleware

New middleware `attachClientProfile` (e.g. `server/src/middleware/clientPortal.js`):
1. Rejects if `req.user.role !== 'client'`.
2. Loads `Client.findOne({ user: req.user._id, status: 'active' })`.
3. Attaches `req.clientProfile`; 403 if missing/inactive.
Used on portal-facing routes before controllers, with the service doing the per-resource ownership checks.

### 5.7 Onboarding completion

| Endpoint | Roles | Behavior |
|---|---|---|
| `POST /api/auth/complete-onboarding` | client (verifyToken) | Sets `user.onboardingCompleted = true`. Called by the wizard's final step. |
| `GET /api/auth/me` | client | Already returns `req.user`; for client role, additionally include the linked `Client` id + `onboardingCompleted` so the portal can gate onboarding and fetch `clients/me`.

## 6. Frontend — Client Portal

### 6.1 Routes (`client/src/routes/index.jsx` + new files)

```
/portal/login              → client login (branded, reuses auth system)
/portal/accept-invite      → set-password from email link (?token=…)
/portal/onboarding         → 3-step wizard, forced on first login
/portal                    → ClientPortalLayout (ProtectedRoute: role=client)
  ├── dashboard            → project cards, upcoming meetings, recent chat activity
  ├── projects             → their projects only
  ├── projects/:id         → info, milestones timeline (read-only), tasks (read-only
  │                           + comments), per-project chat panel
  ├── meetings             → their meetings + "New Meeting" (staff attendee picker)
  ├── meetings/:id         → details, Zoho join link, cancel (if createdBy self)
  ├── guide                → "How to Use" (always accessible)
  └── profile              → contact info, change password
```

### 6.2 Auth guards & redirect

- `ProtectedRoute`: role-aware — staff routes reject `client` (already via `requiredRoles`); new portal wrapper rejects non-client roles.
- `useAuth.login` (and `authSlice`): after successful login, redirect `role === 'client' ? /portal : /dashboard`.
- `ClientPortalLayout`: if `user.role === 'client' && !user.onboardingCompleted` → redirect `/portal/onboarding`. After wizard completes, `POST /api/auth/complete-onboarding` sets the flag (new tiny endpoint, or fold into an existing profile update — endpoint added to auth routes).
- `GET /api/auth/me` response already includes `req.user`; ensure `onboardingCompleted` and the linked client id surface on the client's `user` object (populate `Client.user` → include `clientId` in the `me` payload for the client role).

### 6.3 Onboarding wizard (3 steps)

1. **Welcome** — "Welcome to {Venture} portal" + what they can do here.
2. **How it works** — visual cards: Projects → Milestones → Tasks → Chat → Meetings (same content as Guide page, data-driven from one content file).
3. **All set** — profile confirm + "Start exploring" → `onboardingCompleted = true`.

Skippable (a "Skip for now" link advances to the portal; flag stays false until step 3 or explicit completion). The **Guide page** shows the same content anytime + FAQs.

### 6.4 API services

Extend existing RTK Query services (`clientApi`, `projectApi`, `taskApi`, `meetingApi`, `authSlice`):
- `clientApi`: `useGetClientMeQuery`, invite mutation (staff side, in client detail)
- `projectApi`: reuse `getProjectMessages`, `addProjectMessage` for chat (already exist)
- `taskApi`: reuse comment mutations (already exist)
- `meetingApi`: reuse create/list/detail + add cancel flow for client (already exists)
- `authSlice`: `acceptInvite`, `completeOnboarding` thunks

## 7. Venture Branding

**Mechanism:** `BRAND_THEMES` config (new `client/src/constants/brandThemes.js`) maps brand → CSS variable overrides. ClientPortalLayout root sets `data-brand={client.brand}`; CSS (portal section of `index.css`) overrides `--color-primary-*` + accent variables scoped to `[data-brand='…']`. Because Tailwind v4 utilities compile to `var(--color-primary-*)`, **all existing components re-theme automatically**. Staff app untouched (variables scoped under portal root).

| Brand | Primary | Accent 1 | Accent 2 | Status |
|---|---|---|---|---|
| `aghori` | `#002e62` | `#e73228` | `#ffe400` | confirmed |
| `panigrahna` | `#B37839` | `#FBF4EC` | `#F7EAD8` | confirmed |
| `house_of_joggi` | `#3E2723` | `#B8860B` | `#FBF6EF` | proposed* |
| `damrru` | `#C1440E` | `#FFD54F` | `#FFF8E7` | proposed* |
| `tandavs` | `#1A1A2E` | `#E94560` | `#0F3460` | proposed* |
| `kapaalik` | `#2D1B2E` | `#C84B31` | `#F2E8E6` | proposed* |
| `kalyannam` | `#1F6B4E` | `#D4A017` | `#F4F9F6` | proposed* |
| `storage_media_solution` | `#0B4F6C` | `#21A0A0` | `#F0F7F9` | proposed* |

\* Proposed palettes — single-file swap in `brandThemes.js` when official hex codes arrive. Each theme also carries `portalName` (display name) and optional `logoEmoji`/tagline used by the wizard + guide.

## 8. Notifications & Emails

- **Invite email** (new template in `server/src/services/emailService.js`) — set-password link, 7-day expiry, brand display name.
- **Chat notifications** — client posts in project chat → notify project `teamMembers` + `createdBy` staff; staff post → notify linked client. Reuses `notificationService.buildNotification` + `createAndSendBulk` + sockets (`server/src/sockets/notificationSocket.js`).
- **Meeting notifications** — unchanged; recipient-based so client Users receive in-app + email reminders automatically (`meetingReminder.job.js`).

## 9. Security Checklist

- [ ] Client role excluded from all staff routes (existing `authorize` lists — verified, keep them).
- [ ] 🔴 Task read routes closed for client scope (5.5).
- [ ] Every client read/comment/meeting action passes ownership check via `req.clientProfile` (403 otherwise).
- [ ] Client cannot: create/edit projects, milestones, tasks, invoices, payments, users, or meetings of other clients.
- [ ] Client deletes only own comments; cancels only own meetings.
- [ ] `attachClientProfile` rejects inactive/missing linked Client.
- [ ] Rate limits on invite + accept-invite endpoints.
- [ ] `Client.user` sparse-unique index prevents double portal accounts.

## 10. Out of Scope (this phase)

- Invoices & payments in the portal (permissions already defined — future phase).
- Client self-registration (portal accounts created by staff invite only).
- Portal notifications settings UI / email preferences.
- Mobile app.

## 11. Implementation Phases

1. **Backend core** — `Client.user` + invite fields, invite/accept endpoints, `attachClientProfile` middleware, task-read scoping fix, `clients/me`, `complete-onboarding`.
2. **Backend APIs** — scoped projects/messages/activities, scoped task comments, scoped meetings + client create/cancel, staff-picker endpoint.
3. **Frontend shell** — portal routes, `ClientPortalLayout`, role-aware guards, login redirect, `brandThemes.js` + `data-brand` theming.
4. **Onboarding + Guide** — wizard, guide page, content data file, `complete-onboarding` wiring.
5. **Portal pages** — dashboard, projects (chat + comments), meetings (list/form/detail/cancel).
6. **Notifications & polish** — invite email, chat notifications, empty states, responsive QA, security regression pass.

## 12. Testing

- **Backend:** unit tests for `attachClientProfile` + ownership checks; route tests: client sees only own projects/meetings/tasks, 403/404 on others' resources, delete-own-only rules, task-read scoping, invite/accept token expiry.
- **Frontend:** portal route guards (staff blocked, client blocked from staff routes), onboarding gate + skip, brand theming smoke test, chat + comment flows.
- **Manual QA:** full journey — admin invites client → email → set password → onboarding → view projects → comment/chat → create meeting → cancel own meeting → staff meeting invite appears in portal.
