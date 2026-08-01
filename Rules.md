# Rules — Point of Sales MVP

> This document is the **single source of truth** for coding conventions, style guides,
> and constraints that all contributors (human or AI) must follow.

---

## 1. Core Principles

1. **Correctness over cleverness** — clear code is better than clever code.
2. **Minimal surface area** — only add code when there is a real need (YAGNI).
3. **Fail loudly** — validate early, throw explicit errors, never silent-fail.
4. **Security by default** — user data, credentials, and financial transactions must
   always be protected. See the Security section.

---

## 2. Language & Runtime

| Item | Choice |
|---|---|
| Language | TypeScript 5.x (strict mode ON) |
| Runtime | Node.js LTS (≥ 20) |
| Package manager | `pnpm` (consistent lockfile) |
| Formatter | Prettier (config in `.prettierrc`) |
| Linter | ESLint with `next/core-web-vitals` + `@typescript-eslint` ruleset |

### TypeScript Rules
- `"strict": true` in `tsconfig.json` — mandatory, must not be disabled.
- `any` is forbidden. Use `unknown` with narrowing when the type is uncertain.
- Every public function in `services/` must have an explicit return type.
- `interface` for data shapes / DTOs; `type` for unions and intersections.

---

## 3. Naming Convention

| Context | Convention | Example |
|---|---|---|
| File & folder | kebab-case | `order-service.ts`, `product-card.tsx` |
| React component | PascalCase | `ProductCard`, `CartPanel` |
| Variable & function | camelCase | `totalAmount`, `createOrder()` |
| Global constant | SCREAMING_SNAKE | `LOW_STOCK_THRESHOLD` |
| Prisma model | PascalCase | `Order`, `OrderItem` |
| DB column | snake_case | `order_number`, `created_at` |
| Env variable | SCREAMING_SNAKE | `DATABASE_URL`, `NEXTAUTH_SECRET` |
| Zod schema | camelCase + `Schema` suffix | `createOrderSchema`, `productSchema` |

---

## 4. File Structure

### 4.1 React Components
Each component lives in its own file. Order within the file:
```typescript
// 1. Imports (external → internal → types → styles)
// 2. Type definitions (Props interface)
// 3. Component-level constants (if any)
// 4. Main component (default export)
// 5. Small sub-components (named export, if any)
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
  { roles: ['ADMIN'] } // only admins can create products
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

## 5. Validation

- **Always** validate API input with Zod before touching the DB.
- Use `schema.safeParse()` in API routes (not `schema.parse()`) to return an informative
  400 response on failure.
- Zod schemas must live in `lib/validations/` and be exported for reuse in forms.
- Do not duplicate validation logic in the service layer if it already exists in the schema.

```typescript
// CORRECT
const parsed = createOrderSchema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 })

// WRONG — throws directly, cannot be caught gracefully
const data = createOrderSchema.parse(body)
```

---

## 6. Error Handling

- API routes **must not** return stack traces or internal error messages to the client.
- Log error details server-side (`console.error` or logger), return a generic message.
- Use the correct HTTP status codes:

| Status | Usage |
|---|---|
| 200 | GET / PUT success with body |
| 201 | POST success (resource created) |
| 400 | Validation failure / invalid input |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate SKU, insufficient stock) |
| 429 | Rate limit exceeded |
| 500 | Server error (do not expose details) |

```typescript
// CORRECT
try {
  const order = await OrderService.create(data)
  return NextResponse.json(order, { status: 201 })
} catch (err) {
  console.error('[POST /api/orders]', err)
  return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 })
}

// WRONG
} catch (err) {
  return NextResponse.json({ error: err.message }, { status: 500 }) // leaks internal info
}
```

---

## 7. Database & Prisma

- **All** operations involving order creation + stock decrement **must** use
  `prisma.$transaction()`.
- Do not write raw SQL unless absolutely necessary (and it must be reviewed).
- The `prisma` client is instantiated as a singleton in `lib/prisma.ts`:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- Migrations must be reviewed before being applied to production.
- Never delete a column that is still referenced in code without a migration first.

---

## 8. Security (Mandatory)

### 8.1 Credentials & Secrets
- **FORBIDDEN:** Hardcoding API keys, secrets, passwords, or connection strings in code.
- All secrets go in `.env` (local) and environment variables (production).
- `.env` **must not** be committed to Git. Use `.env.example` as a template.

### 8.2 Authentication & Authorization
- Every API route that mutates data **must** be wrapped with `withAuth()` middleware.
- Role checks are performed in the service layer or API route — not only in the frontend.
- Session JWT is stored in an httpOnly cookie — never in `localStorage`.

### 8.3 Input
- Never interpolate user input directly into SQL queries.
- Use Prisma (parameterized queries by default) for all DB operations.

### 8.4 Logging
- **FORBIDDEN:** Logging passwords, tokens, or PII.
- Log only `user_id`, `action`, and `entity_id` for the audit trail.

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
1. Extract session from cookie via NextAuth `getServerSession()`
2. If no session → return `401 Unauthorized`
3. If `options.roles` is specified and user's role does not match → return `403 Forbidden`
4. Inject `req.user` with shape `{ id: string, email: string, role: UserRole }`
5. Call the handler with the augmented request

**Examples:**
```typescript
// Admin only
export const DELETE = withAuth(
  async (req) => {
    const { id } = req.user // type-safe
    // ...
  },
  { roles: ['ADMIN'] }
)

