# Rules — Point of Sales MVP

> Dokumen ini adalah **single source of truth** untuk coding convention, style guide,
> dan batasan yang wajib dipatuhi oleh semua kontributor (manusia maupun AI).

---

## 1. Prinsip Utama

1. **Correctness over cleverness** — kode yang jelas lebih baik dari kode yang pintar.
2. **Minimal surface area** — tambahkan kode hanya jika ada kebutuhan nyata (YAGNI).
3. **Fail loudly** — validasi di awal, lempar error eksplisit, jangan silent fail.
4. **Security by default** — data user, credential, dan transaksi keuangan harus selalu
   dilindungi. Lihat bagian Keamanan.

---

## 2. Bahasa & Runtime

| Item | Pilihan |
|---|---|
| Bahasa | TypeScript 5.x (strict mode ON) |
| Runtime | Node.js LTS (≥ 20) |
| Package manager | `pnpm` (konsistensi lockfile) |
| Formatter | Prettier (konfigurasi di `.prettierrc`) |
| Linter | ESLint dengan ruleset `next/core-web-vitals` + `@typescript-eslint` |

### TypeScript Rules
- `"strict": true` di `tsconfig.json` — wajib, tidak boleh di-disable.
- Tidak boleh menggunakan `any`. Gunakan `unknown` dan narrowing jika tipe tidak pasti.
- Setiap fungsi publik di `services/` wajib memiliki tipe return eksplisit.
- `interface` untuk shape data/DTO; `type` untuk union/intersection.

---

## 3. Naming Convention

| Konteks | Convention | Contoh |
|---|---|---|
| File & folder | kebab-case | `order-service.ts`, `product-card.tsx` |
| Komponen React | PascalCase | `ProductCard`, `CartPanel` |
| Variabel & fungsi | camelCase | `totalAmount`, `createOrder()` |
| Konstanta global | SCREAMING_SNAKE | `LOW_STOCK_THRESHOLD` |
| Prisma model | PascalCase | `Order`, `OrderItem` |
| DB kolom | snake_case | `order_number`, `created_at` |
| Env variable | SCREAMING_SNAKE | `DATABASE_URL`, `NEXTAUTH_SECRET` |
| Zod schema | camelCase + `Schema` suffix | `createOrderSchema`, `productSchema` |

---

## 4. Struktur File

### 4.1 Komponen React
Setiap komponen memiliki satu file. Urutan di dalam file:
```typescript
// 1. Imports (external → internal → types → styles)
// 2. Type definitions (Props interface)
// 3. Konstanta komponen (jika ada)
// 4. Komponen utama (default export)
// 5. Sub-komponen kecil (named export, jika ada)
```

### 4.2 API Route Handler
```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { createProductSchema } from '@/lib/validations/product.schema'
import { ProductService } from '@/services/product.service'

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const product = await ProductService.create(parsed.data)
    return NextResponse.json(product, { status: 201 })
  },
  { roles: ['ADMIN'] } // hanya admin yang bisa create product
)
```

### 4.3 Service Layer
```typescript
// services/product.service.ts
import { prisma } from '@/lib/prisma'
import type { CreateProductInput } from '@/lib/validations/product.schema'

export const ProductService = {
  async create(data: CreateProductInput) { ... },
  async findById(id: string) { ... },
  async update(id: string, data: Partial<CreateProductInput>) { ... },
}
```

---

## 5. Validasi

- **Selalu** validasi input API dengan Zod sebelum menyentuh DB.
- Gunakan `schema.safeParse()` di API route (bukan `schema.parse()`) agar bisa return
  response 400 yang informatif.
- Zod schema wajib berada di `lib/validations/` dan di-export untuk re-use di form.
- Jangan duplikasi validasi logika di service layer jika sudah ada di schema.

```typescript
// BENAR
const parsed = createOrderSchema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 })

// SALAH — langsung throw, tidak bisa catch gracefully
const data = createOrderSchema.parse(body)
```

---

## 6. Error Handling

- API route **tidak boleh** mengembalikan stack trace atau pesan error internal ke client.
- Log error detail di server (`console.error` atau logger), kembalikan pesan generic.
- Gunakan HTTP status code yang tepat:

| Status | Penggunaan |
|---|---|
| 200 | GET/PUT sukses dengan body |
| 201 | POST sukses (resource dibuat) |
| 400 | Validasi gagal / input tidak valid |
| 401 | Tidak terautentikasi |
| 403 | Tidak berpermisi (role salah) |
| 404 | Resource tidak ditemukan |
| 409 | Konflik (duplikat SKU, stok tidak cukup) |
| 500 | Server error (jangan expose detail) |

```typescript
// BENAR
try {
  const order = await OrderService.create(data)
  return NextResponse.json(order, { status: 201 })
} catch (err) {
  console.error('[POST /api/orders]', err)
  return NextResponse.json({ error: 'Gagal memproses transaksi' }, { status: 500 })
}

// SALAH
} catch (err) {
  return NextResponse.json({ error: err.message }, { status: 500 }) // bocor info internal
}
```

---

## 7. Database & Prisma

- **Semua** operasi yang melibatkan create order + decrement stok **wajib** menggunakan
  `prisma.$transaction()`.
- Jangan tulis raw SQL kecuali benar-benar diperlukan (dan harus di-review).
- `prisma` client di-instantiate sebagai singleton di `lib/prisma.ts`:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- Migration wajib di-review sebelum di-apply ke production.
- Jangan hapus kolom yang masih di-reference oleh kode tanpa migration terlebih dahulu.

---

## 8. Keamanan (Wajib Dipatuhi)

### 8.1 Credential & Secret
- **DILARANG** hardcode API key, secret, password, atau connection string di kode.
- Semua secret di `.env` (local) dan environment variable (production).
- `.env` **tidak boleh** di-commit ke Git. Gunakan `.env.example` sebagai template.

### 8.2 Autentikasi & Otorisasi
- Setiap API route yang mengubah data **wajib** di-wrap dengan `withAuth()` middleware.
- Role check dilakukan di service layer atau API route, bukan hanya di frontend.
- Session JWT disimpan di httpOnly cookie — tidak boleh di `localStorage`.

### 8.3 Input
- Jangan pernah interpolate input user ke dalam query SQL secara langsung.
- Gunakan Prisma (parameterized query otomatis) untuk semua operasi DB.

### 8.4 Logging
- **DILARANG** log password, token, atau data PII pengguna.
- Log hanya `user_id`, `action`, dan `entity_id` untuk audit trail.

---

## 9. Authentication & Authorization (withAuth)

### 9.1 `withAuth()` Middleware Contract

**Location:** `lib/auth.ts`

**Signature:**
```typescript
withAuth(
  handler: (req: NextRequestWithUser) => Promise<NextResponse>,
  options?: { roles?: UserRole[] }
)
```

**Behavior:**
1. Extract session dari cookie via NextAuth `getServerSession()`
2. Jika tidak ada session → return `401 Unauthorized`
3. Jika `options.roles` di-specify dan user role tidak match → return `403 Forbidden`
4. Inject `req.user` dengan shape `{ id: string, email: string, role: UserRole }`
5. Call handler dengan req yang sudah ter-augment

**Contoh:**
```typescript
// Hanya admin
export const DELETE = withAuth(
  async (req) => {
    const { id } = req.user // type-safe
    // ...
  },
  { roles: ['ADMIN'] }
)

// Semua authenticated user
export const GET = withAuth(async (req) => {
  // req.user tersedia
})
```

**Type augmentation:**
```typescript
// lib/auth.ts
import { NextRequest } from 'next/server'

export interface NextRequestWithUser extends NextRequest {
  user: {
    id: string
    email: string
    role: 'ADMIN' | 'CASHIER'
  }
}
```

---

## 10. Environment Variables

Semua secret disimpan di `.env` (local) atau environment variable di hosting (Vercel).

**Required variables:**

| Variable | Contoh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Supabase connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | JWT signing key (32+ char random) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL (prod: `https://pos.example.com`) |
| `R2_ACCOUNT_ID` | `abc123...` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | `xxx` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | `yyy` | R2 secret |
| `R2_BUCKET_NAME` | `pos-mvp-uploads` | Bucket name |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | Public CDN URL for uploaded files |

