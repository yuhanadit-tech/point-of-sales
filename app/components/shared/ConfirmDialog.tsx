'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <h2
          id="confirm-title"
          className="text-base font-semibold mb-2"
          style={{ color: 'var(--color-heading)' }}
        >
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
          {description}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              hover:bg-neutral-50 disabled:opacity-50 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all
              disabled:opacity-60 active:scale-[0.98] focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              backgroundColor:
                variant === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)',
            }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
