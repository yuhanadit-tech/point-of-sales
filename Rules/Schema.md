# Database Schema — Point of Sales MVP

## Engine: PostgreSQL 16

---

## 1. ERD (Entity Relationship Diagram)

```
users ──────────────────────────┐
  │ (1)                         │
  │                             │
  │ (N) created_by              │
  ▼                             │
orders ◄──── order_items ────► products
  │                               │
  │                           categories
  │
payments (1-to-1 with orders)

stock_adjustments (N-to-1 with products)
audit_logs
```

### Full Relations
```
users             1 ──── N  orders
users             1 ──── N  audit_logs
users             1 ──── N  stock_adjustments
orders            1 ──── N  order_items
orders            1 ──── 1  payments
order_items       N ──── 1  products
products          N ──── 1  categories
stock_adjustments N ──── 1  products
```

---

## 2. Tables

### 2.1 `users`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Primary key |
| `name` | `VARCHAR(100)` | NOT NULL | Full name |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Login email |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `role` | `ENUM('ADMIN','CASHIER')` | NOT NULL, DEFAULT 'CASHIER' | Access level |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Soft-disable account |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Auto-updated via trigger |

```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          user_role     NOT NULL DEFAULT 'CASHIER',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

### 2.2 `categories`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `name` | `VARCHAR(100)` | NOT NULL, UNIQUE | Category name (Food, Drinks, etc.) |
| `slug` | `VARCHAR(100)` | NOT NULL, UNIQUE | URL-friendly, lowercase |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### 2.3 `products`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `category_id` | `UUID` | FK → categories.id, SET NULL | Nullable: product without a category is valid |
| `sku` | `VARCHAR(50)` | UNIQUE | Product code (optional, can be auto-generated) |
| `name` | `VARCHAR(200)` | NOT NULL | Product name |
| `description` | `TEXT` | | Optional description |
| `price` | `NUMERIC(12,2)` | NOT NULL, CHECK (price >= 0) | Selling price |
| `cost_price` | `NUMERIC(12,2)` | CHECK (cost_price >= 0) | Cost price (for margin reports) |
| `image_url` | `TEXT` | | Photo URL from cloud storage |
| `stock` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK (stock >= 0) | Current stock — no-negative constraint |
| `low_stock_threshold` | `INTEGER` | NOT NULL, DEFAULT 5 | Low stock alert threshold |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Soft delete |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TABLE products (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID           REFERENCES categories(id) ON DELETE SET NULL,
  sku                 VARCHAR(50)    UNIQUE,
  name                VARCHAR(200)   NOT NULL,
  description         TEXT,
  price               NUMERIC(12,2)  NOT NULL CHECK (price >= 0),
  cost_price          NUMERIC(12,2)  CHECK (cost_price >= 0),
  image_url           TEXT,
  stock               INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER        NOT NULL DEFAULT 5,
  is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
```

> **Key constraint:** `CHECK (stock >= 0)` prevents negative stock at the DB level as a
> safety net, in addition to the service-layer validation (defense-in-depth).

---

### 2.4 `orders`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_number` | `VARCHAR(20)` | NOT NULL, UNIQUE | Format: `ORD-YYYYMMDD-XXXX` (generated via DB sequence) |
| `cashier_id` | `UUID` | FK → users.id, SET NULL | Cashier who processed the transaction |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL | Total before discount |
| `discount_amount` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Total discount (reserved for v1.1) |
| `total_amount` | `NUMERIC(12,2)` | NOT NULL | Subtotal − discount |
| `status` | `ENUM` | NOT NULL, DEFAULT 'COMPLETED' | `PENDING`, `COMPLETED`, `VOIDED` |
| `notes` | `TEXT` | | Cashier notes |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Transaction timestamp |

```sql
CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'VOIDED');

CREATE TABLE orders (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    VARCHAR(20)    NOT NULL UNIQUE,
  cashier_id      UUID           REFERENCES users(id) ON DELETE SET NULL,
  subtotal        NUMERIC(12,2)  NOT NULL,
  discount_amount NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2)  NOT NULL,
  status          order_status   NOT NULL DEFAULT 'COMPLETED',
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
```

