'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpi {
  revenue: number
  orders: number
  avgOrderValue?: number
}

interface TopProduct {
  productId: string | null
  productName: string
  revenue: number
  quantity: number
}

interface DailyRevenue {
  date: string
  total: number
}

interface ReportData {
  kpi: {
    today: Kpi
    week: Kpi
    month: Kpi
  }
  topProducts: TopProduct[]
  dailyRevenue: DailyRevenue[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/summary')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function exportCsv() {
    if (!data) return
    const rows = [
      ['Product', 'Revenue (Rp)', 'Qty Sold'],
      ...data.topProducts.map((p) => [p.productName, String(p.revenue), String(p.quantity)]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `top-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <ReportsSkeleton />
  if (!data) return <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Failed to load report data.</p>

  const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.total), 1)

  return (
    <div className="space-y-8">
      {/* ── KPI Cards ── */}
      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-heading)' }}>
          Performance
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Revenue Today" value={formatCurrency(data.kpi.today.revenue)} sub={`${data.kpi.today.orders} orders`} />
          <KpiCard label="Revenue This Week" value={formatCurrency(data.kpi.week.revenue)} sub={`${data.kpi.week.orders} orders · avg ${formatCurrency(data.kpi.week.avgOrderValue ?? 0)}`} />
          <KpiCard label="Revenue This Month" value={formatCurrency(data.kpi.month.revenue)} sub={`${data.kpi.month.orders} orders · avg ${formatCurrency(data.kpi.month.avgOrderValue ?? 0)}`} accent />
        </div>
      </section>

      {/* ── Bar chart — last 14 days ── */}
      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-heading)' }}>
          Daily Revenue (last 14 days)
        </h2>
        <div
          className="rounded-xl border p-5 overflow-x-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <BarChart data={data.dailyRevenue} maxRevenue={maxRevenue} />
        </div>
      </section>

      {/* ── Top 10 products ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-heading)' }}>
            Top 10 Products (this month)
          </h2>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-neutral-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 10v9a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {data.topProducts.length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed flex items-center justify-center py-12"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No sales data for this month yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-semibold w-8 text-center" style={{ color: 'var(--color-heading)' }}>#</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Product</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Qty Sold</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Revenue</th>
                  <th className="px-4 py-3" style={{ color: 'var(--color-heading)', width: '30%' }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, i) => {
                  const topRevenue = data.topProducts[0].revenue
                  const pct = topRevenue > 0 ? (product.revenue / topRevenue) * 100 : 0
                  return (
                    <tr
                      key={product.productId ?? product.productName}
                      className="border-t transition-colors hover:bg-neutral-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="px-4 py-3 text-center text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-heading)' }}>
                        {product.productName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>
                        {product.quantity.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--color-heading)' }}>
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: 'var(--color-primary)',
                              }}
                            />
                          </div>
                          <span className="text-xs tabular-nums w-10 text-right" style={{ color: 'var(--color-muted)' }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: accent ? 'var(--color-primary)' : 'var(--color-border)',
        backgroundColor: accent ? 'oklch(98% 0.02 264)' : 'var(--color-background)',
      }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>
        {label.toUpperCase()}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-heading)' }}>
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
        {sub}
      </p>
    </div>
  )
}

// ─── Bar Chart (pure SVG) ─────────────────────────────────────────────────────

function BarChart({ data, maxRevenue }: { data: DailyRevenue[]; maxRevenue: number }) {
  const H = 140
  const barW = 28
  const gap = 8
  const totalW = data.length * (barW + gap) - gap
  const padL = 8
  const padR = 8
  const svgW = totalW + padL + padR

  return (
    <div className="min-w-0">
      <svg
        viewBox={`0 0 ${svgW} ${H + 28}`}
        width="100%"
        aria-label="Daily revenue bar chart"
        role="img"
        style={{ display: 'block' }}
      >
        {data.map((d, i) => {
          const barH = maxRevenue > 0 ? (d.total / maxRevenue) * H : 0
          const x = padL + i * (barW + gap)
          const y = H - barH
          const label = d.date.slice(5) // MM-DD
          return (
            <g key={d.date}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={d.total > 0 ? 'var(--color-primary)' : 'var(--color-border)'}
              />
              {/* Date label */}
              <text
                x={x + barW / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-muted)"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-5 h-28" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
        ))}
      </div>
      <div className="rounded-xl border p-5 h-48" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
    </div>
  )
}
