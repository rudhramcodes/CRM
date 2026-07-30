# 🧪 CRM — QA Testing Guide

> A simple step-by-step guide to test all features of the CRM.
> No coding knowledge needed — just open the website and follow the steps.

---

## 📋 Before You Start

### Open the App
- **Frontend (what you see):** `http://localhost:5173`
- **Backend (runs behind the scenes):** `http://localhost:3000`

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** (boss) | `fizzzydev@gmail.com` | `Test@123` |
| **Employee** (staff) | `test@gmail.com` | `Test@123` |

> ⚠️ First login as Super Admin. Then go to Settings > Users to create users with other roles.

---

## 📑 1 — Login / Logout

### How to test:

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Open `http://localhost:5173/auth/login` | Login page shows up — email and password fields |
| 2 | Leave email/password empty → click Submit | Error shows — "Email is required" or "Password is required" |
| 3 | Enter wrong credentials (e.g. `test@test.com` / `wrong`) | Error shows — "Invalid email or password" |
| 4 | Enter Super Admin credentials (`fizzzydev@gmail.com` / `Test@123`) | Dashboard opens |
| 5 | Click profile icon (top-right corner) → **Logout** | Goes back to login page |
| 6 | After logout, try opening `http://localhost:5173/dashboard` directly | Redirects to login page |

### 🔑 Forgot / Reset Password

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **"Forgot Password?"** on login page | Asks for email |
| 2 | Enter your email → Submit | Shows "Email sent" message |
| 3 | Check server console for the reset link | Link looks like: `http://localhost:5173/auth/reset-password/TOKEN` |
| 4 | Open that link in browser | Shows new password form |
| 5 | Enter new password → Submit | Success message shows, redirects to login |
| 6 | Login with new password | Should work |

### 📧 Email Verification

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Login and check dashboard for email verification banner | Banner with "Resend Verification Email" button shows |
| 2 | Click that button | "Verification email sent" message appears |
| 3 | Check server console for verification link | Link: `http://localhost:5173/auth/verify-email/TOKEN` |
| 4 | Open that link | "Email verified successfully" shows |
| 5 | Refresh dashboard | Banner should be gone |

---

## 📊 2 — Dashboard

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Login — dashboard opens automatically | Cards show — Total Leads, Meetings, Tasks, Invoices etc. |
| 2 | Check the numbers match actual data | If 5 leads exist, it should show "5" |
| 3 | Check any charts/graphs | Data should display correctly |

---

## 👥 3 — Leads

### 3A — Leads List

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Leads** in sidebar | Table shows — Name, Email, Source, Status, Assigned To, Created |
| 2 | Type something in **Search** box | List filters (e.g. type "Rahul" → only Rahul shows) |
| 3 | Select a status from **Status** dropdown | Only leads with that status show |
| 4 | Select a source from **Source** dropdown | Only leads with that source show |
| 5 | Click Previous/Next pagination buttons | Page changes |
| 6 | Toggle **Table/Board** view | Kanban Board view shows — cards in columns |
| 7 | In Board view, drag a card to another column | Status updates automatically |

### 3B — Create Lead

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **"Add Lead"** button | Form opens — Name, Email*, Phone, Company, Source, Status |
| 2 | Fill name only, leave email empty → Submit | Error — "Email is required" |
| 3 | Enter invalid email (e.g. `abc`) → Submit | Error — "Invalid email" |
| 4 | Fill everything correctly → Submit | "Lead created" success message |
| 5 | Go back to list — new lead should show | New entry in table |

### 3C — Lead Detail

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click a lead name in the list | Detail page opens — all info visible |
| 2 | Check **Notes** section | Timeline of notes with author name, role, time |
| 3 | Write a new note → Add | Note appears in timeline |
| 4 | Click **Edit** → change something → Update | Data updates |
| 5 | Click **Delete** → Confirm | Lead is deleted |

---

## 🏢 4 — Clients

### 4A — Clients List

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Clients** in sidebar | Table shows — Company, Contact Person, Email, Phone, Status |
| 2 | Test search and filter | Should work |