> **Immutability:** The `orders` table has no `updated_at` — completed transactions cannot
> be modified, only VOIDED. A voided order does not automatically restore stock in MVP
> (manual adjustment via inventory).

---

### 2.5 `order_items`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_id` | `UUID` | FK → orders.id, ON DELETE RESTRICT | |
| `product_id` | `UUID` | FK → products.id, SET NULL | Nullable: product can be deactivated |
| `product_name` | `VARCHAR(200)` | NOT NULL | Snapshot of product name at time of transaction |
| `unit_price` | `NUMERIC(12,2)` | NOT NULL | Snapshot of price at time of transaction |
| `quantity` | `INTEGER` | NOT NULL, CHECK (quantity > 0) | |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL | unit_price × quantity |

```sql
CREATE TABLE order_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id   UUID           REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200)   NOT NULL,
  unit_price   NUMERIC(12,2)  NOT NULL,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(12,2)  NOT NULL
);
```

> **Snapshot pattern:** `product_name` and `unit_price` are copied into `order_items` at
> checkout to preserve accurate transaction history even if the product master data changes.
>
> **ON DELETE RESTRICT:** Orders are immutable — any attempt to delete an order will be
> blocked by this constraint and raise an error. This is safer than CASCADE, which would
> silently delete historical data.

---

### 2.6 `payments`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_id` | `UUID` | FK → orders.id, UNIQUE (1-to-1) | |
| `method` | `ENUM` | NOT NULL | `CASH`, `CARD`, `QRIS` |
| `amount_paid` | `NUMERIC(12,2)` | NOT NULL | Amount tendered |
| `change_amount` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Change returned |
| `reference_number` | `VARCHAR(100)` | | Reference number for Card / QRIS |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'QRIS');

