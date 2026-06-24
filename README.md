# Rudhram CRM

Enterprise-grade CRM platform built with the MERN stack. Scalable, modular, and production-ready.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Redux Toolkit, RTK Query, React Router v7, React Hook Form, Zod, TanStack Table, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), JWT, Socket.io, Winston, Nodemailer, Zod |
| **Security** | Helmet, Rate Limiting, CORS, XSS Sanitization, Secure Cookies, bcrypt |
| **Storage** | ImageKit (file uploads) |
| **Deployment** | Vercel (frontend), AWS EC2 / Railway (backend), MongoDB Atlas |

---

## Project Structure

```
CRM/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── app/             # Redux store, slices
│       ├── components/      # Reusable UI components
│       │   ├── ui/          # Button, Input, Modal, Badge, etc.
│       │   ├── forms/       # FormInput, FormSelect, FormTextarea
│       │   ├── tables/      # DataTable (sortable, searchable, paginated)
│       │   ├── modals/      # Reusable modal components
│       │   └── shared/      # Shared feature components
│       ├── hooks/           # Custom React hooks
│       ├── layouts/         # MainLayout, AuthLayout, Sidebar, Header
│       ├── modules/         # Feature-based modules
│       │   ├── leads/       # Lead Management (✅ implemented)
│       │   ├── clients/     # Client Management (✅ implemented)
│       │   ├── projects/    # (Coming Soon)
│       │   ├── tasks/       # (Coming Soon)
│       │   ├── invoices/    # (Coming Soon)
│       │   ├── payments/    # (Coming Soon)
│       │   └── notifications/
│       ├── pages/           # Auth pages, Dashboard
│       ├── routes/          # Route configuration
│       ├── services/        # RTK Query API (leadApi, authApi, etc.)
│       ├── utils/           # cn(), formatters, validators
│       └── constants/       # Roles, statuses, nav items, sources
│
├── server/                  # Express.js backend
│   └── src/
│       ├── modules/         # Feature-based modules
│       │   ├── auth/        # Authentication (✅ implemented)
│       │   ├── users/       # User management (✅ implemented)
│       │   ├── leads/       # Lead Management (✅ implemented)
│       │   ├── clients/     # Client Management (✅ implemented)
│       │   ├── projects/    # (Coming Soon)
│       │   ├── tasks/       # (Coming Soon)
│       │   ├── invoices/    # (Coming Soon)
│       │   ├── payments/    # (Coming Soon)
│   │   ├── meetings/    # (✅ implemented)
│       │   ├── notifications/ # (Coming Soon)
│       │   ├── files/       # (Coming Soon)
│       │   ├── reports/     # (Coming Soon)
│       │   └── settings/    # (Coming Soon)
│       ├── config/          # DB, env configuration
│       ├── middleware/       # JWT auth, role authorize, Zod validate, error handler
│       ├── utils/           # ApiError, ApiResponse, logger, pagination
│       ├── constants/       # Roles, permissions, statuses
│       ├── services/        # Email service, file upload service
│       ├── sockets/         # Socket.io setup
│       ├── jobs/            # Cron jobs
│       ├── app.js           # Express app configuration
│       └── server.js        # Server entry point
│
├── system_architecture.md   # Architecture documentation
├── features.md              # Feature requirements
├── implementation_plan.md   # Development roadmap
└── README.md                # This file
```

---

## Implemented Features

> ✅ = Done &nbsp;|&nbsp; 🚧 = In Progress &nbsp;|&nbsp; ⬜ = Pending

### 🔐 Authentication System ✅

**Files:** `server/src/modules/auth/` + `client/src/pages/auth/`

**What it does:**
- User registration with email verification
- Login / Logout with JWT (Access Token: 15min, Refresh Token: 7 days)
- Secure HttpOnly cookies for token storage
- Forgot password / Reset password flow
- Email verification with resend option
- Email verification banner on dashboard

**How it works:**
1. User registers → verification email sent with token
2. User logs in → server sets `accessToken` + `refreshToken` cookies
3. Frontend stores user session in Redux + localStorage
4. RTK Query auto-refreshes token when 401 received
5. Protected routes redirect to login if unauthenticated

**Roles & Permissions:**
| Role | Access |
|---|---|
| Super Admin | Full access to everything |
| Admin | Users, Clients, Projects, Invoices, Payments, Reports |
| Manager | Clients, Projects, Tasks |
| Employee | Assigned tasks/projects only |
| Client | Own projects, files, invoices |

