'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderSummary {
  id: string
  orderNumber: string
  status: 'PENDING' | 'COMPLETED' | 'VOIDED'
  subtotal: string
  discountAmount: string
  totalAmount: string
  createdAt: string
  cashier: { id: string; name: string } | null
  payment: { method: string; amountPaid: string; changeAmount: string } | null
  _count: { items: number }
}

interface OrdersClientProps {
  userRole: 'ADMIN' | 'CASHIER'
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  COMPLETED: { backgroundColor: 'oklch(97% 0.04 145)', color: 'var(--color-success)' },
  VOIDED: { backgroundColor: 'oklch(97% 0.04 25)', color: 'var(--color-danger)' },
  PENDING: { backgroundColor: 'oklch(97% 0.04 80)', color: 'var(--color-warning)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrdersClient({ userRole }: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 25

  // Detail modal
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<unknown>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('limit', String(LIMIT))

      const res = await fetch(`/api/orders/list?${params.toString()}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
    } catch {
      // show empty
    } finally {
      setLoading(false)
    }
  }, [search, status, dateFrom, dateTo, page])

  useEffect(() => {
    const t = setTimeout(fetchOrders, 300)
    return () => clearTimeout(t)
  }, [fetchOrders])

  // ── Fetch detail ───────────────────────────────────────────────────────────
  async function openDetail(id: string) {
    setDetailOrderId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      setDetailOrder(data.order)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleVoided(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'VOIDED' } : o)),
    )
  }

  const totalPages = Math.ceil(total / LIMIT)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--color-muted)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search order no. or cashier…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-colors
              border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="VOIDED">Voided</option>
          <option value="PENDING">Pending</option>
        </select>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          aria-label="To date"
        />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton />
      ) : orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Order</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-heading)' }}>Cashier</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-heading)' }}>Date</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Status</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Total</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t transition-colors hover:bg-neutral-50"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium font-mono text-xs" style={{ color: 'var(--color-heading)' }}>
                        {order.orderNumber}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {order._count.items} item{order._count.items !== 1 ? 's' : ''}
                        {order.payment && ` · ${order.payment.method}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-muted)' }}>
                      {order.cashier?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: 'var(--color-muted)' }}>
                      {new Date(order.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={STATUS_STYLES[order.status]}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: 'var(--color-heading)' }}>
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(order.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
              <span>
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-neutral-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-neutral-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Detail modal ── */}
      {detailOrderId && (
        detailLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : detailOrder ? (
          <OrderDetailModal
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            order={detailOrder as any}
            userRole={userRole}
            onClose={() => { setDetailOrderId(null); setDetailOrder(null) }}
            onVoided={handleVoided}
          />
        ) : null
      )}
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: 'var(--color-border)' }}>
      <div className="h-11" style={{ backgroundColor: 'var(--color-surface)' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-32" style={{ backgroundColor: 'var(--color-surface)' }} />
            <div className="h-3 rounded w-20" style={{ backgroundColor: 'var(--color-surface)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyOrders() {
  return (
    <div
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-20 text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <svg
        className="w-10 h-10"
        style={{ color: 'var(--color-neutral-300)' }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--color-heading)' }}>No orders found</p>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Orders will appear here after checkout.</p>
    </div>
  )
}