CREATE TABLE payments (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID            NOT NULL UNIQUE REFERENCES orders(id),
  method           payment_method  NOT NULL,
  amount_paid      NUMERIC(12,2)   NOT NULL,
  change_amount    NUMERIC(12,2)   NOT NULL DEFAULT 0,
  reference_number VARCHAR(100),
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
```

---

### 2.7 `audit_logs`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, SET NULL | Actor |
| `action` | `VARCHAR(100)` | NOT NULL | e.g. `product.price_changed`, `order.voided` |
| `entity_type` | `VARCHAR(50)` | NOT NULL | e.g. `product`, `order` |
| `entity_id` | `UUID` | | ID of the affected record |
| `metadata` | `JSONB` | | Additional data (old/new values) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### 2.8 `stock_adjustments`

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `product_id` | `UUID` | FK → products.id, CASCADE | |
| `user_id` | `UUID` | FK → users.id, SET NULL | Admin who performed the adjustment |
| `delta` | `INTEGER` | NOT NULL | ±qty (positive = restock, negative = correction) |
| `reason` | `TEXT` | NOT NULL | Reason for adjustment (e.g., "Received from supplier", "Damaged goods") |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TABLE stock_adjustments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  delta      INTEGER     NOT NULL,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **Stock audit trail:** Every time an admin adjusts stock, a record is created here.
> Positive `delta` = restock, negative `delta` = manual reduction (damaged/expired/correction).

---

## 3. Indexes

```sql
-- Performance for daily report queries
CREATE INDEX idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX idx_orders_cashier_id    ON orders (cashier_id);
CREATE INDEX idx_orders_status        ON orders (status);

-- Lookup order items by order
CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- Active products + category filter (POS grid query)
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_is_active   ON products (is_active);

-- Audit trail
CREATE INDEX idx_audit_logs_entity    ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id   ON audit_logs (user_id);

-- Stock adjustment history
CREATE INDEX idx_stock_adj_product_id ON stock_adjustments (product_id);
CREATE INDEX idx_stock_adj_created_at ON stock_adjustments (created_at DESC);
```

---

## 4. Trigger: `updated_at` Auto-Update

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 5. Order Number Generation (Sequence-Based)

```sql
-- Sequence for order counter
CREATE SEQUENCE order_number_seq;

-- Function to generate order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  date_prefix TEXT;
  seq_num     TEXT;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_num     := LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  RETURN 'ORD-' || date_prefix || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

-- Can be used as a default value (or called from the service layer)
-- ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT generate_order_number();
```

**Strategy:** `nextval()` is guaranteed unique per database connection. PostgreSQL locks
the sequence internally on concurrent calls — no race condition possible. The counter does
not reset daily in MVP (simple global sequence). Daily reset can be added in v1.1.

---

## 6. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String            @id @default(uuid())
  name             String            @db.VarChar(100)
  email            String            @unique @db.VarChar(255)
  passwordHash     String            @db.VarChar(255)
  role             UserRole          @default(CASHIER)
  isActive         Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  orders           Order[]
  auditLogs        AuditLog[]
  stockAdjustments StockAdjustment[]
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique @db.VarChar(100)
  slug      String    @unique @db.VarChar(100)
  createdAt DateTime  @default(now())
  products  Product[]
}

model Product {
  id                String            @id @default(uuid())
  categoryId        String?
  category          Category?         @relation(fields: [categoryId], references: [id])
  sku               String?           @unique @db.VarChar(50)
  name              String            @db.VarChar(200)
  description       String?
  price             Decimal           @db.Decimal(12, 2)
  costPrice         Decimal?          @db.Decimal(12, 2)
  imageUrl          String?
  stock             Int               @default(0)
  lowStockThreshold Int               @default(5)
  isActive          Boolean           @default(true)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  orderItems        OrderItem[]
  stockAdjustments  StockAdjustment[]
}

model Order {
  id             String      @id @default(uuid())
  orderNumber    String      @unique @db.VarChar(20)
  cashierId      String?
  cashier        User?       @relation(fields: [cashierId], references: [id])
  subtotal       Decimal     @db.Decimal(12, 2)
  discountAmount Decimal     @default(0) @db.Decimal(12, 2)
  totalAmount    Decimal     @db.Decimal(12, 2)
  status         OrderStatus @default(COMPLETED)
  notes          String?
  createdAt      DateTime    @default(now())
  items          OrderItem[]
  payment        Payment?
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Restrict)
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  productName String   @db.VarChar(200)
  unitPrice   Decimal  @db.Decimal(12, 2)
  quantity    Int
  subtotal    Decimal  @db.Decimal(12, 2)
}

model StockAdjustment {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  delta     Int
  reason    String
  createdAt DateTime @default(now())
}

model Payment {
  id              String        @id @default(uuid())
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])
  method          PaymentMethod
  amountPaid      Decimal       @db.Decimal(12, 2)
  changeAmount    Decimal       @default(0) @db.Decimal(12, 2)
  referenceNumber String?       @db.VarChar(100)
  createdAt       DateTime      @default(now())
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String   @db.VarChar(100)
  entityType String   @db.VarChar(50)
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())
}

enum UserRole {
  ADMIN
  CASHIER
}

enum OrderStatus {
  PENDING
  COMPLETED
  VOIDED
}

enum PaymentMethod {
  CASH
  CARD
  QRIS
}
```

---

## 7. Notes & Decisions

| Decision | Reason |
|---|---|
| `NUMERIC(12,2)` for prices | Avoids floating-point drift on monetary calculations |
| UUID as PK | Safe to expose in URLs; can be generated client-side; does not leak sequence info |
| Snapshot name & price in `order_items` | Preserves accurate history even if product master data changes |
| No `deleted_at` on `orders` | Orders are immutable; can only be VOIDED |
| `JSONB` in `audit_logs.metadata` | Flexible for storing old/new values without a rigid schema |
| `stock CHECK >= 0` in DB | Defense-in-depth: layered validation (service + DB constraint) |
| `ON DELETE RESTRICT` on order_items | Prevents silent deletion of order history; fails loudly |
| `stock_adjustments` table | Audit trail for every restock or manual correction |
| Sequence-based order_number | Eliminates race conditions; PostgreSQL locks sequence internally |