---

### 👥 User Management ✅

**Files:** `server/src/modules/users/` + `client/src/pages/auth/`

**What it does:**
- Create, list, update, delete users
- Assign roles and permissions
- Role-based permission auto-assignment
- User statistics by role

**How it works:**
- Each role has predefined permissions defined in `constants/index.js`
- When a user's role changes, their permissions are updated automatically
- Super Admin can manage all users; Admin can manage non-admin users
- Users can be activated/deactivated

---

### 📋 Lead Management ✅ *(Fully Implemented)*

**What it does:** End-to-end lead tracking system with sales pipeline management, search/filter, notes, and role-based access control.

- **Backend:** `server/src/modules/leads/` — 6 files (Model → Validation → Repository → Service → Controller → Routes)
- **Frontend:** `client/src/modules/leads/` — 5 components + 2 pages + 1 RTK Query service + route integration

---

#### 🔧 Backend Architecture: Layer-by-Layer

Each layer has a clear responsibility. Data flows through them in order:

```
HTTP Request
  → Routes (lead.routes.js)        — URL routing + auth guard + validation
    → Controller (lead.controller.js) — Parse request, call service, send response
      → Service (lead.service.js)      — Business logic (no DB knowledge)
        → Repository (lead.repository.js) — Database queries only
          → Model (lead.model.js)         — Mongoose schema + indexes
```

##### 1. Model — `lead.model.js`

Defines the MongoDB schema with all fields, validation rules, and indexes:

```javascript
{
  name:           String (required, 2-200 chars),
  email:          String (required, unique, lowercase),
  phone:          String (optional, regex validated),
  company:        String (optional),
  source:         String (enum: google_ads, referral, instagram, linkedin, website, email, call, other),
  status:         String (enum: new, contacted, meeting_scheduled, proposal_sent, won, lost),
  assignedTo:     ObjectId → ref: 'User',
  createdBy:      ObjectId → ref: 'User',
  convertedToClient: ObjectId → ref: 'Client' (nullable),
  followUpDate:   Date (nullable),
  notes: [{
    text:       String (required),
    createdBy:  ObjectId → ref: 'User' (populated with name, email, avatar, role),
    createdAt:  Date (auto)
  }]
}
```

**Indexes:** `phone`, `status`, `assignedTo`, `source`, `createdAt` (desc), text index on `name + email + company` for search.

##### 2. Validation — `lead.validation.js`

Zod schemas for all endpoints. Key validations:

| Schema | Key Rules |
|---|---|
| `createLeadSchema` | name: min 2 chars, email: valid email, phone: optional regex, source: enum, status: enum |
| `updateLeadSchema` | All fields optional, at least one required |
| `addNoteSchema` | text: min 1 char |
| `leadsQuerySchema` | search: optional, status/source/assignedTo: optional enum, page/limit: optional positive ints |

##### 3. Repository — `lead.repository.js`

Handles ALL database interactions. No business logic here:

- `create(data)` — Insert new lead
- `findById(id)` — Single lead with populated `assignedTo`, `notes.createdBy` (name, email, avatar, role), `createdBy`
- `findByEmail(email)` — Duplicate check
- `findAll(query, options)` — Paginated list with text search (`$regex` on name/email/company/phone), status filter, source filter, assignedTo filter. Populates `assignedTo`. Returns `{ leads, pagination }`.
- `updateById(id, data)` — Update with `runValidators: true`, returns populated doc
- `deleteById(id)` — Hard delete
- `countByStatus()` — Aggregate pipeline grouping by status for stats dashboard
- `countAll(filter)` — Total count for pagination metadata

##### 4. Service — `lead.service.js`

Business logic layer. Controllers call services, services call repositories:

| Function | Logic |
|---|---|
| `create(data, user)` | Checks duplicate email via repository, sets `createdBy` and `createdBy` from logged-in user, calls repository.create |
| `getAll(query, options)` | Delegates to repository.findAll |
| `getById(id)` | Delegates to repository.findById |
| `update(id, data, user)` | Delegates to repository.updateById |
| `remove(id)` | Delegates to repository.deleteById |
| `addNote(id, noteData, user)` | Pushes note with `createdBy: user._id` to the notes array |
| `getStats()` | Aggregates counts by status + total count |

