# Architecture — Point of Sales MVP

## 1. Overview

The POS MVP is a web-based application built on a **modular monolith** architecture for
the initial phase — fast to ship, easy to debug, and splittable into microservices in the
future without major refactoring.

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│              Next.js App Router (React 18)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST + JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│         (auth middleware · rate-limit · CSP headers)        │
├──────────────┬────────────────────────┬─────────────────────┤
│  Auth Module │   POS / Order Module   │  Inventory Module   │
│  (NextAuth)  │   (cart · receipt)     │  (product · stock)  │
├──────────────┴────────────────────────┴─────────────────────┤
│                     Service Layer                           │
│            (business logic, validation, DTOs)               │
├─────────────────────────────────────────────────────────────┤
│                     Data Access Layer                       │
│                  Prisma ORM  (type-safe)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   PostgreSQL 16        │
              │  (primary datastore)   │
              └────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Choice | Min Version | Reason |
|---|---|---|---|
| Frontend | Next.js (App Router) | 15.x | SSR/SSG + API routes in one repo; file-based routing speeds up prototyping |
| UI | Tailwind CSS + shadcn/ui | 3.x / latest | Zero-runtime CSS; headless, accessible components |
| State | Zustand | 4.x | Minimal boilerplate for cart state; easy to persist to `localStorage` |
| ORM | Prisma | 5.x | Type-safe queries; controlled migrations; introspect existing DB |
| Database | PostgreSQL | 16.x | ACID compliance; JSON column for product metadata; mature ecosystem |
| Auth | NextAuth.js (Auth.js v5) | 5.x | OAuth + Credentials; session via JWT or DB session |
| Printer | react-to-print | latest | Print receipts directly from browser without a print server |
| Validation | Zod | 3.x | Schema-first validation shared between forms and API |
| Testing | Vitest + Playwright | latest | Unit (Vitest) and E2E (Playwright) |
| CI/CD | GitHub Actions | — | Lint → Test → Build → Deploy |
| Hosting | Vercel (frontend) + Railway / Supabase (DB) | — | Free tier for MVP; zero-config |

---

## 3. Folder Structure

```
point-of-sales/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # sidebar + topbar
│   │   ├── pos/page.tsx          # main cashier screen
│   │   ├── orders/page.tsx       # transaction history
│   │   ├── products/page.tsx     # product management
│   │   ├── inventory/page.tsx    # stock management
│   │   └── reports/page.tsx      # daily / monthly reports
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── products/route.ts
│       ├── orders/route.ts
│       ├── orders/[id]/route.ts      # PATCH (void)
│       ├── inventory/route.ts
│       ├── inventory/adjust/route.ts # POST stock adjustment
│       └── upload/route.ts           # POST presigned URL for R2
├── components/
│   ├── pos/
│   │   ├── ProductGrid.tsx
│   │   ├── Cart.tsx
│   │   ├── CartDrawer.tsx        # mobile bottom drawer
│   │   ├── PaymentModal.tsx
│   │   └── Receipt.tsx
│   ├── inventory/
│   └── shared/
│       ├── DataTable.tsx
│       ├── ConfirmDialog.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config + withAuth middleware
│   ├── prisma.ts                 # singleton Prisma client
│   ├── validations/              # Zod schemas
│   │   ├── product.schema.ts
│   │   ├── order.schema.ts
│   │   └── inventory.schema.ts
│   └── utils.ts
├── services/                     # business logic (framework-agnostic)
│   ├── order.service.ts
│   ├── inventory.service.ts
│   ├── upload.service.ts         # R2 presigned URL generation
│   └── report.service.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.example
└── package.json
```

---

## 4. Data Flow Between Modules

### 4.1 Transaction Flow (Happy Path)

```
Cashier                Frontend (POS Page)            API Route             DB
  │                          │                            │                  │
  │──select product──►       │                            │                  │
  │                  update cart state (Zustand)          │                  │
  │──click Pay──►            │                            │                  │
  │                  POST /api/orders ─────────────────►  │                  │
  │                          │              validate (Zod)│                  │
  │                          │              check stock   │──── SELECT ─────►│
  │                          │                            │◄─── rows ────────│
  │                          │              create order  │──── INSERT ─────►│
  │                          │              decrement     │──── UPDATE ─────►│
  │                          │◄──── 201 + receipt data ───│                  │
  │◄── show Receipt ─────────│                            │                  │
```

### 4.2 Stock Sync Flow

```
API POST /api/orders
  └─► OrderService.createOrder()
        ├─► validate payload (Zod)
        ├─► prisma.$transaction([
        │     orders.create(...)
        │     orderItems.createMany(...)
        │     product.updateMany({ decrement: qty, WHERE stock >= qty })
        │   ])
        └─► return Order + items
```

### 4.3 Authentication Flow

```
Browser → POST /api/auth/signin (credentials)
        → NextAuth verifies hash (bcrypt)
        → issue JWT (httpOnly cookie, 8 hours)
        → middleware.ts checks session on every request to /dashboard/*
```

