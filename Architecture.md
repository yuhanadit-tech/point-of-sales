# Architecture — Point of Sales MVP

## 1. Overview

Aplikasi POS MVP berbasis web dengan arsitektur **monolith modular** pada fase awal agar
cepat di-ship, mudah di-debug, dan dapat di-split menjadi microservices di masa depan
tanpa refactor besar.

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│              Next.js App Router (React 18)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST + JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│          (auth middleware · rate-limit · CORS)              │
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

| Layer | Pilihan | Versi (min) | Alasan |
|---|---|---|---|
| Frontend | Next.js (App Router) | 15.x | SSR/SSG + API routes dalam satu repo; file-based routing mempercepat prototyping |
| UI | Tailwind CSS + shadcn/ui | 3.x / latest | Zero-runtime CSS; komponen headless yang aksesibel |
| State | Zustand | 4.x | Minimal boilerplate untuk cart state; mudah di-persist ke `localStorage` |
| ORM | Prisma | 5.x | Type-safe queries; migration terkontrol; introspect ke DB yang ada |
| Database | PostgreSQL | 16.x | ACID compliance; JSON column untuk metadata produk; mature ecosystem |
| Auth | NextAuth.js (Auth.js v5) | 5.x | OAuth + Credentials; session via JWT atau DB session |
| Printer | react-to-print | latest | Cetak struk langsung dari browser tanpa server print |
| Validasi | Zod | 3.x | Schema-first validation yang di-share antara form dan API |
| Testing | Vitest + Playwright | latest | Unit (Vitest) dan E2E (Playwright) |
| CI/CD | GitHub Actions | — | Lint → Test → Build → Deploy |
| Hosting | Vercel (frontend) + Railway / Supabase (DB) | — | Gratis untuk MVP; zero-config |

---

## 3. Struktur Folder

```
point-of-sales/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # sidebar + topbar
│   │   ├── pos/page.tsx          # layar kasir utama
│   │   ├── orders/page.tsx       # riwayat transaksi
│   │   ├── products/page.tsx     # manajemen produk
│   │   ├── inventory/page.tsx    # stok
│   │   └── reports/page.tsx      # laporan harian/bulanan
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── products/route.ts
│       ├── orders/route.ts
│       ├── orders/[id]/route.ts   # PATCH (void)
│       ├── inventory/route.ts
│       ├── inventory/adjust/route.ts  # POST stock adjustment
│       └── upload/route.ts        # POST presigned URL for R2
├── components/
│   ├── pos/
│   │   ├── ProductGrid.tsx
│   │   ├── Cart.tsx
│   │   ├── PaymentModal.tsx
│   │   └── Receipt.tsx
│   ├── inventory/
│   └── shared/
│       ├── DataTable.tsx
│       ├── ConfirmDialog.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # singleton Prisma client
│   ├── validations/              # Zod schemas
│   │   ├── product.schema.ts
│   │   └── order.schema.ts
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

## 4. Flow Data Antar Module

### 4.1 Alur Transaksi (Happy Path)

```
Kasir                  Frontend (POS Page)            API Route             DB
  │                          │                            │                  │
  │──pilih produk──►         │                            │                  │
  │                  update cart state (Zustand)          │                  │
  │──klik Bayar──►           │                            │                  │
  │                  POST /api/orders ─────────────────►  │                  │
  │                          │              validate (Zod)│                  │
  │                          │              check stock   │──── SELECT ─────►│
  │                          │                            │◄─── rows ────────│
  │                          │              create order  │──── INSERT ─────►│
  │                          │              decrement     │──── UPDATE ─────►│
  │                          │◄──── 201 + receipt data ───│                  │
  │◄── tampil Receipt ───────│                            │                  │
```

### 4.2 Alur Sync Stok

```
API POST /api/orders
  └─► OrderService.createOrder()
        ├─► validate payload (Zod)
        ├─► prisma.$transaction([
        │     orders.create(...)
        │     orderItems.createMany(...)
        │     product.updateMany({ decrement: qty })
        │   ])
        └─► return Order + items
