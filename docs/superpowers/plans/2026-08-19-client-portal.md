# Client Portal & Onboarding — Implementation Plan

**Date:** 2026-08-19
**Status:** Ready for execution
**Spec:** `docs/superpowers/specs/2026-08-19-client-portal-design.md` (approved, commit `ade2d0c`)
**Execution note:** Execute task-by-task in order. Each task = one atomic change with its own verification. No agents available — the implementer (main session agent) performs every task directly. Tick `[x]` next to a task only after its verification passes. Never move to a task while the previous one is failing.

---

## Global Constraints

1. **Layering:** Routes → Controller → Service → Repository → Model. No DB queries in controllers; no business logic in repositories. Follow the exact style of the existing module files (JSDoc comments, `ApiResponse`/`ApiError` from `server/src/utils/`, logger usage).
2. **Auth:** Every portal-facing route requires `verifyToken`; role checks via `authorize(...ROLES)` from `server/src/middleware/auth.js`. Client scoping middleware must run AFTER `verifyToken`+`authorize` and BEFORE the controller.
3. **Validation:** All inputs validated with zod schemas via `validate()` / `validateQuery()` from `server/src/middleware/validate.js`. No `as any`, no `@ts-ignore` (none used in this JS codebase — keep it plain CommonJS like the rest).
4. **Error semantics:** Ownership failures for client role → `403 Forbidden` (`ApiError(403, ...)`); missing resource → `404 Not Found`; token expired → `400` with clear message; duplicate active portal user → `409 Conflict`.
5. **Backward compatibility:** Staff behavior MUST NOT change. All new client behavior is additive. Existing clients with `user: null` are untouched.
6. **Password policy:** Reuse `validatePasswordAgainstPolicy` + `SECURITY_DEFAULTS` from `server/src/modules/settings/settings.service.js` (as `auth.service.js` already does for reset-password).
7. **Tokens:** Invite token = `crypto.randomBytes(32).toString('hex')`, stored as `crypto.createHash('sha256').update(token).digest('hex')` — identical to the existing email-verification / reset-password pattern.
8. **Rate limiting:** Both new auth-adjacent endpoints use `authLimiter` (15 min / 10 attempts) from `server/src/middleware/rateLimiter.js`. The invite endpoint gets its own `portalInviteLimiter` with the same config.
9. **Email:** New templates go in `server/src/services/emailService.js`; links use `config.clientUrl` (`CLIENT_URL || 'http://localhost:5173'`).
10. **Frontend:** Tailwind v4 utilities (`bg-primary-600`, `text-primary-900`, etc.) compile to `var(--color-primary-*)` — theming overrides only need CSS variables under `[data-brand='…']`. Reuse existing RTK Query endpoints where they already exist; add only what's missing. No new runtime dependencies.
11. **Tests:** `node --test` for pure helper logic (middleware + theme map). No DB test harness exists — API behavior verified with curl + build + manual flows.
12. **Scope boundary:** Invoices/payments/self-registration/mobile are OUT of scope (spec §10). Do not touch invoice/payment code.

---

## File Map

### New files (backend)
| File | Purpose |
|---|---|
| `server/src/middleware/clientPortal.js` | `createAttachClientProfile` factory + `attachClientProfile` export |
| `server/test/clientPortal.test.js` | `node --test` unit tests for the middleware |
| `server/test/brandThemes.test.js` | `node --test` validation of the brand theme map (T14) |

### Modified files (backend)
| File | Change |
|---|---|
| `server/src/modules/clients/client.model.js` | + `user`, `portalInviteToken`, `portalInviteExpires`, sparse-unique index |
| `server/src/modules/clients/client.repository.js` | + `findOneByUser`, `findOneByPortalInviteToken` |
| `server/src/modules/clients/client.service.js` | + `sendPortalInvite`, `getMyProfile` |
| `server/src/modules/clients/client.controller.js` | + `invite`, `getMyProfile` handlers |
| `server/src/modules/clients/client.routes.js` | + `POST /:id/invite`, `GET /me` (before `/:id`), `portalInviteLimiter` |
| `server/src/modules/auth/auth.model.js` | + `onboardingCompleted` |
| `server/src/modules/auth/auth.service.js` | + `acceptClientInvite`, `completeOnboarding` |
| `server/src/modules/auth/auth.controller.js` | + handlers; `getMe` adds `clientId` for client role |
| `server/src/modules/auth/auth.routes.js` | + `POST /client/accept-invite`, `POST /complete-onboarding` |
| `server/src/modules/auth/auth.validation.js` | + `acceptClientInviteSchema` |
| `server/src/modules/tasks/task.routes.js` | Scoped task reads (+CLIENT + attachClientProfile), comments for client |
| `server/src/modules/tasks/task.service.js` | Ownership checks for client role (list/detail/comments) |
| `server/src/modules/tasks/task.repository.js` | `findAll` accepts `client` scope filter |
| `server/src/modules/projects/project.routes.js` | Scoped project reads/messages (+CLIENT + attachClientProfile) |
| `server/src/modules/projects/project.service.js` | Ownership checks for client role (list/detail/messages) |
| `server/src/modules/projects/project.repository.js` | `findAll` accepts `client` scope filter |
| `server/src/modules/users/users.routes.js` | + `GET /portal-staff` BEFORE `/:id` |
| `server/src/modules/users/users.controller.js` | + `getPortalStaff` handler |
| `server/src/modules/users/users.service.js` | + `getPortalStaff` |
| `server/src/modules/meetings/meeting.routes.js` | Scoped reads + client create/cancel |
| `server/src/modules/meetings/meeting.service.js` | Access checks + client create/cancel logic |
| `server/src/modules/meetings/meeting.repository.js` | `findAll` access-filter merge |
| `server/src/services/emailService.js` | + `sendPortalInviteEmail` + `BRAND_PORTAL_NAMES` |
| `server/src/modules/notifications/notification.constants.js` | + `project_chat` template |

### New files (frontend)
| File | Purpose |
|---|---|
| `client/src/constants/brandThemes.js` | `BRAND_THEMES` + `getBrandTheme()` |
| `client/src/layouts/ClientPortalLayout.jsx` | Portal shell: `data-brand`, onboarding gate, `<Outlet/>` |
| `client/src/layouts/ClientSidebar.jsx` | Portal nav |
| `client/src/layouts/ClientAuthLayout.jsx` | Branded auth shell (login/accept-invite) |
| `client/src/modules/portal/pages/ClientPortalLogin.jsx` | Portal login |
| `client/src/modules/portal/pages/AcceptInvite.jsx` | Set-password from email link |
| `client/src/modules/portal/pages/OnboardingWizard.jsx` | 3-step wizard |
| `client/src/modules/portal/pages/PortalGuide.jsx` | How-to-use + FAQs |
| `client/src/modules/portal/pages/PortalProfile.jsx` | Contact info + change password |
| `client/src/modules/portal/pages/ClientDashboard.jsx` | Dashboard |
| `client/src/modules/portal/pages/PortalProjects.jsx` | Project list |
| `client/src/modules/portal/pages/PortalProjectDetail.jsx` | Milestones/tasks/comments/chat |
| `client/src/modules/portal/pages/PortalMeetings.jsx` | Meeting list |
| `client/src/modules/portal/pages/PortalMeetingDetail.jsx` | Meeting detail + cancel |
| `client/src/modules/portal/pages/PortalMeetingNew.jsx` | Create meeting (staff picker) |
| `client/src/modules/portal/data/onboardingContent.js` | Shared wizard+guide content |