### 4B — Create Client

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **"Add Client"** | Form opens — Company, Contact Person, Email, Phone, GST, PAN, Address |
| 2 | Leave required fields (Company, Contact Person, Email) empty → Submit | Error shows |
| 3 | Fill everything correctly → Submit | "Client created" success |
| 4 | Check list — new client shows | Entry appears in table |

### 4C — Lead to Client Conversion

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to a lead with **Won** status | "Convert to Client" button shows on detail page |
| 2 | Click it → fill form → Convert | New client is created |
| 3 | Go back to that lead | "Converted to Client" badge shows |
| 4 | Try converting the same lead again | Error — "already converted" |

### 4D — Client Detail

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click client name | Detail page opens — all info + notes |
| 2 | Add notes, Edit, Delete | All should work |

---

## 📅 5 — Meetings

### 5A — Meetings List

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Meetings** in sidebar | Table shows — Title, Date & Time, Status, Related To |
| 2 | Test filters — Status, Date Range | Filtering works correctly |

### 5B — Schedule Meeting

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **"Schedule Meeting"** | Form opens — Title*, Date*, Start/End Time*, Meeting Link, Location |
| 2 | Leave required fields empty → Submit | Error shows |
| 3 | Set End Time earlier than Start Time → Submit | Error — "End time must be after start time" |
| 4 | Fill everything correctly → Submit | "Meeting created" success |
| 5 | Check list — new meeting shows | New entry appears |

### 5C — Meeting Detail & Notes

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click meeting title | Detail page — Info + Notes section |
| 2 | Edit **Notes** → Save | Notes update |

---

## 📁 6 — Projects

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Projects** in sidebar | Table/List shows up |
| 2 | Create new project → Edit → Delete | All CRUD operations work |
| 3 | Test Filter/Search | Filtering works |

---

## ✅ 7 — Tasks

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Tasks** in sidebar | List shows — Title, Priority, Status, Assignee, Due Date |
| 2 | Create new task → Edit → Delete | CRUD all works |
| 3 | Test priority filter | Filters by High/Medium/Low correctly |

---

## 🧾 8 — Invoices

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Invoices** in sidebar | Table shows — Invoice #, Client, Amount, Status, Date |
| 2 | Create new invoice (select client, add items, check GST calculations) | Everything calculates correctly |
| 3 | Click **Download PDF** | PDF file downloads |
| 4 | Edit invoice → Delete | Working |
| 5 | Test status filter | Filters by Draft/Sent/Paid/Overdue correctly |

---

## 💳 9 — Payments

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Payments** in sidebar | List shows up |
| 2 | Add a new payment entry | Successfully added |
| 3 | View payment detail | All info shows |

---

## 📈 10 — Reports

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Reports** in sidebar | Reports page opens |
| 2 | Check different reports — Revenue, Conversion, Productivity | Data displays correctly |

---

## 🔔 11 — Notifications

### 11A — In-App Notifications

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Notifications** in sidebar | List of notifications shows |
| 2 | Click a notification | Opens the related page (e.g. task) |
| 3 | Create a new lead/client/meeting/task | Real-time notification should appear |

### 11B — Notification Preferences

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Notifications** | Toggles show — Task Assigned, Payment Received, Meeting Reminder, etc. |
| 2 | Turn off a toggle → create a new task | That type of notification should NOT appear |
| 3 | Turn Email toggle on → do some action | Email log shows in console |
| 4 | Turn Email toggle off → do action | Email log should NOT appear (but in-app notification still shows) |

---

## ⚙️ 12 — Settings

### 12A — Profile Tab

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Profile** | Shows Name, Email, Phone, Password fields |
| 2 | Change Name → Save | "Profile updated" success |
| 3 | **Phone** field should only accept numbers | Letters should not type |
| 4 | Try changing **Password**: | |
| | - Enter wrong old password | Error — "Current password is incorrect" |
| | - Enter short new password | Error — "Password must be at least 8 characters" |
| | - New password missing uppercase/lowercase/number/special char | Checklist shows what's missing |
| | - Mismatched confirm password | Error — "Passwords do not match" |
| | - Fill everything correctly → Save | Success |

### 12B — Security Tab

