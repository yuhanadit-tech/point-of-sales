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
  
audit_logs
```

### Relasi Lengkap
```
users          1 ──── N  orders
users          1 ──── N  audit_logs
orders         1 ──── N  order_items
orders         1 ──── 1  payments
order_items    N ──── 1  products
products       N ──── 1  categories
```

---

## 2. Tabel

### 2.1 `users`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Primary key |
| `name` | `VARCHAR(100)` | NOT NULL | Nama lengkap |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Email login |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `role` | `ENUM('ADMIN','CASHIER')` | NOT NULL, DEFAULT 'CASHIER' | Hak akses |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Soft disable akun |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Auto-update via trigger |

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

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `name` | `VARCHAR(100)` | NOT NULL, UNIQUE | Nama kategori (Makanan, Minuman, dst.) |
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

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `category_id` | `UUID` | FK → categories.id, SET NULL | Nullable: produk tanpa kategori tetap valid |
| `sku` | `VARCHAR(50)` | UNIQUE | Kode produk (opsional, bisa auto-generate) |
| `name` | `VARCHAR(200)` | NOT NULL | Nama produk |
| `description` | `TEXT` | | Deskripsi opsional |
| `price` | `NUMERIC(12,2)` | NOT NULL, CHECK (price >= 0) | Harga jual dalam Rupiah |
| `cost_price` | `NUMERIC(12,2)` | CHECK (cost_price >= 0) | Harga modal (untuk laporan margin) |
| `image_url` | `TEXT` | | URL foto dari cloud storage |
| `stock` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK (stock >= 0) | Stok saat ini — constraint no-negative |
| `low_stock_threshold` | `INTEGER` | NOT NULL, DEFAULT 5 | Batas alert stok rendah |
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

> **Constraint penting:** `CHECK (stock >= 0)` mencegah stok negatif langsung di level DB
> sebagai safety net, di samping validasi di service layer.

---

### 2.4 `orders`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_number` | `VARCHAR(20)` | NOT NULL, UNIQUE | Format: `ORD-YYYYMMDD-XXXX` (generated via DB sequence) |
| `cashier_id` | `UUID` | FK → users.id, SET NULL | Kasir yang memproses |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL | Total sebelum diskon |
| `discount_amount` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Total diskon |
| `total_amount` | `NUMERIC(12,2)` | NOT NULL | Subtotal - diskon |
| `status` | `ENUM` | NOT NULL, DEFAULT 'COMPLETED' | `PENDING`, `COMPLETED`, `VOIDED` |
| `notes` | `TEXT` | | Catatan kasir |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Waktu transaksi |

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

> **Immutability:** Tabel `orders` tidak memiliki `updated_at` — transaksi yang sudah
> `COMPLETED` tidak boleh diubah, hanya bisa di-`VOID`. Void order tidak mengembalikan stok
> secara otomatis di MVP (manual adjustment via inventory).

---

### 2.5 `order_items`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_id` | `UUID` | FK → orders.id, CASCADE DELETE | |
| `product_id` | `UUID` | FK → products.id, SET NULL | Nullable: produk bisa dihapus |
| `product_name` | `VARCHAR(200)` | NOT NULL | Snapshot nama saat transaksi |
| `unit_price` | `NUMERIC(12,2)` | NOT NULL | Snapshot harga saat transaksi |
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

> **Snapshot pattern:** `product_name` dan `unit_price` disalin ke `order_items` saat
> checkout agar riwayat transaksi akurat meski harga produk berubah di masa depan.
>
> **ON DELETE RESTRICT:** Order bersifat immutable — jika ada upaya menghapus order,
> constraint akan mencegahnya dan throw error. Ini lebih aman dari CASCADE yang menghapus
> data historis secara silent.

---

### 2.6 `payments`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `order_id` | `UUID` | FK → orders.id, UNIQUE (1-to-1) | |
| `method` | `ENUM` | NOT NULL | `CASH`, `CARD`, `QRIS` |
| `amount_paid` | `NUMERIC(12,2)` | NOT NULL | Nominal yang dibayarkan |
| `change_amount` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Kembalian |
| `reference_number` | `VARCHAR(100)` | | No. referensi untuk Kartu/QRIS |
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

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, SET NULL | Aktor |
| `action` | `VARCHAR(100)` | NOT NULL | e.g. `product.price_changed`, `order.voided` |
| `entity_type` | `VARCHAR(50)` | NOT NULL | e.g. `product`, `order` |
| `entity_id` | `UUID` | | ID record yang terpengaruh |
| `metadata` | `JSONB` | | Data tambahan (nilai lama/baru) |
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

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `product_id` | `UUID` | FK → products.id, CASCADE | |
| `user_id` | `UUID` | FK → users.id, SET NULL | Admin yang melakukan adjustment |
| `delta` | `INTEGER` | NOT NULL | ±qty (positif = restock, negatif = koreksi berkurang) |
| `reason` | `TEXT` | NOT NULL | Alasan adjustment (e.g., "Pembelian supplier", "Produk rusak") |
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

> **Audit trail stok:** Setiap kali admin adjust stok, record tersimpan di sini.
> `delta` positif = restock, negatif = pengurangan manual (rusak/expired/koreksi).

---

## 3. Indexes

```sql
-- Performa query laporan harian
CREATE INDEX idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX idx_orders_cashier_id    ON orders (cashier_id);
CREATE INDEX idx_orders_status        ON orders (status);

-- Lookup order items per order
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- Produk aktif + kategori (query POS grid)
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
-- Sequence untuk counter harian
CREATE SEQUENCE order_number_seq;

-- Function untuk generate order_number
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

-- Gunakan sebagai default value (opsional, bisa juga di service layer)
-- ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT generate_order_number();
```

**Strategi:** `nextval()` dijamin unik per-database connection. Jika 2 request bersamaan,
PostgreSQL lock sequence secara internal — tidak ada race condition. Counter tidak reset
per hari di MVP (simple sequence global). Reset harian bisa ditambahkan di v1.1.

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
  id               String            @id @default(uuid())
  categoryId       String?
  category         Category?         @relation(fields: [categoryId], references: [id])
  sku              String?           @unique @db.VarChar(50)
  name             String            @db.VarChar(200)
  description      String?
  price            Decimal           @db.Decimal(12, 2)
  costPrice        Decimal?          @db.Decimal(12, 2)
  imageUrl         String?
  stock            Int               @default(0)
  lowStockThreshold Int              @default(5)
  isActive         Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  orderItems       OrderItem[]
  stockAdjustments StockAdjustment[]
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

## 7. Catatan & Keputusan

| Keputusan | Alasan |
|---|---|
| `NUMERIC(12,2)` untuk harga | Menghindari floating-point error pada kalkulasi uang |
| UUID sebagai PK | Aman untuk expose di URL; dapat di-generate client-side; tidak bocorkan sequence |
| Snapshot nama & harga di `order_items` | Menjaga akurasi riwayat meski data master berubah |
| Tidak ada `deleted_at` di `orders` | Order bersifat immutable; hanya bisa VOIDED |
| `JSONB` di `audit_logs.metadata` | Fleksibel untuk menyimpan old/new value tanpa schema kaku |
| `stock CHECK >= 0` di DB | Defense-in-depth: validasi berlapis (service + DB constraint) |
| `ON DELETE RESTRICT` di order_items | Mencegah silent delete order + items; fail loudly jika dicoba |
| `stock_adjustments` table | Audit trail untuk setiap restock / koreksi manual |
| Sequence-based order_number | Menghindari race condition; PostgreSQL lock sequence internal |
