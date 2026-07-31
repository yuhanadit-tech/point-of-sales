# Design — Point of Sales MVP

## 1. UI/UX Flow

### 1.1 Sitemap

```
/login
  └─► /dashboard
        ├─► /pos              ← layar kasir utama (default setelah login)
        ├─► /orders           ← riwayat & detail transaksi
        ├─► /products         ← CRUD produk
        ├─► /inventory        ← kelola stok
        └─► /reports          ← ringkasan penjualan
```

### 1.2 User Journey — Kasir (Core Flow)

```
[Buka /pos]
  │
  ├─ Lihat grid produk (foto, nama, harga)
  │
  ├─ Klik produk → masuk Cart Panel (kanan)
  │    ├─ Ubah quantity
  │    └─ Hapus item
  │
  ├─ Klik [Bayar]
  │    └─ Modal Pembayaran
  │         ├─ Pilih metode: Tunai / Kartu / QRIS
  │         ├─ Input nominal (tunai → hitung kembalian)
  │         └─ Klik [Konfirmasi]
  │
  └─ Tampil Struk (print preview)
       ├─ Klik [Cetak]
       └─ Klik [Transaksi Baru] → kembali ke /pos
```

### 1.3 User Journey — Admin / Manajer

```
[/products]
  ├─ Tambah produk (nama, kategori, harga, stok, foto)
  ├─ Edit produk
  └─ Nonaktifkan produk (soft delete)

[/inventory]
  ├─ Lihat stok semua produk
  ├─ Stok masuk (purchase order manual)
  └─ Alert produk hampir habis (stok ≤ threshold)

[/reports]
  ├─ Ringkasan hari ini (total transaksi, omset, item terjual)
  ├─ Grafik penjualan 7 / 30 hari
  └─ Export CSV
```

---

## 2. Design System

### 2.1 Warna

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` | `#2563EB` | CTA button, link aktif |
| `primary-hover` | `#1D4ED8` | Hover state |
| `success` | `#16A34A` | Status lunas, stok aman |
| `warning` | `#CA8A04` | Stok rendah, perlu perhatian |
| `danger` | `#DC2626` | Error, hapus, stok habis |
| `neutral-50` | `#F9FAFB` | Background halaman |
| `neutral-100` | `#F3F4F6` | Surface card |
| `neutral-700` | `#374151` | Body text |
| `neutral-900` | `#111827` | Heading |

### 2.2 Tipografi

| Peran | Font | Size | Weight |
|---|---|---|---|
| Display / Heading | Inter | 24px / 20px / 18px | 700 / 600 |
| Body | Inter | 15px | 400 |
| Label / Caption | Inter | 13px | 500 |
| Monospace (kode/SKU) | JetBrains Mono | 13px | 400 |

### 2.3 Spacing & Grid

- Base unit: **4px**
- Komponen padding: `p-4` (16px) / `p-6` (24px)
- Gap antar komponen: `gap-4` atau `gap-6`
- Sidebar lebar: **240px** (collapsed: **64px**)
- Konten area: fluid, max-width **1280px**

### 2.4 Radius & Shadow