> Only visible to super_admin and admin

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Security** | Shows Password Policy + Login Lockout options |
| 2 | Password Policy: | |
| | - Change Min Length (e.g. 6 → 10) | Saves successfully |
| | - Toggle Require Uppercase/Lowercase/Number/Special on/off | Saves successfully |
| 3 | Login Lockout: | |
| | - Change Max Attempts (e.g. 5 → 3) → Save | Saves |
| | - Change Lockout Duration (minutes) → Save | Saves |
| 4 | Verify new policy applies: | |
| | - Password guidelines update on profile page | |
| | - Password change respects new rules | |

### 12C — Notifications Tab

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Notifications** | Toggles show |
| 2 | Check In-App and Email toggles are separate | |
| 3 | Click a toggle (switch) | Knob moves smoothly, color changes |

### 12D — Integrations Tab

> Only visible to super_admin and admin

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Integrations** | SMTP Config form — Host, Port, Email, Password |
| 2 | Save with empty fields | "Saved" (will use env SMTP) |
| 3 | Fill SMTP details (if you have real SMTP) → Save | "Saved" success |

### 12E — Organization Tab

> Only visible to super_admin and admin

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Organization** | Company details form |
| 2 | Fill Company Name, Address, etc. → Save | Saves successfully |

### 12F — Roles & Permissions

> Only visible to super_admin

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Go to **Settings → Roles & Permissions** | List of roles — Super Admin, Admin, Manager, Employee |
| 2 | Click a role | Shows its permissions (checkboxes) |
| 3 | Remove "Leads Delete" from Employee → Save | Saves |
| 4 | Login as Employee → try deleting a lead | Delete button hidden / error shows |

---

## 👤 13 — User Management

> Only visible to super_admin and admin

| # | What to do | What should happen |
|---|-----------|-------------------|
| 1 | Click **Users** in sidebar | Table shows — Name, Email, Role, Status, Created |
| 2 | Look at **Stats cards** on top | Count per role shows |
| 3 | Type in **Search** box (name/email) | List filters |
| 4 | Select a **Role** from dropdown | Only users with that role show |
| 5 | Click **"Create User"** | Modal opens — Name, Email, Password, Role, Phone |
| 6 | Leave required fields empty → Submit | Error — "Name is required" / "Email is required" |
| 7 | Enter duplicate email → Submit | Error — "Email already registered" |
| 8 | Enter password shorter than 6 chars | Error — "Password must be at least 6 characters" |
| 9 | Fill everything correctly → Submit | "User created" success → new user in table |
| 10 | Click **Edit (Shield icon)** on a user | Modal opens with user's info filled in |
| 11 | Change Name/Email/Role → Submit | "User updated" success |
| 12 | Try **Delete**: | |
| | - Delete an employee user | Confirm dialog → Delete → User deleted |
| | - Delete a Super Admin user | Error — "Cannot delete super admin" |
| 13 | Cancel delete dialog | Dialog closes, user not deleted |

---

## 🔐 14 — Role-Based Access Testing

> **What this means:** Each role should only see / do what's allowed for them.

### 14A — Sidebar Menu (what each role sees)

| Role | What shows up |
|------|--------------|
| **Super Admin** | Everything — Dashboard, Leads, Clients, Meetings, Projects, Tasks, Invoices, Payments, Reports, Notifications, **Users**, Settings |
| **Admin** | Dashboard, Leads, Clients, Meetings, Projects, Tasks, Invoices, Payments, Reports, Notifications, **Users**, Settings |
| **Manager** | Dashboard, Leads, Clients, Meetings, Projects, Tasks, Notifications, Settings (Users does NOT show) |
| **Employee** | Dashboard, Leads, Clients, Meetings, Projects, Tasks, Notifications, Settings (Users, Invoices, Payments, Reports do NOT show) |

### 14B — Permissions Table

