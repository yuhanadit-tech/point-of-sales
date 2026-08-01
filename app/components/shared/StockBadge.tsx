import { cn } from '@/lib/utils'

interface StockBadgeProps {
  stock: number
  threshold: number
  /** 'sm' (default) = px-2.5 py-0.5 text-xs; 'xs' = px-1.5 py-px text-[10px] */
  size?: 'sm' | 'xs'
  className?: string
}

export function StockBadge({ stock, threshold, size = 'sm', className }: StockBadgeProps) {
  const base =
    size === 'xs'
      ? 'inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold'
      : 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold'

  if (stock === 0) {
    return (
      <span
        className={cn(base, className)}
        style={{
          backgroundColor: 'oklch(97% 0.04 25)',
          color: 'var(--color-danger)',
        }}
      >
        Out of Stock
      </span>
    )
  }

  if (stock <= threshold) {
    return (
      <span
        className={cn(base, className)}
        style={{
          backgroundColor: 'oklch(97% 0.04 80)',
          color: 'var(--color-warning)',
        }}
      >
        Low Stock ({stock})
      </span>
    )
  }

  return (
    <span
      className={cn(base, className)}
      style={{
        backgroundColor: 'oklch(97% 0.04 145)',
        color: 'var(--color-success)',
      }}
    >
      In Stock ({stock})
    </span>
  )
}