##### 5. Controller — `lead.controller.js`

Thin layer — parses request, calls service, wraps response:

```
list(req, res)     → GET / → leadService.getAll(query, pagination) → ApiResponse
getById(req, res)  → GET /:id → leadService.getById(id) → ApiResponse
create(req, res)   → POST / → leadService.create(body, req.user) → ApiResponse.created
update(req, res)   → PATCH /:id → leadService.update(id, body, req.user) → ApiResponse
remove(req, res)   → DELETE /:id → leadService.remove(id) → ApiResponse
addNote(req, res)  → POST /:id/notes → leadService.addNote(id, body, req.user) → ApiResponse
stats(req, res)    → GET /stats → leadService.getStats() → ApiResponse
```

##### 6. Routes — `lead.routes.js`

All routes require `verifyToken` middleware. Role-based authorization per endpoint:

```
GET    /api/leads/stats    → super_admin, admin, manager
GET    /api/leads          → super_admin, admin, manager, employee
GET    /api/leads/:id      → super_admin, admin, manager, employee
POST   /api/leads          → super_admin, admin, manager
PATCH  /api/leads/:id      → super_admin, admin, manager
DELETE /api/leads/:id      → super_admin, admin
POST   /api/leads/:id/notes → super_admin, admin, manager
```

Input validation applied via `validate()` (body) and `validateQuery()` (query params) middleware using the Zod schemas.

---

#### 🎨 Frontend Architecture: Component Tree

```
Routes (/leads, /leads/new, /leads/:id)
  ├── [Route Guard] ProtectedRoute(requiredRoles) — blocks unauthorized roles at router level
  │
  ├── LeadList Page (/leads)
  │   ├── Header — Title + Table/Board toggle + "Add Lead" button (role-gated)
  │   ├── Stats Cards — Pipeline breakdown (hidden when empty)
  │   ├── LeadFilters — Search input + Status/Source shadcn Select dropdowns (debounced 300ms)
  │   ├── [Table View] LeadTable — DataTable with:
  │   │   ├── Columns: Name (avatar+company), Email, Source, Status (badge), Assigned To, Created
  │   │   ├── Actions: Edit icon → detail page | Delete icon → confirm → delete (role-gated)
  │   │   └── Row click → LeadDetail page
  │   └── [Board View] LeadKanbanBoard — Drag-and-drop pipeline with:
  │       ├── 6 Columns: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost
  │       ├── LeadKanbanCard — Draggable card (name, company, source, avatar)
  │       ├── Drop zone highlights when hovering over a column
  │       ├── DragOverlay — Floating card preview while dragging
  │       ├── Status count badge per column
  │       └── Drag end → calls onStatusChange → PATCH /leads/:id (status update)
  │
  ├── LeadForm Page (/leads/new) — Standalone create form
  │   ├── Back button (top-left) → navigates back to /leads
  │   ├── Fields: Name*, Email*, Phone, Company, Source, Status, Notes
  │   └── Validation: Zod schema via React Hook Form resolver
  │
  └── LeadDetail Page (/leads/:id)
      ├── Back button → /leads
      ├── Actions: Edit (modal) | Delete (confirm) — role-gated
      ├── Lead Info Card — Contact details, status badge, source
      └── Notes Section
          ├── Add Note input (super_admin/admin/manager only)
          └── Notes timeline (reverse chronological, author avatar + name + role + timeago)
```

**API Integration — `leadApi.js` (RTK Query)**

Uses `injectEndpoints` to add lead endpoints to the base API:

| Endpoint | Hook | Cache Tags |
|---|---|---|
| `GET /leads` | `useGetLeadsQuery(params)` | `'Lead'` |
| `GET /leads/stats` | `useGetLeadStatsQuery()` | `'LeadStats'` |
| `GET /leads/:id` | `useGetLeadByIdQuery(id)` | `'Lead'` |
| `POST /leads` | `useCreateLeadMutation()` | `'Lead'`, `'LeadStats'` (invalidates on success) |
| `PATCH /leads/:id` | `useUpdateLeadMutation()` | `'Lead'`, `'LeadStats'` |
| `DELETE /leads/:id` | `useDeleteLeadMutation()` | `'Lead'`, `'LeadStats'` |
| `POST /leads/:id/notes` | `useAddLeadNoteMutation()` | `'Lead'` (single lead re-fetched) |