| Action | Super Admin | Admin | Manager | Employee |
|--------|-------------|-------|---------|----------|
| **Leads:** View | ✅ | ✅ | ✅ | ✅ |
| **Leads:** Create | ✅ | ✅ | ✅ | ❌ |
| **Leads:** Edit | ✅ | ✅ | ✅ | ❌ |
| **Leads:** Delete | ✅ | ✅ | ❌ | ❌ |
| **Leads:** Add Notes | ✅ | ✅ | ✅ | ❌ |
| **Clients:** View | ✅ | ✅ | ✅ | ✅ |
| **Clients:** Create | ✅ | ✅ | ✅ | ❌ |
| **Clients:** Edit | ✅ | ✅ | ✅ | ❌ |
| **Clients:** Delete | ✅ | ✅ | ❌ | ❌ |
| **Meetings:** View | ✅ | ✅ | ✅ | ✅ |
| **Meetings:** Create | ✅ | ✅ | ✅ | ❌ |
| **Meetings:** Edit Notes | ✅ | ✅ | ✅ | ✅ |
| **Meetings:** Delete | ✅ | ✅ | ❌ | ❌ |
| **Invoices:** Everything | ✅ | ✅ | ❌ | ❌ |
| **Payments:** Everything | ✅ | ✅ | ❌ | ❌ |
| **Reports:** View | ✅ | ✅ | ❌ | ❌ |
| **Users:** Manage | ✅ | ✅ | ❌ | ❌ |
| **Settings — Profile** | ✅ | ✅ | ✅ | ✅ |
| **Settings — Security** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Integrations** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Roles & Perms** | ✅ | ❌ | ❌ | ❌ |

### 14C — How to Test

1. Login as **Super Admin** → check everything works (create/edit/delete)
2. **Logout** → Login as **Employee** → verify that:
   - Users option is **NOT** in sidebar
   - Invoices/Payments/Reports also **NOT** in sidebar
   - Create/Edit/Delete buttons **NOT** visible
   - Only view is allowed
3. While logged in as Employee, type `/users` in URL manually → Should redirect or show error

---

## 📝 15 — Edge Cases (check these too)

### 15A — Forms & Input

| Scenario | What should happen |
|----------|-------------------|
| Submit blank form | Validation error — no field should go empty |
| Rapid double-click on Submit button | Should NOT create duplicate entries |
| Press Enter key in a form | Should submit the form (not break) |
| Copy-paste into fields | Should work fine (especially passwords) |
| Tab through fields (keyboard navigation) | Should move to next field in order |
| Enter very long text in name/notes field | Error shows or text gets trimmed |
| Enter special chars (`<script>`, `--drop table`) in any field | Should be treated as plain text, NOT executed |
| Enter emojis in name/notes field | Should work (database should handle UTF-8) |
| Enter only spaces in required fields | Should show validation error |
| Leave a required field, then try to submit | Error should show near that field |

### 15B — Duplicate & Conflicts

| Scenario | What should happen |
|----------|-------------------|
| Create lead/client/user with same email twice | Error — "already exists" |
| Click Cancel on delete dialog | Item should NOT be deleted |
| Open same record in two browser tabs → edit in both → save both | Last save should win (no crash) |

### 15C — Navigation & Session

| Scenario | What should happen |
|----------|-------------------|
| Refresh the page on any screen | Should stay logged in, same page loads |
| Use browser back/forward buttons | App should NOT crash, goes to previous page |
| Close browser tab → open app again | Should still be logged in (if session valid) |
| Stay idle for 15+ minutes → try to do something | Either still works or asks to login again (token expiry) |
| Type an invalid URL (e.g. `/xyz`) | Should show "404 - Not Found" page |
| Access a deleted record's URL directly (e.g. `/leads/DELETED_ID`) | Should show error or redirect |

### 15D — Network & Errors

| Scenario | What should happen |
|----------|-------------------|
| Turn off WiFi/internet → click Submit | Error message shows — app doesn't freeze or crash |
| Turn off WiFi → click a link | Should show some error, not a blank white screen |
| Slow network (throttle in DevTools) | Loading spinner/skeleton should show |

### 15E — Search & Filters

| Scenario | What should happen |
|----------|-------------------|
| Search with no matching results | Should show "No results found" or empty state |
| Filter with no matching results | Should show empty state |
| Search with special regex chars (`.*+?^$`) | Should work as plain text search (not crash) |
| Clear search after getting results | Should show full list again |
| Apply filter then search together | Both should work together |

