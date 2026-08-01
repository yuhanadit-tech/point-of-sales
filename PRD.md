# PRD — Point of Sales MVP

## 1. Overview

| Item | Detail |
|---|---|
| Nama Produk | POS MVP — Aplikasi Kasir Web |
| Versi | 1.0 (MVP) |
| Status | In Planning |
| Owner | — |
| Target Launch | 8 minggu dari kick-off |

### Problem Statement
Pelaku UMKM (warung, kafe kecil, retail) masih mencatat transaksi secara manual atau
menggunakan spreadsheet yang rentan error, tidak memberikan laporan real-time, dan tidak
terintegrasi dengan manajemen stok.

### Solution
Aplikasi POS berbasis web yang ringan, berjalan di browser (tablet/laptop), dapat
digunakan kasir dengan training minimal, dan memberikan owner visibilitas penjualan
secara real-time.

---

## 2. Scope MVP

### 2.1 Dalam Scope (Must Have)

| ID | Fitur |
|---|---|
| F-01 | Login / logout kasir dan admin |
| F-02 | Tampilan produk bergrid dengan search & filter kategori |
| F-03 | Keranjang belanja (tambah, kurang, hapus item) |
| F-04 | Proses pembayaran: Tunai, Kartu (manual), QRIS (manual) |
| F-05 | Kalkulasi kembalian untuk pembayaran tunai |
| F-06 | Cetak struk (thermal 58mm & A4) |
| F-07 | Riwayat transaksi (list + detail per transaksi) |
| F-08 | CRUD produk (nama, kategori, harga jual, foto, stok) |
| F-09 | Decrement stok otomatis saat transaksi berhasil |
| F-10 | Peringatan stok rendah (alert di dashboard) |
| F-11 | Laporan harian: total transaksi, omset, produk terjual |
| F-12 | Role-based access: **Admin** vs **Kasir** |
| F-13 | Stock adjustment (restock / koreksi stok manual) oleh admin |

### 2.2 Luar Scope MVP (Future Release)

| Fitur | Release Target |
|---|---|
| Diskon per transaksi (%, flat, atau kupon) | v1.1 |
| Integrasi payment gateway (Midtrans/Xendit) | v1.1 |
| Multi-outlet / multi-cabang | v1.2 |
| Loyalty points & member card | v1.2 |
| Purchase Order (PO) ke supplier | v1.3 |
| Akuntansi / jurnal otomatis | v2.0 |
| Mobile app native (iOS/Android) | v2.0 |
| Offline mode (PWA + IndexedDB sync) | v2.0 |

---

## 3. Goals & Success Metrics

### 3.1 Business Goals
1. Mengurangi waktu proses transaksi kasir < 60 detik per order
2. Owner mendapatkan laporan penjualan tanpa rekapitulasi manual
3. Stok tidak pernah minus karena human error

### 3.2 Success Metrics (KPI)

| Metric | Target MVP | Cara Ukur |
|---|---|---|
| Time-to-checkout | ≤ 60 detik | Stopwatch user testing |
| Onboarding kasir baru | ≤ 30 menit tanpa training formal | Usability test |
| Zero stok negatif | 0 kejadian | DB constraint + query |
| Uptime | ≥ 99% | Monitoring (UptimeRobot) |
| Error rate API | < 1% dari total request | Log monitoring |
| Lap. harian akurat | 100% match dengan manual | Audit 1 minggu pertama |

### 3.3 User Personas

**Kasir (Budi)**
- Usia 20–30 tahun, familiar dengan smartphone
- Butuh UI cepat dan mudah, tidak perlu banyak klik
- Tidak perlu akses ke laporan atau setting produk

**Admin / Owner (Sari)**
- Usia 30–45 tahun, minimal literasi teknologi
- Butuh visibilitas stok dan laporan harian
- Mengelola produk dan harga dari desktop/laptop

---

## 4. Technical Requirements

### 4.1 Functional Requirements

| Kode | Requirement | Prioritas |
|---|---|---|
| TR-01 | Semua API endpoint harus terproteksi session JWT | P0 |
| TR-02 | Decrement stok dan create order dalam satu DB transaction (atomic) | P0 |
| TR-03 | Tidak ada stok negatif — DB constraint + service-level check | P0 |
| TR-04 | Password di-hash bcrypt cost 12 sebelum disimpan | P0 |
| TR-05 | Input produk & order divalidasi via Zod schema | P0 |
| TR-06 | Response time API ≤ 500ms (p95) pada load normal | P1 |
| TR-07 | Data transaksi tidak boleh dihapus (soft delete / immutable) | P1 |
| TR-08 | Laporan harian dihitung dari DB (bukan cache) pada MVP | P1 |
| TR-09 | Foto produk disimpan di cloud storage (S3 / Cloudflare R2) | P1 |
| TR-10 | Log audit untuk aksi sensitif (login, edit harga, void transaksi) | P2 |

### 4.2 Non-Functional Requirements