All mutations invalidate or update the relevant cache tags automatically — no manual refetch needed.

**UI Components Used:**
- `Select.jsx` — shadcn/ui Radix Select (all dropdowns use this, not native `<select>`)
- `FormSelect.jsx` — Form wrapper with `react-hook-form Controller` + shadcn Select
- `FormInput.jsx` / `FormTextarea.jsx` — Form input wrappers
- `DataTable.jsx` — Reusable sortable, paginated, searchable table
- `Modal.jsx` — Reusable modal for edit form
- `Button.jsx` — Variants: primary, secondary, danger, ghost, outline
- `Loader.jsx` / `EmptyState.jsx` — Loading and empty state placeholders
- `LeadKanbanBoard.jsx` — Kanban pipeline with @dnd-kit DnD context, droppable columns, DragOverlay
- `LeadKanbanCard.jsx` — Sortable card using `useSortable` hook with CSS transform animations

---

#### 🧪 Access Control & Permissions (Tested)

**API-Level (enforced by backend `authorize()` middleware):**

| Action | super_admin | admin | manager | employee | client |
|---|---|---|---|---|---|
| View lead list | ✅ | ✅ | ✅ | ✅ | ❌ |
| View lead detail | ✅ | ✅ | ✅ | ✅ | ❌ |
| View lead stats | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create lead | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit lead | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete lead | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add notes | ✅ | ✅ | ✅ | ❌ | ❌ |
| No auth token | ❌ | ❌ | ❌ | ❌ | ❌ |

**UI-Level (enforced by frontend role checks + route guards):**

| UI Element | super_admin | admin | manager | employee | client |
|---|---|---|---|---|---|
| Leads nav item | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Hidden |
| Add Lead button | ✅ | ✅ | ✅ | ❌ | — |
| Inline Edit icon (table) | ✅ | ✅ | ✅ | ❌ | — |
| Inline Delete icon (table) | ✅ | ✅ | ❌ | ❌ | — |
| Edit button (detail page) | ✅ | ✅ | ✅ | ❌ | — |
| Delete button (detail page) | ✅ | ✅ | ❌ | ❌ | — |
| Notes input | ✅ | ✅ | ✅ | ❌ | — |
| Route access (URL direct) | ✅ | ✅ | ✅ | ✅ | ❌ Redirects to /dashboard |

---

#### 🧪 Validation & Edge Cases (Tested)

| Scenario | Expected | Result |
|---|---|---|
| Create lead with valid data | 201 Created | ✅ |
| Create lead with duplicate email | 409 Conflict | ✅ — "A lead with this email already exists" |
| Create lead with invalid email | 400 Validation | ✅ |
| Create lead with name too short | 400 Validation | ✅ |
| Search leads by name | Matching results | ✅ — `$regex` case-insensitive search |
| Search leads by email | Matching results | ✅ |
| Search with no match | Empty array | ✅ |
| Filter by status | Filtered results | ✅ |
| Filter by source | Filtered results | ✅ |
| Pagination (page/limit) | Correct meta | ✅ — total, pages, hasNextPage, hasPrevPage |
| Add note to lead | Note added | ✅ — Author name + role tracked in `createdBy` |
| View lead detail with notes | Full data | ✅ — Notes populated with author info |
| Update lead fields | 200 Updated | ✅ |
| Delete lead (super_admin) | 200 Deleted | ✅ |
| Delete lead (manager) | 403 Forbidden | ✅ |
| Update lead (employee) | 403 Forbidden | ✅ |
| Access without auth token | 401 Unauthorized | ✅ |
| Client role accessing leads | 403 Forbidden | ✅ — Also blocked by frontend route guard |

---

#### 📚 How to Use — Step by Step

**As a Super Admin / Admin / Manager:**

1. **Access:** Navigate to **Leads** in the sidebar
2. **View pipeline stats:** Stats cards at the top show lead count per status
3. **Search/filter:** Type in the search box to find by name/email/company, or use the Status/Source dropdowns
4. **Create a lead:** Click **Add Lead** → Fill in Name*, Email*, Phone, Company, Source, Status, Notes → Click **Create Lead**
5. **View lead detail:** Click any row in the table → See full contact info, status badge, source, notes timeline
6. **Edit a lead:** On the detail page, click **Edit** → Modify fields → **Update Lead**. Or click the edit icon on any table row to go directly to the detail page.
7. **Add notes:** On the detail page, type in the notes input and click **Add**. Each note shows the author name, role, and timestamp.
8. **Delete a lead:** Click the delete icon on a table row, or the Delete button on the detail page → Confirm