### 15F — Numbers & Validation

| Scenario | What should happen |
|----------|-------------------|
| Enter negative numbers in amount fields | Should show error (negative amount not allowed) |
| Enter very large number in amount | Should show error or handle gracefully |
| Enter alphabets in phone field | Should NOT be accepted |
| Enter alphabets in amount field | Should NOT be accepted |
| Enter invalid email formats (`abc`, `@.com`, `a@b`) | Should show "Invalid email" error |
| Enter future date in date of birth fields | Should show error (if applicable) |
| Enter past date in meeting date | Should be allowed (past meetings exist) |
| Enter time where end time < start time | Error — "End time must be after start time" |
| Leave date field empty | Error — date is required |

### 15G — UI & Responsive

| Scenario | What should happen |
|----------|-------------------|
| Resize browser to mobile width (375px) | Layout should adjust — sidebar may collapse, table may scroll |
| Resize browser to tablet width (768px) | Should look okay |
| Zoom in/out (Ctrl + / Ctrl -) | Layout should not break |
| Open on mobile browser | Should be usable (not desktop-only) |
| Check for overlapping text | No text should be cut off or overlap |
| Scroll down on long pages | Header/footer should behave correctly |

### 15H — Role-Based Edge Cases

| Scenario | What should happen |
|----------|-------------------|
| Employee types `/users` in URL manually | Should redirect — "Not authorized" |
| Employee types `/invoices` in URL manually | Should redirect |
| Manager types `/users` in URL manually | Should redirect |
| Logout from Super Admin → login as Employee immediately | Should work (no session conflict) |
| Change your own role from Super Admin to Employee | Should take effect on next login |
| Delete a user who has leads/clients assigned | Should either allow or show error (data integrity) |

### 15I — Misc

| Scenario | What should happen |
|----------|-------------------|
| Browser autofill saves and fills login credentials | Should work |
| Open the app in an incognito/private window | Should work normally |
| Open the app in a different browser | Shared sessions don't persist (expected) |
| Check all required fields have a `*` indicator | Star mark should be visible on mandatory fields |
| Click outside a modal/dropdown | Modal/dropdown should close |

---

## 🐛 16 — Bug Report Template

Found a problem? Report it like this:

```
Title: [Short description — e.g. "Create Lead button not working"]

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [Third step]

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Role: [Super Admin / Admin / Manager / Employee]
Browser: [Chrome / Firefox / Safari]
Screenshot: [Yes / No]
```

---

## ✅ 17 — Final Checklist

> Mark ✅ as you test each feature

- [ ] **Login** — Successful + Invalid + Empty fields
- [ ] **Logout** — Logs out and redirects to login
- [ ] **Forgot Password** — Reset link sent via email
- [ ] **Dashboard** — All numbers correct
- [ ] **Leads** — Create / Read / Update / Delete / Search / Filter / Notes
- [ ] **Leads Kanban** — Drag-and-drop changes status
- [ ] **Clients** — Create / Read / Update / Delete / Lead Convert
- [ ] **Meetings** — Create / Read / Update Notes / Delete / Filter
- [ ] **Projects** — Create / Read / Update / Delete
- [ ] **Tasks** — Create / Read / Update / Delete / Filter
- [ ] **Invoices** — Create / Read / Update / Delete / PDF Download
- [ ] **Payments** — Create / Read / Detail
- [ ] **Reports** — All reports show correct data
- [ ] **Notifications** — Real-time + Preferences work
- [ ] **Settings — Profile** — Update + Password change + Validation
- [ ] **Settings — Security** — Password policy + Login lockout
- [ ] **Settings — Integrations** — SMTP config save
- [ ] **Settings — Organization** — Save/Update
- [ ] **Settings — Roles & Perms** — Change permissions + verify effect
- [ ] **User Management** — Create / Edit / Delete / Search / Filter
- [ ] **Role Access** — Employee only sees what's allowed
- [ ] **Responsive** — Mobile view doesn't break
- [ ] **Edge Cases** — Empty form, duplicate, special chars, refresh

---

> 🎯 **Goal:** All features work correctly — no bugs.
>
> Found an issue? Use the template above and send it to the developer.