| Token | Nilai |
|---|---|
| `rounded` | 6px |
| `rounded-lg` | 10px |
| `rounded-full` | 9999px (badge, avatar) |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` |
| `shadow-md` | `0 4px 6px rgba(0,0,0,.07)` |

---

## 3. Komponen Utama

### 3.1 ProductCard
```
┌────────────────────┐
│  [foto produk]     │
│  Nama Produk       │
│  Kategori          │
│  Rp 25.000         │
│  Stok: 48          │
└────────────────────┘
```
- Props: `product: Product`, `onAdd: () => void`
- State: loading saat tambah ke cart
- Disabled + opak saat `stok === 0`

### 3.2 CartPanel
```
┌──────────────────────────────────┐
│ 🛒 Keranjang               (3)   │
├──────────────────────────────────┤
│ Kopi Susu        x2   Rp 50.000  │
│ Croissant        x1   Rp 22.000  │
├──────────────────────────────────┤
│ Subtotal              Rp 72.000  │
│ Diskon (10%)         -Rp  7.200  │
│ Total                 Rp 64.800  │
├──────────────────────────────────┤
│      [Bayar Sekarang]            │
└──────────────────────────────────┘
```
- Sticky di sisi kanan layar (min-height: 100vh)
- Animasi slide-in saat item ditambah

### 3.3 PaymentModal
- Overlay dialog (modal)
- Tab: **Tunai | Kartu | QRIS**
- Tunai: input nominal → tampil kembalian realtime
- QRIS: tampil QR placeholder (integrasi payment gateway di luar MVP)
- Tombol Konfirmasi disabled sampai nominal valid

### 3.4 Receipt
- A4 / 58mm thermal layout toggle
- Info: nama toko, alamat, tanggal, nomor struk, kasir
- Tabel item: nama, qty, harga satuan, subtotal
- Total, metode bayar, kembalian
- Footer: "Terima kasih telah berbelanja!"

### 3.5 DataTable (shared)
- Kolom sortable
- Pagination (10/25/50 per halaman)
- Filter bar (search + dropdown kategori/status)
- Export CSV button

### 3.6 StockBadge
- `> threshold` → hijau `Aman`
- `≤ threshold` → kuning `Hampir Habis`
- `0` → merah `Habis`

---

## 4. Halaman Detail

### 4.1 `/pos` — Layar Kasir
```
┌────────────────────────────────────────────────────────────┐
│ Topbar: Logo | Nama Kasir | Shift | Logout                 │
├──────────────────────────────────────┬─────────────────────┤
│  Search bar + filter kategori        │                     │
│                                      │   Cart Panel        │
│  ┌──────┐ ┌──────┐ ┌──────┐          │   (sticky)          │
│  │ Prod │ │ Prod │ │ Prod │  ...      │                     │
│  └──────┘ └──────┘ └──────┘          │                     │
│  ┌──────┐ ┌──────┐ ┌──────┐          │                     │
│  │ Prod │ │ Prod │ │ Prod │  ...      │   [Bayar]           │
│  └──────┘ └──────┘ └──────┘          │                     │
└──────────────────────────────────────┴─────────────────────┘
```
- Grid: 3 kolom (desktop), 2 kolom (tablet), 1 kolom (mobile)
- Infinite scroll atau pagination (25 produk per halaman)

### 4.2 `/products`
- Toolbar: [+ Tambah Produk] [Search] [Filter Kategori]
- Tabel: Foto | Nama | SKU | Kategori | Harga | Stok | Status | Aksi
- Form tambah/edit: drawer / dialog

### 4.3 `/reports`
- KPI cards: Transaksi Hari Ini, Omset, Produk Terjual, Rata-rata Order
- Bar chart: penjualan per hari (7/30 hari) — recharts / nivo
- Tabel 10 produk terlaris

---

## 5. Technical Design Decisions

### 5.1 Server Components vs Client Components
| Komponen | Tipe | Alasan |
|---|---|---|
| Halaman `/orders`, `/products` | Server Component | Data fetching langsung tanpa `useEffect` |
| `Cart`, `PaymentModal` | Client Component | Butuh state interaktif |
| `DataTable` | Client Component | Sort, filter, pagination client-side |
| `Receipt` | Client Component | `window.print()` |

### 5.2 Optimistic UI di Cart
Ketika kasir menambah produk ke cart, state Zustand diupdate **segera** (optimistic).
Tidak ada round-trip ke server saat membangun cart — hanya satu POST saat bayar.
Ini membuat layar kasir terasa instan.

### 5.3 Print Struk Tanpa Library Berat
`react-to-print` meng-inject CSS print media query untuk layout 58mm thermal.
Tidak butuh server-side PDF generation di MVP.

### 5.4 Responsif
- Breakpoint: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px
- Layar kasir (/pos) dioptimalkan untuk **tablet landscape** (kasir meja)
- Dashboard produk/laporan dioptimalkan untuk **desktop**

### 5.5 Aksesibilitas
- Semua interactive element punya `aria-label`
- Fokus keyboard navigable (Tab order logis)
- Kontras warna minimum AA (WCAG 2.1)
- shadcn/ui komponen berbasis Radix — aksesibel secara default
