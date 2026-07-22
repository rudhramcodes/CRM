# Invoice & Payment Module Redesign Plan

## Current Problems

### Root Cause: Tangled Responsibilities
- `invoice.service.js` `updateInvoiceStatus('paid')` auto-creates Payment records — Invoice service shouldn't know about payments
- `payment.service.js` `recalculateInvoicePayment` updates invoice status — Payment service controls invoice state
- Two entry points for "Mark as Paid": PATCH `/invoices/:id/status` AND POST `/api/payments` — race conditions, duplication
- Invoice model `pre('save')` hook recalculates `balanceDue` but `findByIdAndUpdate` skips it — hook doesn't fire on status-only updates
- `STATUS_TRANSITIONS` duplicated across server (`invoice.service.js`) and client (`InvoiceTable.jsx`) — out of sync
- `partially_paid` was bolted on after the fact, not designed in

### Specific Bugs
1. **Double payment on "Mark as Paid"**: `PATCH /invoices/:id/status { status: 'paid' }` creates auto-payment AND if user also records a payment separately → double count
2. **Hook not firing**: `updateById` uses `findByIdAndUpdate` which skips pre-save hook → balanceDue not recalculated for non-payment status changes
3. **Status stuck**: If a partially_paid invoice gets a payment that covers total, `recalculateInvoicePayment` sets status to 'paid' but `updateInvoiceStatus` also tries to manage 'paid' — conflicting logic
4. **Cache invalidation mess**: Frontend has excessive `refetch()` calls because RTK cache tags don't cover all cross-module dependencies

---

## Clean Architecture Design

### Core Principle: Separation of Concerns

```
INVOICE MODULE                    PAYMENT MODULE
┌──────────────────┐              ┌──────────────────┐
│ Owns:            │              │ Owns:            │
│ - Invoice CRUD   │              │ - Payment CRUD   │
│ - Non-financial  │              │ - Payment stats  │
│   status changes │              │                  │
│ - Invoice stats  │              │ INTERACTS WITH:  │
│ - PDF/HTML/Email │              │ - Invoice model  │
└──────────────────┘              │   (paidAmount,   │
                                  │    balanceDue)   │
                                  └──────────────────┘
                                         │
                                  POST /api/payments
                                         │
                                         ▼
                                  ┌──────────────────┐
                                  │ recalculateInvoice│
                                  │ Payment():       │
                                  │ 1. Sum completed │
                                  │    payments      │
                                  │ 2. Set paidAmount│
                                  │ 3. invoice.save()│
                                  │    → pre hook    │
                                  │      calculates  │
                                  │      balanceDue  │
                                  │ 4. Set status    │
                                  │    based on      │
                                  │    financials    │
                                  └──────────────────┘
```

### Status Ownership

| Status | Set By | How |
|--------|--------|-----|
| `draft` | Invoice service | On creation |
| `sent` | Invoice service | `PATCH /invoices/:id/status` |
| `partially_paid` | Payment service | Auto after partial payment |
| `paid` | Payment service | Auto after last payment completes balance |
| `overdue` | Cron job | Automatic (future) |
| `cancelled` | Invoice service | `PATCH /invoices/:id/status` |

### Valid Status Transition Matrix

```
START ──→ draft ──→ sent ──→ partially_paid ──→ paid
              │       │            │
              │       │            └──→ cancelled
              │       │
              │       └──→ cancelled
              │
              └──→ cancelled

sent ──→ overdue (auto via cron)
overdue ──→ partially_paid (when payment received)
overdue ──→ paid (when full payment received)
overdue ──→ cancelled
```

**Rule**: Invoice service manages transitions between `{draft, sent, cancelled}`. Payment service auto-manages transitions to `{partially_paid, paid}` as a side effect of payment operations.

---

## API Design

### Invoice Endpoints (Clean — no payment logic)

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| `GET` | `/api/invoices` | List invoices | --
| `GET` | `/api/invoices/stats` | Invoice stats | --
| `GET` | `/api/invoices/:id` | Get invoice | Returns paidAmount, balanceDue |
| `GET` | `/api/invoices/:id/html` | HTML preview | --
| `GET` | `/api/invoices/:id/pdf` | PDF download | --
| `POST` | `/api/invoices` | Create invoice | --
| `PATCH` | `/api/invoices/:id` | Edit draft invoice | Only draft allowed |
| `PATCH` | `/api/invoices/:id/status` | **Non-financial** status changes | Only: draft→sent, X→cancelled |
| `DELETE` | `/api/invoices/:id` | Delete draft invoice | Only draft allowed |
| `POST` | `/api/invoices/:id/resend` | Resend email | --

### Payment Endpoints (Single source of truth for money)

| Method | Endpoint | Purpose | Invoice side-effect |
|--------|----------|---------|-------------------|
| `GET` | `/api/payments` | List payments | -- |
| `GET` | `/api/payments/stats` | Payment stats | -- |
| `GET` | `/api/payments/:id` | Get payment | -- |
| `GET` | `/api/payments/invoice/:invoiceId` | Payments for invoice | -- |
| `POST` | `/api/payments` | **Record payment** | Recalculates invoice paidAmount, auto-updates status |
| `PATCH` | `/api/payments/:id` | Update payment | If amount changed, recalculates invoice |
| `DELETE` | `/api/payments/:id` | Delete payment | Recalculates invoice |