// Any authenticated user
export const GET = withAuth(async (req) => {
  // req.user is available
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

All secrets are stored in `.env` (local) or environment variables on the hosting platform (Vercel).

**Required variables:**

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Supabase connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | JWT signing key (32+ random chars) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL (production: `https://pos.example.com`) |
| `R2_ACCOUNT_ID` | `abc123...` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | `xxx` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | `yyy` | R2 secret key |
| `R2_BUCKET_NAME` | `pos-mvp-uploads` | Bucket name |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | Public CDN URL for uploaded files |

**Setup:**
1. Copy `.env.example` → `.env`
2. Fill in all variables from the Supabase dashboard (DB) and Cloudflare R2 (storage)
3. Never commit `.env` (already in `.gitignore`)

---

## 11. Testing

| Level | Tool | Coverage Target |
|---|---|---|
| Unit | Vitest | Service layer: ≥ 80% |
| Integration | Vitest + Prisma test DB | API routes: happy path + error cases |
| E2E | Playwright | Core flow: login → checkout → receipt |

### Testing Rules
- Test file names: `*.test.ts` (unit) / `*.spec.ts` (E2E).
- Tests must be **independent** — no dependency on execution order.
- Use factory functions to create test data, not hardcoded values.
- Mock external dependencies (payment, storage) in unit tests.

---

## 12. Git & Commit Convention

### Branch Naming
```
feat/pos-cart-functionality
fix/stock-decrement-bug
chore/update-prisma-client
docs/update-architecture
```

### Commit Messages (Conventional Commits)
```
feat(pos): add cart quantity controls
fix(inventory): prevent negative stock on concurrent orders
docs(schema): add audit_logs table
chore(deps): bump prisma to 5.x
test(order): add unit tests for OrderService.create
```

### Pull Request Rules
- PR must pass all CI checks (lint, typecheck, test) before merging.
- Minimum 1 review before merging to `main`.
- Never push directly to `main`.

---

## 13. Production Migration Runbook

When applying a migration to the production database:

1. **Backup the database** — take a snapshot via Supabase dashboard or `pg_dump`
2. **Dry-run locally** — test migration on a local DB seeded with production-like data
3. **Check status** — `pnpm prisma migrate status` in the production environment
4. **Apply** — `pnpm prisma migrate deploy` (auto-applies pending migrations)
5. **Smoke test** — hit critical API routes (login, create order, check stock)
6. **Rollback plan** — if something goes wrong:
   - Restore DB snapshot
   - Revert the commit that added the migration
   - Redeploy the previous version

**NEVER** run `prisma migrate dev` in production — it generates new migrations.
Use `prisma migrate deploy` to apply already-committed migrations.

---

## 14. Constraints for AI / Automated Contributors

If you are an AI or automated tool contributing to this repository, follow these rules:

1. **Do not modify the following files without explicit instruction:**
   - `prisma/schema.prisma` (DB schema)
   - `lib/auth.ts` (authentication configuration)
   - `.env.example`
   - Migration files in `prisma/migrations/`

2. **Do not add new dependencies** without documenting the reason in the PR description.

3. **Do not generate placeholder comments or TODOs** in production code. If something is
   not yet implemented, create an issue first.

4. **Follow the naming convention** — do not change established conventions without discussion.

5. **Do not expose error details** in API responses (see Error Handling section).

6. **Every change to the service layer** must be accompanied by a unit test.

7. **Do not disable ESLint rules** (`// eslint-disable`) without a clear explanatory comment.

---

## 15. Pre-Merge Checklist

- [ ] Code formatted with Prettier (`pnpm format`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)
- [ ] No secrets or credentials in the code
- [ ] New API routes are protected with `withAuth()`
- [ ] Zod validation added for any new inputs
- [ ] No `console.log` left in production code