### Modified files (frontend)
| File | Change |
|---|---|
| `client/src/index.css` | `[data-brand='…']` variable overrides (portal section) |
| `client/src/routes/index.jsx` | `/portal` route tree |
| `client/src/routes/ProtectedRoute.jsx` | Client-aware login redirect |
| `client/src/hooks/useAuth.js` | Role-based post-login redirect |
| `client/src/services/api.js` | Client-aware 401 redirect |
| `client/src/services/clientApi.js` | + `getClientMe`, `inviteClient` |
| `client/src/services/userApi.js` | + `getPortalStaff` |
| `client/src/app/store/authSlice.js` | + `acceptInvite`, `completeOnboarding`, `changePassword` thunks |
| `client/src/modules/clients/pages/ClientDetail.jsx` | + Send Portal Invite button + portal badge |

---

## Phase 1 — Backend core: portal account + invite + scoping middleware

### Task 1 — Client model + repository: portal fields

**Files:** `server/src/modules/clients/client.model.js`, `server/src/modules/clients/client.repository.js`

**Do:**
1. In `client.model.js` add three fields to the schema:
   - `user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }`
   - `portalInviteToken: { type: String, select: false, default: null }`
   - `portalInviteExpires: { type: Date, select: false, default: null }`
2. Add index: `clientSchema.index({ user: 1 }, { unique: true, sparse: true })` (mirror the exact style used for the other index declarations in the file).
3. In `client.repository.js` add:
   - `findOneByUser(userId)` → `Model.findOne({ user: userId })` (no populate)
   - `findOneByPortalInviteToken(token)` → `Model.findOne({ portalInviteToken: token })` — note: since `portalInviteToken` has `select: false`, use `.select('+portalInviteToken +portalInviteExpires')` so the stored hash is readable for comparison.
4. Do NOT touch existing CRUD methods.

**Expected result:** `client.model.js` exports a schema with the 3 new fields + sparse-unique index; repository exposes the 2 new finders. Server still boots (`npm run dev` or `node -e "require('./src/app')"` from `server/`).

**Verify:**
- `cd server && node -e "const m=require('./src/modules/clients/client.model'); console.log(Object.keys(m.schema.paths).filter(k=>['user','portalInviteToken','portalInviteExpires'].includes(k)))"` prints the 3 names.
- `node -e "require('./src/app')"` exits without error.

---

### Task 2 — User model: onboarding flag

**Files:** `server/src/modules/auth/auth.model.js`

**Do:**
1. Add `onboardingCompleted: { type: Boolean, default: false }` to the user schema (plain field, no select:false — the portal needs it in the `me` payload).
2. Confirm role enum already includes `client` (it does per spec §2) — no change there.

**Expected result:** New User documents default `onboardingCompleted: false`; existing documents get `false` when read (Mongoose default applies on read for missing paths).

**Verify:** `cd server && node -e "const m=require('./src/modules/auth/auth.model'); console.log(m.schema.paths.onboardingCompleted)"` shows Boolean default false.

---

### Task 3 — `attachClientProfile` middleware + unit test

**Files:** NEW `server/src/middleware/clientPortal.js`, NEW `server/test/clientPortal.test.js`

**Do:**
1. Create `server/src/middleware/clientPortal.js`:
   - `createAttachClientProfile(clientModel = null)` factory that returns an async middleware; if `clientModel` is null, `require('../modules/clients/client.model')` lazily (avoids circular deps at load time).
   - Middleware logic:
     - If `req.user.role !== 'client'` → `next()` (pass-through: this middleware is mounted on shared routes, staff must NOT be blocked).
     - Else `const client = await clientModel.findOne({ user: req.user._id, status: 'active' })` (status filter per spec §5.6).
     - If `!client` → `next(new ApiError(403, 'Client profile not found or inactive'))`.
     - Else `req.clientProfile = client; next()`.
   - Export `attachClientProfile = createAttachClientProfile()` as the default singleton (so routes can `require` it directly) AND export the factory.
2. Create `server/test/clientPortal.test.js` using `node:test` + `node:assert/strict`:
   - `createAttachClientProfile(fakeModel)` with a stub `findOne` — test 4 cases:
     a. staff role (`role: 'admin'`) → `next()` called, no clientProfile set, no findOne call.
     b. client role + active profile found → `req.clientProfile` set, `next()` called.
     c. client role + no profile → `next` receives an Error with `statusCode === 403`.
     d. client role + inactive profile → same 403.
   - Test file requires the middleware via relative path `../src/middleware/clientPortal`.

**Expected result:** `node --test test/clientPortal.test.js` from `server/` passes all 4 cases.

**Verify:** `cd server && node --test test/clientPortal.test.js` → `# pass 4` (or `tests 4 pass`), exit 0.

---

## Phase 1 (cont.) — Invite + accept flows

### Task 4 — `POST /api/clients/:id/invite` (staff) + invite email

**Files:** `server/src/modules/clients/client.routes.js`, `client.service.js`, `client.controller.js`, `server/src/services/emailService.js`, `server/src/middleware/rateLimiter.js` (only if a limiter export pattern exists to mirror)

