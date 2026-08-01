# Design — Point of Sales MVP

## 1. UI/UX Flow

### 1.1 Sitemap

```
/login
  └─► /dashboard
        ├─► /pos              ← main cashier screen (default after login)
        ├─► /orders           ← transaction history & detail
        ├─► /products         ← product CRUD
        ├─► /inventory        ← stock management
        └─► /reports          ← sales summary
```

### 1.2 User Journey — Cashier (Core Flow)

```
[Open /pos]
  │
  ├─ View product grid (photo, name, price)
  │
  ├─ Click product → added to Cart Panel (right side)
  │    ├─ Adjust quantity
  │    └─ Remove item
  │
  ├─ Click [Pay]
  │    └─ Payment Modal
  │         ├─ Select method: Cash / Card / QRIS
  │         ├─ Enter amount (cash → calculates change)
  │         └─ Click [Confirm]
  │
  └─ Show Receipt (print preview)
       ├─ Click [Print]
       └─ Click [New Transaction] → back to /pos
```

### 1.3 User Journey — Admin / Manager

```
[/products]
  ├─ Add product (name, category, price, stock, photo)
  ├─ Edit product
  └─ Deactivate product (soft delete)

[/inventory]
  ├─ View stock for all products
  ├─ Adjust stock (restock or manual correction)
  └─ Low stock alert (stock ≤ threshold)

[/reports]
  ├─ Today's summary (total transactions, revenue, items sold)
  ├─ Sales chart for 7 / 30 days
  └─ Export CSV
```

---

## 2. Design System

### 2.1 Colors

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#2563EB` | CTA button, active link |
| `primary-hover` | `#1D4ED8` | Hover state |
| `success` | `#16A34A` | Paid status, safe stock level |
| `warning` | `#CA8A04` | Low stock, needs attention |
| `danger` | `#DC2626` | Error, delete, out of stock |
| `neutral-50` | `#F9FAFB` | Page background |
| `neutral-100` | `#F3F4F6` | Card surface |
| `neutral-700` | `#374151` | Body text |
| `neutral-900` | `#111827` | Heading |

### 2.2 Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Display / Heading | Inter | 24px / 20px / 18px | 700 / 600 |
| Body | Inter | 15px | 400 |
| Label / Caption | Inter | 13px | 500 |
| Monospace (code / SKU) | ui-monospace, SFMono-Regular, Consolas, monospace | 13px | 400 |

### 2.3 Spacing & Grid

- Base unit: **4px**
- Component padding: `p-4` (16px) / `p-6` (24px)
- Gap between components: `gap-4` or `gap-6`
- Sidebar width: **240px** (collapsed: **64px**)
- Content area: fluid, max-width **1280px**

### 2.4 Radius & Shadow