### Status Change Flow (Detailed)

#### Scenario 1: User sends invoice (draft → sent)
```
PATCH /invoices/:id/status { status: 'sent' }
  → invoice.service.updateInvoiceStatus(id, 'sent')
  → validates: draft → sent is allowed (non-financial transition)
  → sets: status='sent', sentAt=now
  → invoice.save() (pre-save hook fires → recalculates total, balanceDue)
  → sends email
```

#### Scenario 2: User records partial payment (₹60,000 out of ₹1,00,000)
```
POST /api/payments { invoice, amount: 60000, paymentMethod: 'upi', ... }
  → payment.service.createPayment(data, user)
  → validates: invoice exists, not cancelled/paid
  → creates Payment document
  → payment.service.recalculateInvoicePayment(invoiceId)
    → Payment.aggregate: sum completed payments for this invoice
    → invoice.paidAmount = sum (60000)
    → invoice.save() → pre-save hook: balanceDue = 100000 - 60000 = 40000
    → if paidAmount > 0 && paidAmount < total: status = 'partially_paid'
    → invoice.save()
  → returns payment with populated invoice
```

#### Scenario 3: User records remaining payment (₹40,000)
```
POST /api/payments { invoice, amount: 40000, ... }
  → payment.service.createPayment(data, user)
  → creates Payment
  → recalculateInvoicePayment:
    → paidAmount = 60000 + 40000 = 100000
    → invoice.save() → balanceDue = 0
    → paidAmount >= total: status = 'paid', paidAt = now
```

#### Scenario 4: User clicks "Mark as Paid" from UI
```
UI shortcut: calls POST /api/payments { invoice, amount: invoice.balanceDue }
  → Exactly same flow as Scenario 2/3
  → No special handling needed in invoice service
```

#### Scenario 5: User cancels invoice
```
PATCH /invoices/:id/status { status: 'cancelled' }
  → invoice.service.updateInvoiceStatus(id, 'cancelled')
  → validates: current status can go to cancelled
  → sets: status='cancelled', cancelledAt=now
```

---

## UI Component Plan

### Invoice Module (client/src/modules/invoices/)

```
invoices/
├── components/
│   ├── InvoiceStatusBadge.jsx    — Status badge (keep as-is, already handles partially_paid)
│   ├── InvoiceFilters.jsx        — Search + status filter (keep as-is)
│   ├── InvoiceForm.jsx           — Create/edit form (keep as-is)
│   └── InvoiceTable.jsx          — REWRITE: clean status transitions, no payment creation in status dropdown
│
└── pages/
    ├── InvoiceList.jsx           — UPDATE: stat cards include partially_paid, revenue bar
    └── InvoiceDetail.jsx         — REWRITE: clean payment section embed
        ├── Invoice header + actions (Send, Cancel — no Mark as Paid in status)
        ├── Invoice preview (HTML)
        ├── Payment Summary Card
        │   ├── Total | Paid | Balance Due
        │   ├── Progress bar (%)
        │   └── "Record Payment" button → opens PaymentForm modal
        │       ├── For sent/overdue: full amount pre-filled
        │       ├── For partially_paid: remaining amount pre-filled
        │       └── For paid/cancelled: hidden
        ├── Payments List Table
        │   ├── Date, Amount, Method, Ref, Status
        │   └── Clickable rows → navigate to PaymentDetail
        ├── Timeline
        └── ConfirmDialog for cancellations
```

### Payment Module (client/src/modules/payments/) — Standalone

```
payments/
├── components/
│   ├── PaymentStatusBadge.jsx    — Keep as-is
│   ├── PaymentFilters.jsx        — Keep as-is
│   ├── PaymentTable.jsx          — Keep as-is
│   └── PaymentForm.jsx           — Keep as-is (modal form, reusable)
│
└── pages/
    ├── PaymentList.jsx           — Keep as-is
    └── PaymentDetail.jsx         — Keep as-is
```

### Invoice Table Status Dropdown (Clean)