**Do:**
1. `emailService.js`:
   - Add `BRAND_PORTAL_NAMES` map (keys = 8 brand strings from `server/src/constants/index.js`: `aghori`, `panigrahna`, `house_of_joggi`, `damrru`, `tandavs`, `kapaalik`, `kalyannam`, `storage_media_solution`; values = display names, e.g. `'Aghori'`, `'Panigrahna'`, `'House of Joggi'`, `'Damrru'`, `'Tandavs'`, `'Kapaalik'`, `'Kalyannam'`, `'Storage Media Solution'`).
   - Add `sendPortalInviteEmail({ to, inviteToken, brand })` → builds a `portalInviteEmailTemplate` (HTML string following the file's existing template style) with brand display name + link `${config.clientUrl}/portal/accept-invite?token=${inviteToken}` + 7-day expiry note; calls the existing `sendEmail` helper.
2. `client.service.js`:
   - Add `sendPortalInvite(clientId, user)`:
     - `const client = await clientRepository.findById(clientId)` (existing finder) — if missing → `ApiError(404, 'Client not found')`.
     - If `client.user` already set: load the User; if `isActive` → `ApiError(409, 'Portal account already active for this client')`; if inactive, allow re-invite (overwrite token).
     - If no `client.user`: create User doc via `User.create({ name: client.contactPerson, email: client.email, password: crypto.randomBytes(16).toString('hex') (hashed by pre-save hook as the auth module does — verify User model pre-save hashes; if it requires explicit hash, use the same bcrypt approach as `auth.service.js` register), role: ROLES.CLIENT, permissions: ROLE_PERMISSIONS[ROLES.CLIENT], isActive: false, isEmailVerified: false })`; set `client.user = newUser._id`.
     - Generate `inviteToken = crypto.randomBytes(32).toString('hex')`; store `client.portalInviteToken = sha256(inviteToken)`, `client.portalInviteExpires = Date.now() + 7*24*60*60*1000`; `await client.save()` (or repository update).
     - `await sendPortalInviteEmail({ to: client.email, inviteToken, brand: client.brand })`.
     - Return `{ clientId, email: client.email, expiresAt: client.portalInviteExpires }` (never return the raw token).
   - Import User model + ROLES/ROLE_PERMISSIONS from `server/src/constants/index.js`, `crypto`, and the email service.
3. `client.controller.js`: add `invite` handler → `clientService.sendPortalInvite(req.params.id, req.user)` → `ApiResponse(200, { message: 'Portal invite sent', data })`.
4. `client.routes.js`:
   - Add `portalInviteLimiter` (rateLimit 15 min / 10 attempts) — import the limiter helper if one is exported from `server/src/middleware/rateLimiter.js` and reuse its pattern; otherwise define inline exactly like `authLimiter`.
   - `router.post('/:id/invite', portalInviteLimiter, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), clientController.invite)`.
   - Keep ordering: `/me` and `/stats` static routes before `/:id`; `/:id/invite` may sit after `/:id` (Express matches `/me` first).

**Expected result:** Staff (super_admin/admin/manager) can invite a client; email renders with correct link; second invite for an active portal user → 409.

**Verify (curl, after starting server):**
- As admin: `POST /api/clients/<id>/invite` → `200 {"success":true,...}` and client doc has `user` set (check via mongosh or a quick `node -e` script).
- Repeat → `409` (if user isActive) or `200` regenerated token (if not yet accepted).
- As employee: `403`.

---

### Task 5 — `POST /api/auth/client/accept-invite` + `POST /api/auth/complete-onboarding`

**Files:** `server/src/modules/auth/auth.validation.js`, `auth.service.js`, `auth.controller.js`, `auth.routes.js`

**Do:**
1. `auth.validation.js`: add `acceptClientInviteSchema = z.object({ token: z.string().min(1), password: z.string().min(8) })` (match file's style; the settings password policy does the heavy lifting in service).
2. `auth.service.js`:
   - Add `acceptClientInvite({ token, password })`:
     - `const hashed = sha256(token)`; `const client = await clientRepository.findOneByPortalInviteToken(hashed)` (lazy-require clients repository).
     - If `!client` or `!client.portalInviteExpires || client.portalInviteExpires < new Date()` → `ApiError(400, 'Invite token is invalid or has expired')`.
     - Load `const user = await User.findById(client.user)`; if `!user` → `ApiError(400, 'Portal account not found — please contact support')`.
     - `await validatePasswordAgainstPolicy(password)` (same call signature used in the existing reset-password path — copy that exact call).
     - `user.password = password` (pre-save hook hashes — same as reset), `user.isEmailVerified = true`, `user.isActive = true`, `await user.save()`.
     - Clear invite: `client.portalInviteToken = null; client.portalInviteExpires = null; await client.save()` (repository update).
     - Return `{ user: pick(name, email, role) }` — or return the user doc; login continues via normal `login` endpoint afterwards.
   - Add `completeOnboarding(userId)` → `User.findByIdAndUpdate(userId, { onboardingCompleted: true }, { new: true })`.
3. `auth.controller.js`:
   - Add `acceptClientInvite` handler → `authService.acceptClientInvite(req.body)` → `ApiResponse(200, { message: 'Password set. You can now log in.' })`.
   - Add `completeOnboarding` handler → `authService.completeOnboarding(req.user._id)` → `ApiResponse(200, { message: 'Onboarding completed' })`.
   - In the existing `getMe` handler: for `req.user.role === 'client'`, additionally resolve `clientRepository.findOneByUser(req.user._id)` and include `clientId: client?._id ?? null` in the returned user object (do not break staff payload shape).
4. `auth.routes.js`:
   - `router.post('/client/accept-invite', authLimiter, validate(acceptClientInviteSchema), authController.acceptClientInvite)` (public route — no verifyToken, token itself is the credential).
   - `router.post('/complete-onboarding', verifyToken, authorize(ROLES.CLIENT), authController.completeOnboarding)`.
5. Confirm `getMe` route stays `GET /me` under the existing auth router.

**Expected result:** A client can complete their invite (set password), the token is consumed, then log in normally; onboarding flag flips via the new endpoint. `GET /api/auth/me` for a client includes `clientId` + `onboardingCompleted`.

**Verify (curl):**
- `POST /api/auth/client/accept-invite` with bad token → 400.
- With valid token + weak password → 400 (policy).
- With valid token + strong password → 200; second call with same token → 400.
- Login as the client → `GET /api/auth/me` shows `role: 'client'`, `onboardingCompleted: false`, `clientId` set.
- `POST /api/auth/complete-onboarding` (client) → 200; `GET /api/auth/me` → `onboardingCompleted: true`.
- `POST /api/auth/complete-onboarding` as staff → 403.---

### Task 6 — `GET /api/clients/me` (client profile + stats)

**Files:** `server/src/modules/clients/client.routes.js`, `client.service.js`, `client.controller.js`

**Do:**
1. `client.service.js` — add `getMyProfile(user, clientProfile)`:
   - `const client = await clientRepository.findById(clientProfile._id)` (existing finder populates nothing special — if it populates `createdBy` that's fine).
   - Compute stats with lazy dynamic imports (avoid hard module coupling; this is what the codebase does for cross-module reads):
     - `const Project = require('../projects/project.model')`; `Project.countDocuments({ client: client._id, status: 'active' })` and per-status counts via `Project.aggregate([{ $match: { client: client._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }])`.
     - `const Meeting = require('../meetings/meeting.model')`; `Meeting.countDocuments({ $or: [{ client: client._id }, { attendees: user._id }], status: 'scheduled', date: { $gte: new Date() } })`.
   - Return `{ client: pick(client, ['_id','companyName','contactPerson','email','phone','brand','status','address']), stats: { projectsByStatus: [{status, count}...], totalProjects, upcomingMeetings } }`.
2. `client.controller.js` — add `getMyProfile` handler → `clientService.getMyProfile(req.user, req.clientProfile)` → `ApiResponse(200, data)`.
3. `client.routes.js`:
   - `router.get('/me', verifyToken, authorize(ROLES.CLIENT), attachClientProfile, clientController.getMyProfile)` — MUST be registered BEFORE `router.get('/:id', ...)` (Express matches in order; `/me` would otherwise be captured as `:id`).
   - Import `attachClientProfile` from `../../middleware/clientPortal`.

**Expected result:** Client token → `GET /api/clients/me` returns their Client doc + stats. Client without linked/active Client → 403. Staff hitting `/api/clients/me` → 403 (authorize list only has CLIENT).

**Verify (curl):** as a logged-in client with a linked active Client → 200 with `data.client.companyName` + `data.stats`. As admin → 403.

---

### Task 7 — 🔴 Task read scoping fix (client sees only own projects' tasks) + client comments

**Files:** `server/src/modules/tasks/task.routes.js`, `task.service.js`, `task.repository.js`

**Do:**
1. `task.routes.js`:
   - Define once near the top:
     `const taskReadAuth = [authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.CLIENT), attachClientProfile];`
   - Apply `taskReadAuth` to: `GET /`, `GET /:id`, `GET /watching`, `GET /:id/subtasks`, `GET /:id/dependencies`.
   - Apply `authorize(staff 4 roles, CLIENT)` + `attachClientProfile` to `POST /:id/comments` and `DELETE /:id/comments/:commentId`.
   - Leave all mutation routes (POST/PATCH/DELETE on tasks, reorder, bulk, watch-toggle, time entries) EXACTLY as-is (staff-only `authorize(...)` already excludes client — verified).
2. `task.service.js`:
   - Add private helper `async assertClientTaskAccess(taskId, clientProfile)`:
     - `const task = await taskRepository.findById(taskId)` (existing finder).
     - If `!task` → return null (404 handled by caller) or throw 404.
     - `const Project = require('../projects/project.model'); const project = await Project.findById(task.project).select('client').lean();`
     - If `!project || String(project.client) !== String(clientProfile._id)` → `ApiError(403, 'Access denied to this task')`.
     - Return task.
   - `getTaskById(id, user, clientProfile)` — when `user.role === 'client'`: call helper; when staff: existing path unchanged. Update controller call to pass `req.clientProfile`.
   - `getAllTasks(query, options, user, clientProfile)` — when `user.role === 'client'`: inject `options.client = clientProfile._id` and let repository filter (Task 7 repo change below); when staff: unchanged. Update controller call.
   - `addComment(taskId, data, user, clientProfile)` — when `user.role === 'client'`: ownership helper first (client may only comment on own projects' tasks), then existing push (comment `createdBy: user._id` is already correct — the client's User id).
   - `removeComment(taskId, commentId, user, clientProfile)` — when `user.role === 'client'`: ownership helper first, then verify `String(comment.createdBy) === String(user._id)` → else `ApiError(403, 'You can only delete your own comments')`. Staff path unchanged.
   - Subtasks/dependencies/watching reads: apply the same ownership helper for client role (they are children of `/:id`).
3. `task.repository.js` — `findAll(query, options)`: after building the existing `filter` object, add `if (options.client) filter.project = { $in: await clientProjectIds(options.client) }` where `clientProjectIds` = `Project.find({ client: options.client }).select('_id').lean()` mapped to `_id` (lazy-require Project model). Only apply when `options.client` present — staff calls never pass it.
4. `task.controller.js` — thread `req.clientProfile` through: `list(req,res)` → `getAllTasks(req.query, pagination, req.user, req.clientProfile)`; `getById` → `getTaskById(id, req.user, req.clientProfile)`; `addComment`/`removeComment` pass `req.clientProfile`. Keep staff behavior byte-identical (clientProfile is undefined for staff → helpers no-op).

**Expected result:** Client role can list/detail/subtasks/dependencies/watching ONLY for tasks whose project has `client === req.clientProfile._id`. Comments: client can add + delete own only. All other task mutations still 403 for client. Staff behavior unchanged.

**Verify (curl, logged in as client):**
- `GET /api/tasks` returns only tasks from own projects (spot-check with a client owning 1 project containing 2 tasks, and another client's project with 3 tasks → exactly 2 returned).
- `GET /api/tasks/<task-of-other-client>` → 403; `GET /api/tasks/<own-task>` → 200.
- `POST /api/tasks/<own>/comments` → 201; `DELETE` own comment → 200; `DELETE` someone else's comment (created by staff) → 403.
- `PATCH /api/tasks/<own>` → 403.
- Staff `GET /api/tasks` still returns all (regression).

---

## Phase 2 — Backend APIs: scoped projects, chat, staff picker, meetings

### Task 8 — Project read scoping (list/detail/messages/activities)

**Files:** `server/src/modules/projects/project.routes.js`, `project.service.js`, `project.repository.js`

**Do:**
1. `project.routes.js`:
   - `const projectReadAuth = [authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.CLIENT), attachClientProfile];`
   - Apply to `GET /`, `GET /:id`, `GET /:id/messages`, `GET /:id/activities`.
   - Keep all write routes (`POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/messages`, `DELETE /:id/messages/:messageId`, `POST /:id/task`, etc.) staff-only as-is.
2. `project.repository.js` — `findAll(query, options)`: after building the existing filter, `if (options.client) filter.client = options.client`. (Project model already has `client` ref — no model change.)
3. `project.service.js`:
   - Add helper `assertClientProjectAccess(project, clientProfile)` → `String(project.client) === String(clientProfile._id)` else `ApiError(403, 'Access denied to this project')`.
   - `getAllProjects(query, options, user, clientProfile)`: client role → `options.client = clientProfile._id`; staff unchanged. Thread through controller.
   - `getProjectById(id, user, clientProfile)`: client role → fetch, run helper, else 404 semantics preserved for missing. Staff unchanged.
   - `getProjectMessages` / `getProjectActivities`: client role → fetch project first, run helper, then existing logic. Staff unchanged.
4. `project.controller.js` — thread `req.clientProfile` into the 4 read handlers; staff path identical.

**Expected result:** Client sees only own projects in list; 403 on others' detail/messages/activities. Staff regression-free.

**Verify (curl):** client `GET /api/projects` → own only; `GET /api/projects/<other>` → 403; `GET /api/projects/<own>/messages` → 200.

---

### Task 9 — Client posts to project chat (per-project messaging)

**Files:** `server/src/modules/projects/project.routes.js`, `project.service.js`, `project.controller.js`, `server/src/modules/notifications/notification.constants.js`

**Do:**
1. `project.routes.js` — change `POST /:id/messages` and `DELETE /:id/messages/:messageId` to `authorize(staff 4, ROLES.CLIENT)` + `attachClientProfile` (multer upload chain unchanged — client may send text + up to 5 images, existing uploader).
2. `project.service.js`:
   - `addMessage(projectId, data, user, clientProfile, files)` — client role: fetch project, run `assertClientProjectAccess`, then existing push with `createdBy: user._id`. Staff unchanged.
   - `deleteMessage(projectId, messageId, user, clientProfile)` — client role: access check + `String(message.createdBy) === String(user._id)` else 403. Staff unchanged (existing rules preserved).
   - Also block client from the `/task` command inside messages: in `addMessage`, if `user.role === 'client' && data.text starts with '/task'` → `ApiError(403, 'Clients cannot create tasks from chat')`.
3. `notification.constants.js` — add `project_chat` template entry matching the file's shape (e.g. `{ title: 'New message in {{projectName}}', body: '{{senderName}}: {{message}}', type: 'project_chat', priority: 'low' }` with `email: false, cliq: false` — mirror existing entries' flags).
4. `project.controller.js` — pass `req.clientProfile` into `addMessage`/`deleteMessage`.

**Expected result:** Client can post text+images to own projects' chat (appears with their User as author) and delete own messages; `/task` command rejected; staff flow unchanged.

**Verify (curl):** client `POST /api/projects/<own>/messages` `{text:'Hello'}` → 201 (or 200 per existing shape) and message appears in `GET .../messages`; `POST` with `text:'/task assign @x'` → 403; `DELETE` own message → 200; `DELETE` staff message → 403.

---

### Task 10 — `GET /api/users/portal-staff` (client staff picker)

**Files:** `server/src/modules/users/users.routes.js`, `users.controller.js`, `users.service.js`

**Do:**
1. `users.service.js` — add `getPortalStaff()`:
   - `User.find({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] }, isActive: true }).select('_id name email avatar role').lean().sort({ name: 1 })`.
2. `users.controller.js` — add `getPortalStaff` handler → `ApiResponse(200, { staff })`.
3. `users.routes.js`:
   - `router.get('/portal-staff', verifyToken, authorize(ROLES.CLIENT), usersController.getPortalStaff);`
   - **Must be registered before `router.get('/:id', ...)`** (currently at line ~30) — same pattern as the existing `/stats` route. Do NOT add to the staff list route.

**Expected result:** Client gets lean staff list for the meeting attendee picker; staff `GET /api/users` unchanged.

**Verify (curl):** client `GET /api/users/portal-staff` → array of `{_id,name,email,avatar,role}`; admin `GET /api/users/portal-staff` → 403; `GET /api/users/<id>` still works for staff.---

### Task 11 — Client-scoped meeting reads (list + detail)

**Files:** `server/src/modules/meetings/meeting.routes.js`, `meeting.service.js`, `meeting.repository.js`

**Do:**
1. `meeting.routes.js`:
   - `const meetingReadAuth = [authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.CLIENT), attachClientProfile];`
   - Apply to `GET /` and `GET /:id`. Keep notes/update/action-item routes staff-only as-is.
2. `meeting.repository.js` — `findAll(query, options)`: after building the existing filter, `if (options.accessFilter) Object.assign(filter, options.accessFilter)` (merge so client filter composes with existing search/status/date filters).
3. `meeting.service.js`:
   - `getMeetings(query, options, user, clientProfile)` — client role: `options.accessFilter = { $or: [{ client: clientProfile._id }, { attendees: user._id }] }`; staff unchanged. Thread through controller.
   - `getMeetingById(id, user, clientProfile)` — client role: fetch, then `if (!(String(m.client) === String(clientProfile._id) || m.attendees?.some(a => String(a) === String(user._id))))` → `ApiError(403, 'Access denied to this meeting')`. Staff unchanged.

**Expected result:** Client list = meetings linked to their Client OR where their User id is an attendee; detail enforced identically. Staff regression-free.

**Verify (curl):** client with client-linked + attended meetings sees both; `GET /api/meetings/<other-client-meeting>` → 403; staff list unchanged.

---

### Task 12 — Client creates a meeting (staff attendees, forced client scope)

**Files:** `server/src/modules/meetings/meeting.routes.js`, `meeting.service.js`

**Do:**
1. `meeting.routes.js` — change `POST /` to `authorize(staff 3, ROLES.CLIENT)` + `attachClientProfile` (validation unchanged).
2. `meeting.service.js` — extend `createMeeting(data, user, clientProfile)`:
   - Staff path: exactly as today (all fields, recurrence, lead link).
   - Client path (`user.role === 'client'`):
     - Force scope: `data.client = clientProfile._id` (ignore anything client sent), `data.lead = null`, strip recurrence fields (`recurrence`, `recurring` etc. — check model for the exact recurrence field names and null them).
     - Attendees: validate every id is a staff user: `const staff = await User.find({ _id: { $in: data.attendees }, role: { $in: STAFF_ROLES } })` (reuse the `STAFF_ROLES` array already in this file); if `staff.length !== unique(data.attendees).length` → `ApiError(400, 'Attendees must be staff members')`.
     - `createdBy: user._id` (already set by existing code).
     - Keep duration validation + conflict detection + Zoho link generation unchanged.
   - Controller threads `req.clientProfile`.

**Expected result:** Client creates meeting bound to own Client + themselves, staff-only attendees, no recurrence/lead. Staff create unchanged.

**Verify (curl):** client `POST /api/meetings` with valid body + 2 staff attendee ids → 201 with `client === own client id`, `createdBy === own user id`; with a non-staff attendee id → 400; with `lead: <id>` → ignored (client null). Staff `POST` still accepts lead/recurrence.

---

### Task 13 — Client cancels own meetings (DELETE)

**Files:** `server/src/modules/meetings/meeting.routes.js`, `meeting.service.js`, `meeting.controller.js`

**Do:**
1. `meeting.routes.js` — change `DELETE /:id` to `authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT)` + `attachClientProfile`.
2. `meeting.service.js` — extend `deleteMeeting(id, query, user, clientProfile)`:
   - Read `allSeries` from `query` (controller currently passes `req.query` — confirm and keep).
   - Client path (`user.role === 'client'`):
     - `const meeting = await meetingRepository.findById(id)`; if `!meeting` → 404.
     - `if (String(meeting.createdBy) !== String(user._id))` → `ApiError(403, 'You can only cancel meetings you created')`.
     - If `allSeries` truthy → `ApiError(403, 'Clients cannot cancel recurring series')` (or ignore + delete single — spec says block; block).
     - Delete single meeting (reuse existing delete path).
   - Staff path unchanged (super_admin/admin keep existing behavior incl. allSeries).
3. `meeting.controller.js` — pass `req.clientProfile` into `deleteMeeting`.

**Expected result:** Client deletes only own-created single meetings; others' meetings → 403; recurring-series cancel → 403. Staff unchanged.

**Verify (curl):** client `DELETE /api/meetings/<own>` → 200; `DELETE /api/meetings/<staff-created>` → 403; `DELETE /api/meetings/<own>?allSeries=true` → 403; admin delete still works.

---

## Phase 3 — Frontend shell: theming + portal routes + auth wiring

### Task 14 — `brandThemes.js` + `[data-brand]` CSS overrides + theme test

**Files:** NEW `client/src/constants/brandThemes.js`, `client/src/index.css`, NEW `server/test/brandThemes.test.js`

**Do:**
1. `client/src/constants/brandThemes.js`:
   - Export `BRAND_THEMES` object keyed by the 8 brand strings with `{ primary, accent1, accent2, portalName, tagline }` using the spec §7 table values (aghori `#002e62/#e73228/#ffe400`, panigrahna `#B37839/#FBF4EC/#F7EAD8`, house_of_joggi `#3E2723/#B8860B/#FBF6EF`, damrru `#C1440E/#FFD54F/#FFF8E7`, tandavs `#1A1A2E/#E94560/#0F3460`, kapaalik `#2D1B2E/#C84B31/#F2E8E6`, kalyannam `#1F6B4E/#D4A017/#F4F9F6`, storage_media_solution `#0B4F6C/#21A0A0/#F0F7F9`).
   - `portalName` display names (mirror `BRAND_PORTAL_NAMES` on the server) + short `tagline` per brand.
   - Export `getBrandTheme(brand)` → `BRAND_THEMES[brand] ?? BRAND_THEMES.aghori` (fallback).
2. `client/src/index.css` — append a portal section:
   - For each brand: `[data-brand='<key>'] { --color-primary-50..950 ramp generated from primary hex via color-mix, --color-accent-1: <accent1>, --color-accent-2: <accent2> }`.
   - Generate the primary ramp with `color-mix(in srgb, <primary> X%, white)` for 50–200 and `color-mix(in srgb, <primary> X%, black)` for 700–950; 500/600 = primary. Write the ramp explicitly (8 selectors × values), don't rely on runtime JS.
   - Add `--color-accent-1` / `--color-accent-2` tokens (don't exist today — verified) so portal components can use `bg-accent-1` after also adding them to the `@theme` block for the default (staff) case with neutral fallbacks.
3. `server/test/brandThemes.test.js` — `node --test`:
   - Parse `client/src/constants/brandThemes.js` via `require` (it's plain ESM/CJS — if the file uses `export default`, test by reading the file and regex-extracting brand keys; keep the constants file dependency-free so `require` works under CommonJS test, or write the file with `module.exports` + a `.js` that Vite handles fine — pick whichever matches how other `client/src/constants/*` files are authored and mirror it).
   - Assert: exactly the 8 brand keys; every theme has `primary`/`accent1`/`accent2`/`portalName`; all hex values match `/^#[0-9A-Fa-f]{6}$/`; `getBrandTheme('unknown')` returns aghori.

**Expected result:** `[data-brand='aghori']` subtree renders navy-primary buttons/cards; other brands re-theme; unknown brand falls back; test passes.

**Verify:** `cd server && node --test test/brandThemes.test.js` → pass. `cd client && npm run build` → succeeds. Manual: temporarily set `data-brand="damrru"` on the portal root and confirm primary color shifts.

---

### Task 15 — Portal route tree + `ClientPortalLayout` + `ClientSidebar`

**Files:** NEW `client/src/layouts/ClientPortalLayout.jsx`, `client/src/layouts/ClientSidebar.jsx`, `client/src/routes/index.jsx`, `client/src/routes/ProtectedRoute.jsx`

**Do:**
1. `ClientSidebar.jsx` — portal nav mirroring `Sidebar.jsx` structure but links: Dashboard `/portal`, Projects `/portal/projects`, Meetings `/portal/meetings`, Guide `/portal/guide`, Profile `/portal/profile`; brand mark at top (brand portalName + logoEmoji); logout button (reuse `useAuth.logout`); active state via `NavLink`.
2. `ClientPortalLayout.jsx`:
   - `const { user } = useAuth(); const { data: me } = useGetClientMeQuery(undefined, { skip: user?.role !== 'client' });`
   - Root div: `data-brand={me?.client?.brand ?? getBrandTheme(user?.brand ?? 'aghori')... }` — actually `data-brand={me?.client?.brand ?? 'aghori'}` (brand lives on the Client doc; fallback safe).
   - Onboarding gate: `if (user.role === 'client' && !user.onboardingCompleted && location.pathname !== '/portal/onboarding')` → `<Navigate to="/portal/onboarding" replace />`.
   - Layout: `flex` with `ClientSidebar` + main `<Outlet/>`; wrap in the same max-width/content paddings the staff `MainLayout` uses.
3. `routes/index.jsx` — add the `/portal` tree:
   - `/portal/login` → ClientAuthLayout > ClientPortalLogin (public).
   - `/portal/accept-invite` → standalone AcceptInvite (public, reads `?token=`).
   - `/portal` → ProtectedRoute(requiredRoles=['client']) > ClientPortalLayout:
     - index → ClientDashboard
     - `onboarding` → OnboardingWizard
     - `projects` → PortalProjects; `projects/:id` → PortalProjectDetail
     - `meetings` → PortalMeetings; `meetings/new` → PortalMeetingNew; `meetings/:id` → PortalMeetingDetail
     - `guide` → PortalGuide; `profile` → PortalProfile
   - Keep all existing staff routes untouched.
4. `ProtectedRoute.jsx` — ensure the existing `requiredRoles` guard already blocks `client` from staff routes (verify; it's role-aware per spec §2). If the unauthenticated redirect is hard-coded to `/auth/login`, make it role-aware: `user ? (user.role === 'client' ? '/portal' : '/dashboard')` — but for the portal tree the guard just checks role; adjust redirect target so a staff user hitting `/portal/*` bounces to `/dashboard` and a client hitting `/dashboard` bounces to `/portal` (implement via the existing `requiredRoles` mismatch → navigate to role home).

**Expected result:** `/portal/*` renders the branded shell; unauthenticated → `/portal/login`; staff blocked from `/portal/*`; client blocked from `/dashboard`; onboarding redirect fires when `onboardingCompleted` false.

**Verify:** `npm run build` (client) passes; manual: login as client → lands on `/portal/onboarding`; complete wizard → `/portal`; open `/dashboard` as client → redirected to `/portal`.

---

### Task 16 — Auth wiring: login redirect, `clients/me` API, 401 handling, authSlice thunks

**Files:** `client/src/hooks/useAuth.js`, `client/src/services/api.js`, `client/src/services/clientApi.js`, `client/src/services/userApi.js`, `client/src/app/store/authSlice.js`

**Do:**
1. `clientApi.js` — add endpoints (match existing file style):
   - `getClientMe: query: () => ({ url: '/clients/me' })`, `providesTags: ['ClientMe']`.
   - `inviteClient: mutation: (id) => ({ url: `/clients/${id}/invite`, method: 'POST' })`, `invalidatesTags: ['ClientMe']`.
   - Verify the base URL already prefixes `/api` (check `baseUrl` in `api.js`/clientApi — mirror existing `clientApi` endpoints).
2. `userApi.js` — add `getPortalStaff: query: () => ({ url: '/users/portal-staff' })`, `providesTags: ['PortalStaff']`.
3. `useAuth.js` — in `login()`: after successful auth, `const dest = user?.role === 'client' ? '/portal' : '/dashboard'` and `navigate(dest)` (currently hard-redirects to `/dashboard` — verified). If auth state is stored in Redux `authSlice` (user in `authSlice` state), read role from there.
4. `api.js` — 401 reauth redirect: currently redirects to `/auth/login` on refresh failure; make it client-aware: read `localStorage` user (`user.role === 'client' ? '/portal/login' : '/auth/login'`). Do not break the refresh loop.
5. `authSlice.js` — add thunks mirroring the file's existing pattern:
   - `acceptInvite({ token, password })` → `POST /auth/client/accept-invite`.
   - `completeOnboarding()` → `POST /auth/complete-onboarding`, then update `user.onboardingCompleted = true` in state (or re-fetch `getMe`).
   - `changePassword({ currentPassword, newPassword })` → `PUT /auth/password` (verify the existing password-change endpoint path in `authApi.js`/`auth.routes.js` first and reuse the same route — if it's in `authApi.js` already, add the thunk calling that).

**Expected result:** Client logs in → `/portal`; staff → `/dashboard`; 401 on expired session sends client to portal login; `useGetClientMeQuery` + `useGetPortalStaffQuery` work; thunks call the right endpoints.

**Verify:** `npm run build` (client). Manual: login as client → `/portal`; logout → 401 handling redirects correctly.---

### Task 17 — ClientPortalLogin + ClientAuthLayout + AcceptInvite

**Files:** NEW `client/src/modules/portal/pages/ClientPortalLogin.jsx`, NEW `client/src/layouts/ClientAuthLayout.jsx`, NEW `client/src/modules/portal/pages/AcceptInvite.jsx`

**Do:**
1. `ClientAuthLayout.jsx` — branded split/auth shell mirroring `AuthLayout.jsx` structure: brand panel (portalName + tagline from `getBrandTheme`, accent gradient), right side = `<Outlet/>`. Accept optional `brand` via route state or default aghori. Apply `data-brand` on the root so theme overrides apply.
2. `ClientPortalLogin.jsx` — form mirroring the staff `Login` page (`client/src/pages/auth/`): email + password, `useAuth.login` (role-aware redirect already handled), error display, loading state. Link "Trouble signing in?" → existing forgot-password flow (`/auth/forgot-password` — keep staff route, it's token-based email reset and works for clients).
3. `AcceptInvite.jsx` — reads `?token=` from `useSearchParams`; password + confirm fields with the same validation style as the staff reset-password page; on submit → `acceptInvite({ token, password })` thunk → success screen "Password set — go to login" → `navigate('/portal/login')`. Errors: expired/invalid token → message + "Contact your team" copy. Token missing → prompt to use the link from the email.
4. Wire both into the `/portal` route tree (Task 15 already declares the paths — implement the components and import them).

**Expected result:** Client opens `/portal/login` → branded login; uses set-password link → `/portal/accept-invite?token=…` → sets password → redirected to login → can sign in.

**Verify:** `npm run build` (client); manual end-to-end with a fresh invite.

---

## Phase 4 — Onboarding + Guide + Profile

### Task 18 — Onboarding wizard + content + completion wiring

**Files:** NEW `client/src/modules/portal/data/onboardingContent.js`, NEW `client/src/modules/portal/pages/OnboardingWizard.jsx`

**Do:**
1. `onboardingContent.js` — single source of truth for wizard + guide:
   - Export `ONBOARDING_STEPS` = 3 steps: `{ key: 'welcome' | 'how-it-works' | 'all-set', title, body }` with copy referencing brand (`{brandName}` placeholder or a `getBrandTheme(brand).portalName` at render).
   - Export `GUIDE_SECTIONS` = feature cards (Projects → Milestones → Tasks → Chat → Meetings) + `FAQS` array.
2. `OnboardingWizard.jsx`:
   - 3-step state machine (`step` index); brand header from `getBrandTheme(me?.client?.brand)`.
   - Step 1 Welcome: "Welcome to {portalName}" + what they can do.
   - Step 2 How it works: `GUIDE_SECTIONS` as visual cards.
   - Step 3 All set: profile confirm (companyName/contactPerson/email from `me.client`) + "Start exploring" → `completeOnboarding()` thunk → on success `navigate('/portal')` (layout gate now passes since `user.onboardingCompleted` true — ensure the thunk updates Redux user so the gate releases).
   - "Skip for now" link on steps 1–2 → `navigate('/portal')` WITHOUT completing (flag stays false → gate redirects back to onboarding on next nav — acceptable per spec §6.3; keep skip but the gate still forces wizard until completed).
   - Back/Next buttons, progress indicator.

**Expected result:** First login lands on wizard; step 3 flips `onboardingCompleted`; gate releases; skip navigates but gate returns until completed.

**Verify:** Manual: fresh client login → wizard → complete → portal; logout/login → straight to `/portal` (no wizard).

---

### Task 19 — PortalGuide + PortalProfile (change password)

**Files:** NEW `client/src/modules/portal/pages/PortalGuide.jsx`, NEW `client/src/modules/portal/pages/PortalProfile.jsx`

**Do:**
1. `PortalGuide.jsx` — renders `GUIDE_SECTIONS` + `FAQS` from `onboardingContent.js`; always accessible (no gate); styled with accent tokens.
2. `PortalProfile.jsx`:
   - Contact info card (read-only): companyName, contactPerson, email, phone, brand (from `useGetClientMeQuery`).
   - Change password form: current + new + confirm (staff `Profile`/settings page has this form — mirror its fields/validation); submit → `changePassword` thunk; success message; errors displayed.
   - Uses `useAuth` for the logged-in user name.

**Expected result:** Guide page renders content + FAQs; profile shows contact info and changes password successfully.

**Verify:** `npm run build` (client); manual password change → old password fails login, new works.

---

## Phase 5 — Portal pages

### Task 20 — ClientDashboard

**Files:** NEW `client/src/modules/portal/pages/ClientDashboard.jsx`

**Do:**
- `useGetClientMeQuery()` for stats (`projectsByStatus`, `totalProjects`, `upcomingMeetings`) + `me.client`.
- Cards: total projects, projects by status (mini breakdown), upcoming meetings count; recent projects list (first 4 by name, link to `/portal/projects/:id`); "New Meeting" CTA.
- Reuse `Card`/`Badge`/`Button`/`EmptyState` components (`client/src/components/ui/`).
- Empty state when no projects: "You don't have any projects yet" + Guide CTA.

**Expected result:** Dashboard shows client-scoped stats; empty state friendly.

**Verify:** `npm run build`; manual with a client that has projects vs one with none.

---

### Task 21 — PortalProjects + PortalProjectDetail (milestones/tasks/comments)

**Files:** NEW `client/src/modules/portal/pages/PortalProjects.jsx`, NEW `client/src/modules/portal/pages/PortalProjectDetail.jsx`

**Do:**
1. `PortalProjects.jsx`:
   - `useGetProjectsQuery()` (existing projectApi hook — verify the hook name in `projectApi.js`) → grid of project cards: name, status badge, client (own name), milestone progress summary.
   - EmptyState + loading skeletons like the staff list.
2. `PortalProjectDetail.jsx`:
   - `useGetProjectByIdQuery(id)` for project meta + milestones.
   - Milestones timeline: read-only vertical timeline (milestone name, due date, status dot).
   - Tasks section: `useGetTasksQuery({ project: id })` (existing taskApi hook — verify name) → read-only task list (title, status, priority, assignee); expandable task row → comments thread via `useGetTaskByIdQuery(taskId)` + `useAddTaskCommentMutation` + `useDeleteTaskCommentMutation` (verify exact hook names in `taskApi.js`).
   - No create/edit/delete affordances for tasks/milestones (read-only per spec).
   - Chat panel (Task 22) embedded as a tab or side panel.

**Expected result:** Client views milestones + tasks of own project; comments own tasks; no write affordances.

**Verify:** `npm run build`; manual read-only checks + comment add/delete.

---

### Task 22 — Per-project chat panel (client side)

**Files:** NEW `client/src/modules/portal/components/PortalChatPanel.jsx` (or inline in PortalProjectDetail)

**Do:**
- Reuse existing `projectApi` endpoints: `getProjectMessages`, `addProjectMessage` (verify exact hook names in `projectApi.js` — they exist per spec §6.4).
- Panel: message list (avatar, name, timeago, text), input + send, image attachments if the existing upload flow is simple to reuse (otherwise text-only for v1 — do NOT build a new uploader; if multer route requires FormData, mirror the staff chat component's upload usage).
- Delete own messages (only show delete on own messages; `deleteProjectMessage` hook if it exists, else skip deletion UI).
- Poll or invalidate on new message (mirror staff chat's refresh approach — RTK cache invalidation on `addProjectMessage`).

**Expected result:** Chat works inside portal project detail; messages from staff + client interleave correctly.

**Verify:** `npm run build`; manual staff↔client chat round-trip.

---

### Task 23 — PortalMeetings + PortalMeetingDetail + PortalMeetingNew

**Files:** NEW `client/src/modules/portal/pages/PortalMeetings.jsx`, `PortalMeetingDetail.jsx`, `PortalMeetingNew.jsx`

**Do:**
1. `PortalMeetings.jsx` — `useGetMeetingsQuery()` (existing meetingApi hook) → list of meeting cards (title, date/time, status badge, "Join" link when `meetingLink` present); "Schedule Meeting" button → `/portal/meetings/new`; EmptyState.
2. `PortalMeetingNew.jsx` — form mirroring staff `MeetingForm` fields but: no lead picker, no recurrence; attendees = multi-select from `useGetPortalStaffQuery` (`{_id,name,email}`) + optional notes + meeting link/location; submit `useCreateMeetingMutation` → success → `/portal/meetings`.
3. `PortalMeetingDetail.jsx` — `useGetMeetingByIdQuery(id)`; info card (date/time/location/status); join button (meetingLink, target _blank); notes display (read-only — client cannot edit notes per spec — verify notes route remains staff-only); Cancel button visible ONLY when `meeting.createdBy === user.id` → confirm → `useDeleteMeetingMutation` → back to list.

**Expected result:** Client lists/schedules/views/cancels own meetings; join links work; notes read-only.

**Verify:** `npm run build`; manual: create meeting with staff attendee → appears for staff too; cancel own → status change; no cancel button on staff-created.

---

## Phase 6 — Polish, security regression, ship

### Task 24 — ClientDetail: Send Portal Invite button + portal status badge

**Files:** `client/src/modules/clients/pages/ClientDetail.jsx`

**Do:**
- Add "Send Portal Invite" button (role-gated: super_admin/admin/manager) → `inviteClient(client.id)` mutation → success toast/alert "Invite sent to {email}".
- Show portal status: if `client.user` populated (verify ClientDetail query populates `user`; if not, extend the clientApi `getClientById` tags/populate or use invite response) — simplest: show badge "Portal: Invited/Active" only after invite success + on load if `client.user` exists (add `user` to the client detail response populate if trivial; otherwise track invite state locally).
- Handle 409 error message display ("Portal account already active").

**Expected result:** Staff invites clients from the detail page; 409 handled gracefully.

**Verify:** `npm run build`; manual invite from ClientDetail → email → accept flow (full journey).

---

### Task 25 — Empty states + responsive QA

**Files:** portal pages (Tasks 20–23) + `ClientSidebar.jsx` + `ClientPortalLayout.jsx`

**Do:**
- Audit every portal page for: loading skeleton, EmptyState (no projects/meetings/tasks/messages), error state (RTK error message).
- Responsive: sidebar collapses to top bar on mobile (mirror staff `Sidebar.jsx` behavior), grids go single-column, chat panel stacks.
- Accessibility: buttons have labels, focus states not removed, color contrast of accent tokens checked against white text (accent1 used for text on white must be dark enough; accent2 only for backgrounds/accents).

**Expected result:** Portal usable on mobile + desktop, no dead states.

**Verify:** Manual responsive pass in dev server (narrow viewport).

---

### Task 26 — Security regression + final builds

**Files:** none (verification pass)

**Do (curl regression, logged-in client token):**
1. `GET /api/clients/<other-id>` → 403 (authorize excludes client — verify).
2. `GET /api/tasks` → only own-project tasks (Task 7).
3. `GET /api/tasks/<other-project-task>` → 403.
4. `POST /api/tasks` → 403; `PATCH /api/tasks/<own>` → 403.
5. `GET /api/projects/<other>` → 403; `POST /api/projects` → 403.
6. `GET /api/projects/<other>/messages` → 403.
7. `GET /api/meetings/<other>` → 403; `DELETE` staff-created → 403.
8. `GET /api/users` → 403; `GET /api/users/portal-staff` → 200.
9. `GET /api/leads` → 403; `GET /api/invoices` → 403.
10. `POST /api/clients/:id/invite` twice → 200 then 409 (active).
11. `POST /api/auth/client/accept-invite` reused token → 400.
12. Invite + accept flow with expired token (set `portalInviteExpires` past) → 400.

Then:
- `cd server && npm run dev` boots clean (no model/index warnings).
- `cd client && npm run build` exits 0.
- `cd server && node --test test/` (clientPortal + brandThemes tests) all pass.

**Expected result:** All checks green; zero regressions on staff flows (spot-check admin login + leads list).

---

## Verification Summary (final checklist)

- [ ] `node --test` suites pass (clientPortal.test.js, brandThemes.test.js)
- [ ] Server boots with no warnings; staff regression spot-check OK
- [ ] Client `npm run build` exit 0
- [ ] Full journey manual: admin invites → client sets password → onboarding → dashboard/projects/chat/comments → create meeting (staff attendee) → staff sees it → client cancels own → staff-created meeting visible to client → security regression list all green
- [ ] No `as any`, no `@ts-ignore`, no TODO/FIXME left behind