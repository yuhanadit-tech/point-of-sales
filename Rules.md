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

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const product = await ProductService.create(parsed.data)
  return NextResponse.json(product, { status: 201 })
})
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

## 9. Testing

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

## 10. Git & Commit Convention

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

## 11. Batasan untuk AI / Kontributor Otomatis

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

## 12. Checklist Sebelum Merge

- [ ] Kode di-format dengan Prettier (`pnpm format`)
- [ ] Tidak ada error ESLint (`pnpm lint`)
- [ ] TypeScript compile tanpa error (`pnpm typecheck`)
- [ ] Semua test lulus (`pnpm test`)
- [ ] Tidak ada secret / credential di kode
- [ ] API baru sudah dilindungi `withAuth()`
- [ ] Validasi Zod ditambahkan untuk input baru
- [ ] Tidak ada `console.log` yang tertinggal di kode produksi