**As an Employee:**

1. View the lead list and lead details (read-only)
2. No create/edit/delete/notes functionality
3. Can search and filter

**Role behavior on the /leads/new page:**
- Top-left **← Back** button navigates back to the leads list
- If you change your mind while filling the form, click Back — no data is saved
- All fields are validated before submission with inline error messages

---

#### ⚙️ Recent Improvements & Fixes

| Date | Change | Reason |
|---|---|---|
| June 2026 | Route-level role guards added to `/leads`, `/leads/new`, `/leads/:id` | Client users were hitting API 403 errors instead of being redirected |
| June 2026 | Employee added to Leads nav item in sidebar | Employee has read-only access but couldn't see the nav link |
| June 2026 | Inline action buttons (Edit/Delete) in LeadTable rows | Quick access without navigating to detail page |
| June 2026 | `createdBy.role` populated in notes | Enables "Admin added a note" vs "Manager added a note" display |
| June 2026 | Email console fallback when SMTP not configured | Dev workflow works without email credentials |
| June 2026 | Removed duplicate Mongoose index on `email` | Eliminated startup warning |
| June 2026 | FormSelect migrated to shadcn Select + Controller | Consistent dropdown UX across the app |
| June 2026 | shadcn Select replaces native `<select>` in LeadFilters | Consistent look and behavior |
| June 2026 | Back button added to LeadForm (top-left) | Users can cancel creation easily |
| June 2026 | Search clear bug fixed in LeadList | Stale search params no longer persist |
| June 2026 | Kanban Board view with drag-and-drop (@dnd-kit) | Visual pipeline management with 6 status columns |

---

### 🏢 Client Management ✅ *(Fully Implemented)*

**What it does:** Complete client relationship management with company profiles, GST/PAN tracking, lead conversion, notes, and role-based access.

- **Backend:** `server/src/modules/clients/` — 6 files (Model → Validation → Repository → Service → Controller → Routes)
- **Frontend:** `client/src/modules/clients/` — 4 components + 2 pages + 1 RTK Query service + route integration

---

**Data Model — `client.model.js`**

```javascript
{
  companyName:     String (required, 2-200 chars),
  contactPerson:   String (required, 2-100 chars),
  email:           String (required, unique, lowercase),
  phone:           String (optional, regex validated),
  gstNumber:       String (optional, validated format),
  panNumber:       String (optional, validated format),
  address: {
    street, city, state, pincode, country (default: 'India')
  },
  status:          'active' | 'inactive' (default: 'active'),
  convertedFrom:   ObjectId → ref: 'Lead' (nullable),
  notes:           [{ text, createdBy, createdAt }],
  createdBy:       ObjectId → ref: 'User'
}
```

**API Endpoints & Role Access:**

| Method | Endpoint | Roles |
|---|---|---|
| `GET` | `/api/clients` | super_admin, admin, manager, employee |
| `GET` | `/api/clients/stats` | super_admin, admin, manager |
| `GET` | `/api/clients/:id` | super_admin, admin, manager, employee |
| `POST` | `/api/clients` | super_admin, admin, manager |
| `POST` | `/api/clients/convert/:leadId` | super_admin, admin, manager |
| `PATCH` | `/api/clients/:id` | super_admin, admin, manager |
| `DELETE` | `/api/clients/:id` | super_admin, admin |

**Lead → Client Conversion:**

When a lead reaches `won` status, authorized users can convert it to a client:
1. `POST /api/clients/convert/:leadId` creates a client from lead data (company, contact person, email, phone)
2. Lead's `convertedToClient` and `convertedAt` fields are set automatically
3. Client's `convertedFrom` references the originating lead
4. Double conversion is prevented (409 if lead already converted)

**Frontend Pages:**

| Route | Component | Access |
|---|---|---|
| `/clients` | `ClientList` — searchable table with stats cards, status filter | super_admin, admin, manager, employee |
| `/clients/new` | `ClientForm` — standalone create with company/contact/email/GST/PAN/address | super_admin, admin, manager |
| `/clients/:id` | `ClientDetail` — full profile, notes timeline, edit modal, delete | super_admin, admin, manager, employee |