### 4.4 File Upload Flow (Product Photos)

```
Admin                 Frontend (/products)        API Route              R2 (Cloudflare)
  │                          │                         │                       │
  │──pick photo────►         │                         │                       │
  │                  POST /api/upload ──────────────►  │                       │
  │                          │        generate presigned PUT URL               │
  │                          │◄───── { url, key } ─────│                       │
  │                  PUT <presigned-url> ──────────────────────────────────────►│
  │                          │◄──────────────── 200 OK ───────────────────────│
  │                  PATCH /api/products/:id ────────► │                       │
  │                          │         { imageUrl: R2_PUBLIC_URL + key }       │
  │◄── photo saved ──────────│                         │                       │
```

**Upload Service (`services/upload.service.ts`):**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const UploadService = {
  async getPresignedUrl(key: string, contentType: string) {
    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(r2, cmd, { expiresIn: 300 }) // 5 minutes
    return { url, publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` }
  },
}
```

### 4.5 Stock Adjustment Flow

```
Admin              Frontend (/inventory)      API Route              DB
  │                       │                       │                   │
  │──click Adjust──►      │                       │                   │
  │                 POST /api/inventory/adjust ──► │                   │
  │                       │           validate (Zod + admin check)    │
  │                       │                       │── $transaction ──►│
  │                       │                       │   INSERT stock_adjustments
  │                       │                       │   UPDATE products.stock += delta
  │                       │◄──── 200 + new stock ─│                   │
  │◄── update stock UI ───│                       │                   │
```

---

## 5. Technical Decisions

### 5.1 Rate Limiting
Applied in `middleware.ts` using **`@upstash/ratelimit`** (Redis-backed, runs on Vercel Edge):

| Route Pattern | Limit | Window |
|---|---|---|
| `POST /api/auth/signin` | 10 req | per 15 minutes per IP |
| `POST /api/orders` | 120 req | per minute per user |
| `GET /api/*` (read) | 300 req | per minute per user |
| `POST /api/upload` | 20 req | per minute per user |

**Implementation in `middleware.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(120, '1 m'),
})
// Check ratelimit before forwarding to route handler
// Return 429 Too Many Requests if exceeded
```

### 5.2 Modular Monolith (not Microservices)
**Reason:** Small team; zero internal latency; single deployment artifact; split into
services only when real traffic / complexity justifies it (YAGNI principle).

### 5.3 Prisma + PostgreSQL (not another ORM or NoSQL)
**Reason:** POS data is inherently relational (product → order_item → order → payment).
Prisma generates types consumed directly by TypeScript without manual DTOs.
PostgreSQL UUID + foreign keys ensure data integrity.

### 5.4 Zustand for Cart (not Redux / Context)
**Reason:** Cart is **ephemeral local state** — no server sync needed.
Zustand `persist` middleware saves to `localStorage` automatically, so cart survives
refresh without any boilerplate.

### 5.5 App Router (not Pages Router)
**Reason:** Layout nesting (`layout.tsx`) eliminates duplication for sidebar/topbar.
Server Components reduce bundle size; data fetching co-located with UI.

### 5.6 Zod as Single Source of Validation Truth
Zod schemas defined in `lib/validations/` are reused in:
- React Hook Form (`zodResolver`)
- API route handler (request body parsing)
- Prisma seed / testing

### 5.7 No Message Queue in MVP
Inventory decrement is performed inside `prisma.$transaction()` which is atomic —
sufficient for MVP volume. A queue (BullMQ / RabbitMQ) is added only when async operations
like supplier notifications or accounting sync are needed.

### 5.8 Concurrent Stock Decrement Guard
Scenario: 2 cashiers checkout the same low-stock product simultaneously.
`prisma.$transaction()` alone is not enough — a WHERE guard is required:

```typescript
// services/order.service.ts
await prisma.$transaction(async (tx) => {
  for (const item of items) {
    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        stock: { gte: item.quantity }, // <── guard: only update if stock is sufficient
      },
      data: { stock: { decrement: item.quantity } },
    })
    if (updated.count === 0) {
      throw new Error(`Insufficient stock for product: ${item.productName}`)
    }
  }
  // ... create order + orderItems
})
```
If 2 requests hit simultaneously: one wins the update, the other gets `count === 0` →
throws 409 Conflict → frontend shows "Insufficient stock, please refresh."

### 5.9 Security Baseline
- Passwords hashed with **bcrypt** (cost factor 12)
- Session JWT stored in **httpOnly cookie** (not readable by JS)
- All API routes protected by `withAuth()` middleware
- Inputs sanitized via Zod before touching DB (no raw SQL)
- Secrets in `.env` — never committed to Git (`.gitignore`)
- CORS is not relevant in a monolith (same-origin); CSP headers configured via `next.config.js`
- File uploads only via presigned URL — backend never receives binary files directly
