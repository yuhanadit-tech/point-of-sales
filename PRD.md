# PRD — Point of Sales MVP

## 1. Overview

| Item | Detail |
|---|---|
| Product Name | POS MVP — Web Cashier Application |
| Version | 1.0 (MVP) |
| Status | In Planning |
| Owner | — |
| Target Launch | 9 weeks from kick-off |

### Problem Statement
Small business owners (food stalls, small cafes, retail shops) still record transactions
manually or via spreadsheets — error-prone, no real-time reporting, and disconnected from
stock management.

### Solution
A lightweight web-based POS application that runs in the browser (tablet/laptop), can be
operated by a cashier with minimal training, and gives the owner real-time visibility into
sales and inventory.

---

## 2. MVP Scope

### 2.1 In Scope (Must Have)

| ID | Feature |
|---|---|
| F-01 | Login / logout for cashier and admin |
| F-02 | Product grid with search & category filter |
| F-03 | Shopping cart (add, adjust quantity, remove item) |
| F-04 | Payment processing: Cash, Card (manual), QRIS (manual) |
| F-05 | Change calculation for cash payments |
| F-06 | Receipt printing (thermal 58mm & A4) |
| F-07 | Transaction history (list + detail per transaction) |
| F-08 | Product CRUD (name, category, selling price, photo, initial stock) |
| F-09 | Automatic stock decrement on successful transaction |
| F-10 | Low stock alert (dashboard notification) |
| F-11 | Daily report: total transactions, revenue, items sold |
| F-12 | Role-based access control: **Admin** vs **Cashier** |
| F-13 | Stock adjustment (manual restock / stock correction) by admin |

### 2.2 Out of Scope — Future Release

| Feature | Target Release |
|---|---|
| Per-transaction discount (%, flat, or coupon) | v1.1 |
| Payment gateway integration (Midtrans / Xendit) | v1.1 |
| Multi-outlet / multi-branch | v1.2 |
| Loyalty points & membership card | v1.2 |
| Purchase Order (PO) to supplier | v1.3 |
| Automated accounting / journal entries | v2.0 |
| Native mobile app (iOS / Android) | v2.0 |
| Offline mode (PWA + IndexedDB sync) | v2.0 |

---

## 3. Goals & Success Metrics

### 3.1 Business Goals
1. Reduce cashier transaction time to under 60 seconds per order
2. Give owners access to sales reports without manual tallying
3. Prevent negative stock caused by human error

### 3.2 Success Metrics (KPIs)

| Metric | MVP Target | How to Measure |
|---|---|---|
| Time-to-checkout | ≤ 60 seconds | Stopwatch in user testing |
| Cashier onboarding | ≤ 30 minutes without formal training | Usability test |
| Zero negative stock | 0 incidents | DB constraint + query |
| Uptime | ≥ 99% | Monitoring (UptimeRobot) |
| API error rate | < 1% of total requests | Log monitoring |
| Daily report accuracy | 100% match with manual | 1-week audit at launch |

### 3.3 User Personas

**Cashier (Budi)**
- Age 20–30, comfortable with smartphones
- Needs a fast, simple UI with minimal clicks
- Does not need access to reports or product settings

**Admin / Owner (Sari)**
- Age 30–45, basic tech literacy
- Needs visibility into stock and daily reports
- Manages products and pricing from desktop/laptop

---

## 4. Technical Requirements

### 4.1 Functional Requirements

| Code | Requirement | Priority |
|---|---|---|
| TR-01 | All API endpoints must be protected by JWT session | P0 |
| TR-02 | Stock decrement and order creation must be atomic (single DB transaction) | P0 |
| TR-03 | No negative stock — enforced by DB constraint + service-level guard | P0 |
| TR-04 | Passwords hashed with bcrypt cost factor 12 before storage | P0 |
| TR-05 | Product & order inputs validated via Zod schema | P0 |
| TR-06 | API response time ≤ 500ms (p95) under normal load | P1 |
| TR-07 | Transaction data must not be deleted (immutable / VOIDED only) | P1 |
| TR-08 | Daily reports computed from DB (not cache) in MVP | P1 |
| TR-09 | Product photos stored in cloud storage (Cloudflare R2) | P1 |
| TR-10 | Audit log for sensitive actions (login, price edit, void transaction, stock adjustment) | P2 |

### 4.2 Non-Functional Requirements