| NFR | Target |
|---|---|
| Performa | FCP ≤ 2 detik pada koneksi 4G |
| Keamanan | OWASP Top 10 mitigated; HTTPS only |
| Skalabilitas | Mampu handle 50 transaksi/jam per outlet (MVP baseline) |
| Browser support | Chrome/Edge ≥ 2 versi terakhir, Safari ≥ 16 |
| Aksesibilitas | WCAG 2.1 Level AA |
| Ketersediaan | 99% uptime, RTO < 1 jam |

### 4.3 Infrastructure Requirements

| Komponen | MVP Setup |
|---|---|
| Frontend hosting | Vercel (Hobby → Pro saat traffic naik) |
| Database | Supabase PostgreSQL 16 (gratis hingga 500MB) |
| File storage | Cloudflare R2 (gratis 10GB) |
| Domain | Custom domain via Vercel |
| SSL | Otomatis via Vercel / Let's Encrypt |
| Monitoring | UptimeRobot (gratis) + Vercel Analytics |

---

## 5. User Stories

### Epic: Transaksi Kasir
```
US-01: Sebagai kasir, saya ingin melihat semua produk dalam grid agar bisa
       dengan cepat mencari dan menambah produk ke keranjang.

US-02: Sebagai kasir, saya ingin mencari produk berdasarkan nama atau
       kategori agar tidak perlu scroll panjang.

US-03: Sebagai kasir, saya ingin input nominal pembayaran tunai dan sistem
       menghitung kembalian otomatis.

US-04: Sebagai kasir, saya ingin mencetak struk setelah transaksi selesai.
```

### Epic: Manajemen Produk (Admin)
```
US-05: Sebagai admin, saya ingin menambah produk baru dengan foto, nama,
       harga, dan stok awal.

US-06: Sebagai admin, saya ingin menonaktifkan produk yang tidak dijual
       tanpa menghapus data historisnya.

US-07: Sebagai admin, saya ingin mendapat notifikasi ketika stok produk
       turun di bawah batas minimum.
```

### Epic: Laporan (Admin/Owner)
```
US-08: Sebagai owner, saya ingin melihat total omset dan jumlah transaksi
       hari ini tanpa harus menghitung manual.

US-09: Sebagai owner, saya ingin export laporan transaksi ke CSV untuk
       keperluan pembukuan.

US-10: Sebagai kasir, saya ingin mencetak ulang struk dari riwayat
       transaksi jika pelanggan kehilangan struk asli.
```

### Epic: Inventory (Admin)
```
US-11: Sebagai admin, saya ingin menambah stok produk (restock) dengan
       mencatat alasan (e.g., "Pembelian dari supplier").

US-12: Sebagai admin, saya ingin mengurangi stok secara manual untuk
       koreksi (e.g., produk rusak, expired) dengan alasan.
```

---

## 6. Acceptance Criteria (Sample)

### F-04: Proses Pembayaran
- [ ] Kasir dapat memilih metode bayar: Tunai, Kartu, QRIS
- [ ] Saat memilih Tunai, field nominal muncul dan kembalian dihitung realtime
- [ ] Tombol Konfirmasi disabled jika nominal tunai < total belanja
- [ ] Setelah konfirmasi, stok semua item berkurang sesuai qty
- [ ] Order tercatat di `/orders` dengan status `COMPLETED`
- [ ] Struk dapat dicetak dalam 2 klik setelah transaksi selesai

### F-12: Role-based Access
- [ ] Kasir hanya bisa akses `/pos` dan `/orders` (read-only)
- [ ] Admin bisa akses semua halaman termasuk `/products`, `/inventory`, `/reports`
- [ ] Akses langsung ke URL yang tidak diizinkan → redirect ke `/pos` atau `/login`

### F-13: Stock Adjustment
- [ ] Admin dapat akses halaman `/inventory`
- [ ] Klik [Sesuaikan Stok] pada produk tertentu
- [ ] Modal muncul dengan input: +/- qty, reason (text, required)
- [ ] Submit → POST /api/inventory/adjust
- [ ] Backend mencatat adjustment di tabel `stock_adjustments` + update `products.stock`
- [ ] Adjustment tercatat di audit log

---

## 7. Milestones & Timeline (8 Minggu)

| Minggu | Deliverable |
|---|---|
| 1 | Setup project, DB schema, auth (login/logout), layout dasar |
| 2 | CRUD produk + upload foto (R2 presigned URL) |
| 3 | Layar POS: grid produk + cart (F-02, F-03) |
| 4 | Proses pembayaran + struk + decrement stok (F-04–F-06) |
| 5 | Riwayat transaksi + stock adjustment (F-07, F-13) |
| 6 | Laporan harian + alert stok + void order (F-10, F-11) |
| 7 | QA + bug fix (critical path: checkout, auth, stock) |
| 8 | Usability test + polish UI (empty states, mobile cart) |
| 9 | Deploy production, monitoring setup, dokumentasi |

**Buffer:** Minggu 9 adalah buffer — jika Minggu 3–6 on track, deploy bisa dimajukan ke Minggu 8.