```

### 4.3 Alur Autentikasi

```
Browser → POST /api/auth/signin (credentials)
        → NextAuth verifies hash (bcrypt)
        → issue JWT (httpOnly cookie, 8 jam)
        → middleware.ts checks session tiap request ke /dashboard/*
```

### 4.4 Alur File Upload (Foto Produk)

```
Admin                 Frontend (/products)        API Route              R2 (Cloudflare)
  │                          │                         │                       │
  │──pilih foto────►         │                         │                       │
  │                  POST /api/upload ──────────────►  │                       │
  │                          │        generate presigned PUT URL               │
  │                          │◄───── { url, key } ─────│                       │
  │                  PUT <presigned-url> ──────────────────────────────────────►│
  │                          │◄──────────────── 200 OK ───────────────────────│
  │                  PATCH /api/products/:id ────────► │                       │
  │                          │         { imageUrl: R2_PUBLIC_URL + key }       │
  │◄── foto tersimpan ───────│                         │                       │
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
    const url = await getSignedUrl(r2, cmd, { expiresIn: 300 }) // 5 menit
    return { url, publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` }
  },
}
```

### 4.5 Alur Stock Adjustment

```
Admin              Frontend (/inventory)      API Route              DB
  │                       │                       │                   │
  │──klik Sesuaikan──►    │                       │                   │
  │                 POST /api/inventory/adjust ──► │                   │
  │                       │           validate (Zod + admin check)    │
  │                       │                       │── $transaction ──►│
  │                       │                       │   INSERT stock_adjustments
  │                       │                       │   UPDATE products.stock += delta
  │                       │◄──── 200 + new stock ─│                   │
  │◄── update stok UI ────│                       │                   │
```

---

## 5. Keputusan Teknis

### 5.1 Rate Limiting
Pasang rate limiting di `middleware.ts` menggunakan **`@upstash/ratelimit`** (Redis-backed,
bekerja di Vercel Edge):

| Route Pattern | Limit | Window |
|---|---|---|
| `POST /api/auth/signin` | 10 req | per 15 menit per IP |
| `POST /api/orders` | 120 req | per menit per user |
| `GET /api/*` (read) | 300 req | per menit per user |
| `POST /api/upload` | 20 req | per menit per user |

**Implementasi di `middleware.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(120, '1 m'),
})
// Check ratelimit sebelum forward ke route handler
// Return 429 Too Many Requests jika exceeded
```

### 5.2 Monolith Modular (bukan Microservices)
**Alasan:** Tim kecil; latensi internal zero; deploy satu artefak; pecah menjadi services
saat traffic / kompleksitas nyata sudah ada (YAGNI principle).

### 5.3 Prisma + PostgreSQL (bukan ORM lain atau NoSQL)
**Alasan:** Data POS bersifat relasional (produk → order_item → order → payment).
Prisma menghasilkan type yang di-consume langsung oleh TypeScript tanpa manual DTO.
PostgreSQL `SERIAL` / `UUID` + foreign key menjaga integritas data.

### 5.4 Zustand untuk Cart (bukan Redux / Context)
**Alasan:** Cart adalah **ephemeral local state** — tidak perlu server sync.
Zustand `persist` middleware menyimpan ke `localStorage` secara otomatis sehingga cart
tidak hilang saat refresh, tanpa boilerplate.

### 5.5 App Router (bukan Pages Router)
**Alasan:** Layout nesting (`layout.tsx`) mengurangi duplikasi untuk sidebar/topbar.
Server Components mengurangi bundle size; data fetching co-located dengan UI.

### 5.6 Zod sebagai Single Source of Truth Validasi
Schema Zod di-define di `lib/validations/` lalu di-reuse di:
- React Hook Form (`zodResolver`)
- API route handler (parse request body)
- Prisma seed / testing

### 5.7 Tidak Pakai Message Queue di MVP
Operasi inventory decrement dilakukan di dalam `prisma.$transaction()` yang atomic —
cukup untuk volume MVP. Queue (BullMQ / RabbitMQ) ditambahkan jika ada async operation
seperti notifikasi supplier / sync ke akuntansi.

### 5.8 Concurrent Stock Decrement Guard
Skenario: 2 kasir checkout produk stok=1 secara bersamaan.
`prisma.$transaction()` saja tidak cukup — perlu guard di query:

```typescript
// services/order.service.ts
await prisma.$transaction(async (tx) => {
  for (const item of items) {
    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        stock: { gte: item.quantity }, // <── guard: hanya update jika stok cukup
      },
      data: { stock: { decrement: item.quantity } },
    })
    if (updated.count === 0) {
      throw new Error(`Stok tidak cukup untuk produk ${item.productName}`)
    }
  }
  // ... create order + orderItems
})
```
Jika 2 request bersamaan: salah satu akan menang update, yang lain `count === 0` → throw
409 Conflict → frontend tampilkan "Stok tidak cukup, silakan refresh."

### 5.9 Keamanan Dasar
- Password di-hash dengan **bcrypt** (cost factor 12)
- Session JWT disimpan di **httpOnly cookie** (tidak bisa dibaca JS)
- Semua API route dilindungi middleware `withAuth()`
- Input di-sanitize via Zod sebelum menyentuh DB (no raw SQL)
- Secret di `.env` — tidak pernah di-commit (`.gitignore`)
- CORS tidak relevan di monolith (same-origin); CSP headers dikonfigurasi via `next.config.js`
- Upload file hanya via presigned URL — backend tidak pernah menerima binary file langsung