**UI Components:** `ClientForm`, `ClientTable`, `ClientFilters`, `ClientStatusBadge` — all follow the same patterns as the leads module using shadcn Select, FormSelect with Controller, and DataTable.

**Access Control (Tested ✅):**

| Action | super_admin | admin | manager | employee |
|---|---|---|---|---|
| View client list | ✅ | ✅ | ✅ | ✅ |
| View client detail | ✅ | ✅ | ✅ | ✅ |
| View stats | ✅ | ✅ | ✅ | ❌ |
| Create client | ✅ | ✅ | ✅ | ❌ |
| Convert lead → client | ✅ | ✅ | ✅ | ❌ |
| Edit client | ✅ | ✅ | ✅ | ❌ |
| Delete client | ✅ | ✅ | ❌ | ❌ |
| No auth token | ❌ | ❌ | ❌ | ❌ |
| Client role | ❌ | ❌ | ❌ | ❌ |

---

#### ⚙️ Recent Client Module Fix

| Date | Change | Reason |
|---|---|---|
| June 2026 | Removed `unique: true` + `sparse: true` index on `gstNumber` | MongoDB sparse unique indexes reject multiple `null` values, preventing lead conversion and client creation when GST is empty |

---

### 📅 Meeting Management ✅ *(Fully Implemented)*

**What it does:** Complete meeting scheduling and management system with date/time pickers, status tracking, meeting links, notes, and role-based access.

- **Backend:** `server/src/modules/meetings/` — 6 files (Model → Validation → Repository → Service → Controller → Routes)
- **Frontend:** `client/src/modules/meetings/` — 4 components + 2 pages + 1 RTK Query service + route integration

---

#### 🔧 Backend Architecture: Layer-by-Layer

```
HTTP Request
  → Routes (meeting.routes.js)        — URL routing + auth guard + validation
    → Controller (meeting.controller.js) — Parse request, call service, send response
      → Service (meeting.service.js)      — Business logic (no DB knowledge)
        → Repository (meeting.repository.js) — Database queries only
          → Model (meeting.model.js)         — Mongoose schema + indexes
```

##### 1. Model — `meeting.model.js`

```javascript
{
  title:          String (required, 2-200 chars),
  date:           Date (required),
  startTime:      String (required, HH:mm format),
  endTime:        String (required, HH:mm format),
  status:         'scheduled' | 'completed' | 'cancelled' (default: 'scheduled'),
  meetingLink:    String (optional, URL),
  location:       String (optional, 200 chars),
  notes:          String (optional, 5000 chars),
  recordingLink:  String (optional, URL),
  lead:           ObjectId → ref: 'Lead' (nullable),
  client:         ObjectId → ref: 'Client' (nullable),
  createdBy:      ObjectId → ref: 'User',
  reminderSent:   Boolean (default: false),
  reminderAt:     Date (nullable)
}
```

**Indexes:** `date`, `status`, `lead`, `client`, compound on `date + startTime`.

##### 2. Validation — `meeting.validation.js`

| Schema | Key Rules |
|---|---|
| `createMeetingSchema` | title: min 2 chars, date: valid ISO string, startTime/endTime: HH:mm regex, endTime > startTime refined |
| `updateMeetingSchema` | All fields optional, same time validation |
| `meetingNotesSchema` | notes: max 5000 chars |
| `meetingsQuerySchema` | search, status, dateFrom/dateTo, lead, client, page/limit/sort |

##### 3. Repository — `meeting.repository.js`

- `create(data)` — Insert new meeting
- `findById(id)` — Single meeting with populated `lead`, `client`, `createdBy`
- `findAll(query, options)` — Paginated list with text search (`$regex` on title/notes/location), status filter, lead/client filter, date range filter (`dateFrom`/`dateTo`). Populates lead, client, createdBy
- `updateById(id, data)` — Update with `runValidators: true`
- `updateNotesById(id, notes)` — Update only the notes field
- `deleteById(id)` — Hard delete
- `countByStatus()` — Aggregate pipeline grouping by status
- `countUpcoming()` — Count scheduled meetings from today onwards

##### 4. Service — `meeting.service.js`

