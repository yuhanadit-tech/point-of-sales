import { cn } from '@/lib/utils'

interface StockBadgeProps {
  stock: number
  threshold: number
  className?: string
}

export function StockBadge({ stock, threshold, className }: StockBadgeProps) {
  if (stock === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          className,
        )}
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
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          className,
        )}
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
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
      style={{
        backgroundColor: 'oklch(97% 0.04 145)',
        color: 'var(--color-success)',
      }}
    >
      In Stock ({stock})
    </span>
  )
}