| NFR | Target |
|---|---|
| Performance | FCP ≤ 2 seconds on a 4G connection |
| Security | OWASP Top 10 mitigated; HTTPS only |
| Scalability | Handles 50 transactions/hour per outlet (MVP baseline) |
| Browser Support | Chrome/Edge ≥ 2 latest versions, Safari ≥ 16 |
| Accessibility | WCAG 2.1 Level AA |
| Availability | 99% uptime, RTO < 1 hour |

### 4.3 Infrastructure Requirements

| Component | MVP Setup |
|---|---|
| Frontend hosting | Vercel (Hobby → Pro when traffic grows) |
| Database | Supabase PostgreSQL 16 (free up to 500MB) |
| File storage | Cloudflare R2 (free 10GB) |
| Domain | Custom domain via Vercel |
| SSL | Automatic via Vercel / Let's Encrypt |
| Monitoring | UptimeRobot (free) + Vercel Analytics |

---

## 5. User Stories

### Epic: Cashier Transactions
```
US-01: As a cashier, I want to view all products in a grid so I can
       quickly find and add items to the cart.

US-02: As a cashier, I want to search for products by name or category
       so I don't have to scroll through a long list.

US-03: As a cashier, I want to enter the cash amount and have the system
       calculate the change automatically.

US-04: As a cashier, I want to print a receipt after a transaction is complete.

US-10: As a cashier, I want to reprint a receipt from the transaction history
       if the customer loses their original receipt.
```

### Epic: Product Management (Admin)
```
US-05: As an admin, I want to add a new product with a photo, name,
       price, and initial stock.

US-06: As an admin, I want to deactivate a product that is no longer sold
       without deleting its historical data.

US-07: As an admin, I want to receive a notification when a product's
       stock falls below the minimum threshold.
```

### Epic: Inventory (Admin)
```
US-11: As an admin, I want to add stock for a product (restock) and
       record the reason (e.g., "Received from supplier").

US-12: As an admin, I want to manually reduce stock as a correction
       (e.g., damaged goods, expired items) with a stated reason.
```

### Epic: Reports (Admin / Owner)
```
US-08: As an owner, I want to see today's total revenue and transaction
       count without doing manual calculations.

US-09: As an owner, I want to export transaction reports to CSV for
       bookkeeping purposes.
```

---

## 6. Acceptance Criteria (Sample)

### F-04: Payment Processing
- [ ] Cashier can select a payment method: Cash, Card, QRIS
- [ ] When Cash is selected, the amount field appears and change is calculated in real time
- [ ] Confirm button is disabled if the cash amount is less than the total
- [ ] After confirmation, stock for all items decreases according to quantity
- [ ] Order is recorded in `/orders` with status `COMPLETED`
- [ ] Receipt can be printed within 2 clicks after transaction completes

### F-12: Role-Based Access
- [ ] Cashier can only access `/pos` and `/orders` (read-only)
- [ ] Admin can access all pages including `/products`, `/inventory`, `/reports`
- [ ] Direct URL access to unauthorized pages → redirect to `/pos` or `/login`

### F-13: Stock Adjustment
- [ ] Admin can access the `/inventory` page
- [ ] Clicking [Adjust Stock] on a product opens a modal
- [ ] Modal contains: ±qty input and reason field (required)
- [ ] Submit → POST /api/inventory/adjust
- [ ] Backend records adjustment in `stock_adjustments` table + updates `products.stock`
- [ ] Adjustment is recorded in the audit log

---

## 7. Milestones & Timeline (9 Weeks)

| Week | Deliverable |
|---|---|
| 1 | Project setup, DB schema, auth (login/logout), base layout |
| 2 | Product CRUD + photo upload (R2 presigned URL) |
| 3 | POS screen: product grid + cart (F-02, F-03) |
| 4 | Payment processing + receipt + stock decrement (F-04–F-06) |
| 5 | Transaction history + stock adjustment (F-07, F-13) |
| 6 | Daily reports + low stock alert + void order (F-10, F-11) |
| 7 | QA + bug fix (critical path: checkout, auth, stock) |
| 8 | Usability test + UI polish (empty states, mobile cart) |
| 9 | Production deploy, monitoring setup, documentation |

**Buffer:** Week 9 is a buffer — if Weeks 3–6 are on track, production deploy can be moved up to Week 8.