| Token | Value |
|---|---|
| `rounded` | 6px |
| `rounded-lg` | 10px |
| `rounded-full` | 9999px (badge, avatar) |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` |
| `shadow-md` | `0 4px 6px rgba(0,0,0,.07)` |

---

## 3. Core Components

### 3.1 ProductCard
```
┌────────────────────┐
│  [product photo]   │
│  Product Name      │
│  Category          │
│  Rp 25,000         │
│  Stock: 48         │
└────────────────────┘
```
- Props: `product: Product`, `onAdd: () => void`
- State: loading when added to cart
- Disabled + faded when `stock === 0`

### 3.2 CartPanel
```
┌──────────────────────────────────┐
│  Cart                      (3)   │
├──────────────────────────────────┤
│  Iced Latte       x2  Rp 50,000  │
│  Croissant        x1  Rp 22,000  │
├──────────────────────────────────┤
│  Total                Rp 72,000  │
├──────────────────────────────────┤
│         [Pay Now]                │
└──────────────────────────────────┘
```
**Desktop (`md` ≥ 768px):**
- Sticky on the right side of the screen (min-height: 100vh, width: 360px)
- Slide-in animation when item is added

**Mobile (`< md`):**
- Bottom drawer / slide-up sheet (height: 60% of screen when open)
- Floating cart button (bottom-right, fixed) showing item count badge
- Tap button → drawer slides up from bottom
- Swipe down or tap backdrop → close drawer

### 3.3 PaymentModal
- Overlay dialog (modal)
- Tabs: **Cash | Card | QRIS**
- Cash: enter amount → shows change in real time
- QRIS: display QR placeholder (payment gateway integration out of MVP scope)
- Confirm button disabled until amount is valid

### 3.4 Receipt
- A4 / 58mm thermal layout toggle
- Info: store name, address, date, receipt number, cashier
- Item table: name, qty, unit price, subtotal
- Total, payment method, change
- Footer: "Thank you for your purchase!"

### 3.5 DataTable (shared)
- Sortable columns
- Pagination (10 / 25 / 50 rows per page)
- Filter bar (search + category / status dropdown)
- Export CSV button

### 3.6 StockBadge
- `> threshold` → green `In Stock`
- `≤ threshold` → yellow `Low Stock`
- `0` → red `Out of Stock`

---

## 4. Page Detail

### 4.1 `/pos` — Cashier Screen
```
┌────────────────────────────────────────────────────────────┐
│ Topbar: Logo | Cashier Name | Shift | Logout               │
├──────────────────────────────────────┬─────────────────────┤
│  Search bar + category filter        │                     │
│                                      │   Cart Panel        │
│  ┌──────┐ ┌──────┐ ┌──────┐          │   (sticky)          │
│  │ Prod │ │ Prod │ │ Prod │  ...      │                     │
│  └──────┘ └──────┘ └──────┘          │                     │
│  ┌──────┐ ┌──────┐ ┌──────┐          │                     │
│  │ Prod │ │ Prod │ │ Prod │  ...      │   [Pay Now]         │
│  └──────┘ └──────┘ └──────┘          │                     │
└──────────────────────────────────────┴─────────────────────┘
```
- Grid: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Infinite scroll or pagination (25 products per page)

### 4.2 `/products` — Product Management
- Toolbar: [+ Add Product] [Search] [Filter Category]
- Table: Photo | Name | SKU | Category | Price | Stock | Status | Actions
- Add / edit form: drawer / dialog

### 4.3 `/orders` — Transaction History
- Table: Order No. | Date | Cashier | Total | Status | Actions
- Status badge: `COMPLETED` (green), `VOIDED` (red)
- Actions (per row):
  - [Detail] → sheet / modal showing order items + payment info
  - [Reprint] → re-open Receipt component for printing
  - [Void] (admin only) → ConfirmDialog → PATCH /api/orders/:id `{ status: "VOIDED" }`
- Voided order row: opacity-50 + red badge "Cancelled"

### 4.4 `/inventory` — Stock Management
- Table: Photo | Name | SKU | Stock | Alert | Actions
- Alert: StockBadge (in stock / low stock / out of stock)
- Actions:
  - [Adjust Stock] → modal with ±qty input + reason → POST /api/inventory/adjust

### 4.5 `/reports` — Sales Reports
- KPI cards: Today's Transactions, Revenue, Items Sold, Average Order Value
- Bar chart: daily sales (7 / 30 days) — recharts / nivo
- Table of top 10 best-selling products

---

## 4.6 Empty States

| View | Condition | Icon | Copy | CTA |
|---|---|---|---|---|
| Product Grid | No products yet | 📦 | "No products yet. Add your first product to start selling." | [+ Add Product] |
| Cart | Cart is empty | 🛒 | "Cart is empty. Select a product to start a transaction." | — |
| Orders | No transactions | 📝 | "No transactions today." | — |
| Reports | No data | 📊 | "No data to display yet. Complete your first transaction." | — |
| Inventory (out of stock) | Filter = out, 0 results | ✅ | "All products are in stock!" | — |

### 4.7 Loading / Skeleton States

| Component | Pattern |
|---|---|
| ProductGrid | 6 × ProductCard skeleton (gray placeholder + pulse animation) |
| DataTable | 10 × row shimmer (3 main columns as gray bars) |
| KPI Card | Value → shimmer bar (60% width) |
| Bar Chart | Gray placeholder bars with pulse |
| Cart | Line-item shimmer when item is being added (200ms) |

---

## 5. Technical Design Decisions (Revised)

### 5.1 Server Components vs Client Components
| Component | Type | Reason |
|---|---|---|
| `/orders`, `/products` pages | Server Component | Direct data fetching without `useEffect` |
| `Cart`, `PaymentModal`, `CartDrawer` (mobile) | Client Component | Requires interactive state + gestures |
| `DataTable` | Client Component | Client-side sort, filter, pagination |
| `Receipt` | Client Component | Requires `window.print()` |

### 5.2 Discount (Removed from MVP)
Discount feature is deferred to v1.1. MVP calculates subtotal → total with no discounts.
The `discount_amount` column is retained in the schema (defaulting to 0) for forward compatibility.

### 5.3 Optimistic UI in Cart
When a cashier adds a product to the cart, Zustand state is updated **immediately** (optimistic).
No round-trip to the server while building the cart — only one POST when paying.
This makes the cashier screen feel instant.

### 5.4 Receipt Printing Without a Heavy Library
`react-to-print` injects a CSS print media query for the 58mm thermal layout.
No server-side PDF generation required in MVP.

### 5.5 Responsive Layout
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px
- Cashier screen (/pos) optimized for **landscape tablet** (counter use)
- Product & report dashboards optimized for **desktop**

### 5.6 Accessibility
- All interactive elements have `aria-label`
- Keyboard navigation with logical Tab order
- Minimum color contrast AA (WCAG 2.1)
- shadcn/ui components built on Radix — accessible by default