| Invoice Status | Dropdown Options |
|---------------|-----------------|
| `draft` | Send, Cancel |
| `sent` | Cancel (no "Mark Paid" — that's a payment action) |
| `partially_paid` | Cancel |
| `overdue` | Cancel |
| `paid` | (no options) |
| `cancelled` | (no options) |

### Invoice Detail Action Buttons

| Invoice Status | Primary Buttons | Payment Buttons |
|---------------|----------------|-----------------|
| `draft` | Edit, Send, Delete | (none) |
| `sent` | Resend, Cancel | **Mark as Paid**, Record Payment |
| `partially_paid` | Resend, Cancel | **Collect Remaining (₹X)**, Record Payment |
| `overdue` | Resend, Cancel | **Mark as Paid**, Record Payment |
| `paid` | PDF, Print, Resend | (payment buttons hidden — already paid) |
| `cancelled` | PDF, Print | (payment buttons hidden — cancelled) |

Note: "Mark as Paid" and "Collect Remaining" are UI shortcuts that call `POST /api/payments`, NOT `PATCH /invoices/:id/status`.

---

## Implementation Order

### Phase 1: Backend — Clean Separation

| Step | File | Change | Risk |
|------|------|--------|------|
| 1.1 | `invoice.service.js` | Remove payment creation from `updateInvoiceStatus`. Allow only: draft→sent, X→cancelled. Remove 'paid' from VALID_TRANSITIONS entirely | **High** — this is the core fix |
| 1.2 | `invoice.repository.js` | `countByStatus` returns partial_paid (already works), `getRevenueStats` includes partially_paid (already fixed), `countOverdue` includes partially_paid (already fixed) | Low |
| 1.3 | `payment.service.js` | `recalculateInvoicePayment` — add guard: don't change status if invoice is `paid` or `cancelled` (already handled? check) | Medium |
| 1.4 | `payment.validation.js` | Ensure `createPaymentSchema` requires: invoice, amount, paymentMethod. Make paymentDate optional (default now) | Low |

### Phase 2: Client — Invoice Module Cleanup

| Step | File | Change | Risk |
|------|------|--------|------|
| 2.1 | `InvoiceTable.jsx` | Rewrite STATUT_TRANSITIONS — remove 'paid' option. Add `partially_paid` with only Cancel. Add Record Payment icon button for sent/partial/overdue | Medium |
| 2.2 | `InvoiceList.jsx` | Stat cards include partially_paid (already done), revenue bar (already done) | Low |
| 2.3 | `InvoiceDetail.jsx` | **REWRITE payment section**: Remove all direct payment-creation from action buttons. Action buttons only: Send, Cancel, Resend. Payment buttons: "Record Payment" + "Mark as Paid"/"Collect Remaining" as shortcuts that call POST /api/payments via PaymentForm | **High** |

### Phase 3: Client — Payment Module (fresh rebuild)

| Step | File | Change | Risk |
|------|------|--------|------|
| 3.1 | `paymentApi.js` | Review cache tags — ensure createPayment properly invalidates invoice tags | Medium |
| 3.2 | `PaymentForm.jsx` | Ensure reusable — used both in PaymentList standalone and embedded in InvoiceDetail | Low |
| 3.3 | `PaymentDetail.jsx` | Show invoice summary (total, paid, balance) similar to InvoiceDetail payment section | Low |

---

## Data Model (No changes needed)

### Invoice (keep as-is)
```
invoiceNumber, client, project, issueDate, dueDate, status, items,
subtotal, taxRate, taxAmount, discountPercent, discountAmount, total,
paidAmount (Number, default 0), balanceDue (Number, default 0),
billingAddress, notes, termsConditions, createdBy,
sentAt, paidAt, cancelledAt, templateId
```

**Pre-save hook**: Recalculates item.amounts, subtotal, taxAmount, discountAmount, total, balanceDue

### Payment (keep as-is)
```
invoice, client, amount, paymentMethod, referenceNo, notes, paymentDate,
status (completed/pending/failed/refunded), createdBy, timestamps
```

---

## Edge Cases & Guards

| Scenario | Expected Behavior |
|----------|------------------|
| Try to add payment to cancelled invoice | Reject: 400 "Cannot add payment to a cancelled invoice" |
| Try to add payment to already fully paid invoice | Reject: 400 "Invoice is already fully paid" |
| Delete only payment on a paid invoice | Invoice reverts to sent/draft based on paidAmount=0 |
| Amount exceeds balanceDue | Allow it (overpayment) — balanceDue becomes negative? OR cap at invoice.total? **Decision: Allow up to invoice.total, cap at that** |
| Payment amount = 0 | Invalid — min 1 |
| Edit payment amount higher | Recalculates invoice, may go from partial to paid |
| Edit payment amount lower | Recalculates invoice, may revert from paid to partial |
| Partial payment on overdue invoice | Invoice transitions to partially_paid (payment received, still late) |
| Full payment on overdue invoice | Invoice transitions to paid |

---

## Verification Criteria

After implementation:
1. ✅ POST /api/payments creates Payment doc AND updates invoice.paidAmount + balanceDue
2. ✅ POST /api/payments auto-transitions invoice: sent→partially_paid→paid
3. ✅ PATCH /invoices/:id/status ONLY handles non-financial transitions (sent, cancelled)
4. ✅ Invoice table status dropdown does NOT show "Mark Paid"
5. ✅ Invoice detail "Mark as Paid" button creates payment via POST /api/payments
6. ✅ Invoice detail shows correct paidAmount, balanceDue, progress bar
7. ✅ Deleting a payment recalculates invoice correctly
8. ✅ Stats include partially_paid count
9. ✅ No duplicate payments created for same invoice
10. ✅ Pre-save hook always fires when invoice financials change