**Setup:**
1. Copy `.env.example` → `.env`
2. Fill semua variable dengan value dari Supabase dashboard (DB) dan Cloudflare R2 (storage)
3. Jangan commit `.env` (sudah di `.gitignore`)

---

## 11. Testing

| Level | Tool | Target Coverage |
|---|---|---|
| Unit | Vitest | Service layer: ≥ 80% |
| Integration | Vitest + Prisma test DB | API routes: happy path + error |
| E2E | Playwright | Core flow: login → checkout → struk |

### Aturan Test
- Nama test file: `*.test.ts` (unit) / `*.spec.ts` (E2E).
- Test harus **independent** — tidak bergantung pada urutan eksekusi.
- Gunakan factory function untuk membuat data test, bukan hardcode.
- Mock eksternal dependency (payment, storage) di unit test.

---

## 12. Git & Commit Convention

### Branch Naming
```
feat/pos-cart-functionality
fix/stock-decrement-bug
chore/update-prisma-client
docs/update-architecture
```

### Commit Message (Conventional Commits)
```
feat(pos): add cart quantity controls
fix(inventory): prevent negative stock on concurrent orders
docs(schema): add audit_logs table
chore(deps): bump prisma to 5.x
test(order): add unit tests for OrderService.create
```

### Pull Request Rules
- PR wajib pass semua CI checks (lint, typecheck, test) sebelum merge.
- Minimal 1 review sebelum merge ke `main`.
- Jangan push langsung ke `main`.

---

## 13. Production Migration Runbook

Saat apply migration ke production database:

1. **Backup database** — ambil snapshot via Supabase dashboard atau `pg_dump`
2. **Dry-run lokal** — test migration di DB lokal yang di-seed dengan production-like data
3. **Check status** — `pnpm prisma migrate status` di production env
4. **Apply** — `pnpm prisma migrate deploy` (ini auto-apply pending migrations)
5. **Smoke test** — hit critical API routes (login, create order, check stock)
6. **Rollback plan** — jika gagal:
   - Restore snapshot DB
   - Revert commit yang menambahkan migration
   - Re-deploy versi sebelumnya

**NEVER** run `prisma migrate dev` di production — itu generate migration baru.
Gunakan `prisma migrate deploy` untuk apply migration yang sudah ter-commit.

---

## 14. Batasan untuk AI / Kontributor Otomatis

Jika Anda adalah AI atau tools otomatis yang berkontribusi ke repo ini, patuhi aturan
berikut:

1. **Jangan modifikasi file berikut tanpa instruksi eksplisit:**
   - `prisma/schema.prisma` (DB schema)
   - `lib/auth.ts` (konfigurasi autentikasi)
   - `.env.example`
   - File migration di `prisma/migrations/`

2. **Jangan tambahkan dependency baru** tanpa mendokumentasikan alasan di PR description.

3. **Jangan generate placeholder atau TODO** di kode produksi. Jika sesuatu belum
   diimplementasi, buat issue terlebih dahulu.

4. **Ikuti naming convention** — jangan ubah convention yang sudah ada tanpa diskusi.

5. **Jangan expose error detail** ke API response (lihat bagian Error Handling).

6. **Setiap perubahan pada service layer** harus disertai unit test.

7. **Jangan disable ESLint rule** (`// eslint-disable`) tanpa komentar alasan yang jelas.

---

## 15. Checklist Sebelum Merge

- [ ] Kode di-format dengan Prettier (`pnpm format`)
- [ ] Tidak ada error ESLint (`pnpm lint`)
- [ ] TypeScript compile tanpa error (`pnpm typecheck`)
- [ ] Semua test lulus (`pnpm test`)
- [ ] Tidak ada secret / credential di kode
- [ ] API baru sudah dilindungi `withAuth()`
- [ ] Validasi Zod ditambahkan untuk input baru
- [ ] Tidak ada `console.log` yang tertinggal di kode produksi