| Function | Logic |
|---|---|
| `createMeeting(data, user)` | Validates duration > 0, sets `createdBy`, calls repository.create |
| `getMeetings(query)` | Destructures pagination params, passes rest as filters to repository.findAll |
| `getMeetingById(id)` | Delegates to repository.findById |
| `updateMeeting(id, data)` | Validates duration if times provided, delegates to repository.updateById |
| `updateMeetingNotes(id, notes)` | Delegates to repository.updateNotesById |
| `deleteMeeting(id)` | Delegates to repository.deleteById |

##### 5. Controller — `meeting.controller.js`

```
list(req, res)         → GET / → meetingService.getMeetings(req.query) → ApiResponse.paginated
getById(req, res)      → GET /:id → meetingService.getMeetingById(id) → ApiResponse
create(req, res)       → POST / → meetingService.createMeeting(body, req.user) → ApiResponse.created
update(req, res)       → PATCH /:id → meetingService.updateMeeting(id, body) → ApiResponse
updateNotes(req, res)  → PATCH /:id/notes → meetingService.updateMeetingNotes(id, body.notes) → ApiResponse
remove(req, res)       → DELETE /:id → meetingService.deleteMeeting(id) → ApiResponse
```

##### 6. Routes — `meeting.routes.js`

```
GET    /api/meetings          → super_admin, admin, manager, employee
GET    /api/meetings/:id      → super_admin, admin, manager, employee
POST   /api/meetings          → super_admin, admin, manager
PATCH  /api/meetings/:id      → super_admin, admin, manager
PATCH  /api/meetings/:id/notes → super_admin, admin, manager, employee
DELETE /api/meetings/:id      → super_admin, admin
```

All routes require `verifyToken`. Query params validated via `validateQuery(meetingsQuerySchema)`, body via `validate()` with respective Zod schemas.

---

#### 🎨 Frontend Architecture: Component Tree

```
Routes (/meetings, /meetings/:id)
  ├── [Route Guard] ProtectedRoute(requiredRoles) — blocks unauthorized roles at router level
  │
  ├── MeetingList Page (/meetings)
  │   ├── Header — Title + "Schedule Meeting" button (role-gated)
  │   ├── MeetingFilters — Search input + Status shadcn Select + DatePickerSimple date range
  │   ├── MeetingTable — Table with:
  │   │   ├── Columns: Title (icon+link), Date & Time, Status (badge), Related To (lead/client)
  │   │   ├── Actions: Edit icon → detail page | Delete icon → confirm → delete (role-gated)
  │   │   └── Row click → MeetingDetail page
  │   └── Create Modal → MeetingForm in a Modal
  │
  └── MeetingDetail Page (/meetings/:id)
      ├── Back button → /meetings
      ├── Actions: Edit (modal) | Delete (confirm) — role-gated
      ├── Meeting Info Card — Date, Time, Location, Meeting Link, Recording Link, Lead/Client
      └── Discussion Notes
          ├── Edit inline (super_admin/admin/manager/employee)
          └── Save/Cancel controls
```

**API Integration — `meetingApi.js` (RTK Query)**

| Endpoint | Hook | Cache Tags |
|---|---|---|
| `GET /meetings` | `useGetMeetingsQuery(params)` | `'Meeting'` |
| `GET /meetings/:id` | `useGetMeetingByIdQuery(id)` | `{ type: 'Meeting', id }` |
| `POST /meetings` | `useCreateMeetingMutation()` | `'Meeting'` (invalidates on success) |
| `PATCH /meetings/:id` | `useUpdateMeetingMutation()` | `'Meeting'`, `{ type: 'Meeting', id }` |
| `PATCH /meetings/:id/notes` | `useUpdateMeetingNotesMutation()` | `'Meeting'`, `{ type: 'Meeting', id }` |
| `DELETE /meetings/:id` | `useDeleteMeetingMutation()` | `'Meeting'` |

**UI Components Used:**
- `DatePickerSimple.jsx` — shadcn-styled date picker with popover calendar
- `TimePicker.jsx` — Native time input with label
- `LinkInput.jsx` — URL input with validation
- `FormInput.jsx` / `FormSelect.jsx` / `FormTextarea.jsx` — Form wrappers
- `DatePicker.jsx` — shadcn date picker for create/edit forms
- `Modal.jsx` — Reusable modal for create/edit forms
- `Button.jsx` — Variants: primary, secondary, danger, ghost, outline
- `Select.jsx` — shadcn/ui Radix Select for status dropdown in filters

---

#### 🧪 Access Control & Permissions

**API-Level (enforced by backend `authorize()` middleware):**

| Action | super_admin | admin | manager | employee |
|---|---|---|---|---|
| View meeting list | ✅ | ✅ | ✅ | ✅ |
| View meeting detail | ✅ | ✅ | ✅ | ✅ |
| Create meeting | ✅ | ✅ | ✅ | ❌ |
| Edit meeting | ✅ | ✅ | ✅ | ❌ |
| Update notes | ✅ | ✅ | ✅ | ✅ |
| Delete meeting | ✅ | ✅ | ❌ | ❌ |
| No auth token | ❌ | ❌ | ❌ | ❌ |

**UI-Level (enforced by frontend role checks + route guards):**

| UI Element | super_admin | admin | manager | employee |
|---|---|---|---|---|
| Meetings nav item | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Schedule Meeting button | ✅ | ✅ | ✅ | ❌ |
| Inline Edit icon (table) | ✅ | ✅ | ✅ | ❌ |
| Inline Delete icon (table) | ✅ | ✅ | ❌ | ❌ |
| Edit button (detail page) | ✅ | ✅ | ✅ | ❌ |
| Delete button (detail page) | ✅ | ✅ | ❌ | ❌ |
| Notes edit | ✅ | ✅ | ✅ | ✅ |
| Route access (URL direct) | ✅ | ✅ | ✅ | ✅ |

---

#### 📚 How to Use — Step by Step

**As a Super Admin / Admin / Manager:**

1. **Access:** Navigate to **Meetings** in the sidebar
2. **Search/filter:** Type in the search box to find by title/location, or use the Status dropdown, or filter by date range
3. **Schedule a meeting:** Click **Schedule Meeting** → Fill in Title*, Date*, Start/End Time*, Meeting Link, Location → Click **Schedule Meeting**
4. **View meeting detail:** Click any row in the table → See full info (date, time, location, links, lead/client)
5. **Edit meeting:** On the detail page, click **Edit** → Modify fields → **Update Meeting**
6. **Edit notes:** On the detail page, click **Edit** on the Discussion Notes section → Update text → **Save Notes**
7. **Delete a meeting:** Click the delete icon on a table row, or the Delete button on the detail page → Confirm

**As an Employee:**

1. View the meeting list and meeting details (read-only)
2. Can edit discussion notes
3. No create/edit/delete meeting functionality
4. Can search and filter

---

### 🚧 Upcoming Modules (Planned)

| Module | Status | Description |
|---|---|---|
| **Meetings** | ✅ Done | Schedule, calendar view, Google Meet/Zoom integration |
| **Projects** | ⬜ Pending | Project creation, milestones, team assignment |
| **Tasks** | ⬜ Pending | Task assignment, priority, comments, subtasks |
| **Invoices** | ⬜ Pending | GST invoices, PDF, email, recurring |
| **Payments** | ⬜ Pending | Razorpay/Stripe, partial/advance, tracking |
| **Reports** | ⬜ Pending | Revenue, conversion, productivity analytics |
| **Notifications** | ⬜ Pending | In-app, email, WhatsApp alerts |
| **Client Portal** | ⬜ Pending | Client login, project view, file downloads |
| **File Management** | ⬜ Pending | ImageKit uploads, folder structure |
| **Settings** | ⬜ Pending | System configuration |

---

## API Standards

All API responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": { "lead": {} }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone and navigate
cd CRM

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Environment setup
cp server/.env.example server/.env
# Edit .env with your MongoDB URI, JWT secrets, etc.

# Start development
cd server && npm run dev    # Backend on port 3000
cd client && npm run dev    # Frontend on port 5173
```

### Environment Variables (server/.env)

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASS=your-password
```

---

## Architecture Rules

- **No business logic in controllers** — Services handle all logic
- **No DB queries in controllers** — Repositories handle all database operations
- **Every API must have validation** — Zod schemas for all inputs
- **Feature-based modules** — Each module is self-contained
- **Reusable UI components** — No duplicate components
- **API-first design** — Mobile-ready APIs
- **Role-based access** — Every endpoint is protected

---

## Development Roadmap

Follow `implementation_plan.md` for the complete 28-day development roadmap.

---

*Last updated: June 2026*

