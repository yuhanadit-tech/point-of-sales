'use client'

import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProductSchema, type CreateProductInput } from '@/lib/validations/product.schema'
import { formatCurrency } from '@/lib/utils'

// Explicit output schema for react-hook-form (resolvers v5 needs exact types)
type FormValues = z.output<typeof createProductSchema>

interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  price: string | number
  costPrice: string | number | null
  stock: number
  lowStockThreshold: number
  imageUrl: string | null
  isActive: boolean
  categoryId: string | null
  category: Category | null
}

interface ProductDrawerProps {
  open: boolean
  product?: Product | null  // null = create mode
  categories: Category[]
  onClose: () => void
  onSave: (data: CreateProductInput, id?: string) => Promise<void>
}

export function ProductDrawer({
  open,
  product,
  categories,
  onClose,
  onSave,
}: ProductDrawerProps) {
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormValues>({
    resolver: zodResolver(createProductSchema) as any,
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      costPrice: undefined,
      stock: 0,
      lowStockThreshold: 5,
      categoryId: null,
      imageUrl: null,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku ?? '',
        description: product.description ?? '',
        price: Number(product.price),
        costPrice: product.costPrice ? Number(product.costPrice) : undefined,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        categoryId: product.categoryId ?? null,
        imageUrl: product.imageUrl ?? null,
      })
    } else {
      reset({
        name: '',
        sku: '',
        description: '',
        price: 0,
        costPrice: undefined,
        stock: 0,
        lowStockThreshold: 5,
        categoryId: null,
        imageUrl: null,
      })
    }
  }, [product, reset])

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    await onSave(data as CreateProductInput, product?.id)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <div
        className="relative flex flex-col w-full max-w-md bg-white h-full shadow-xl overflow-y-auto"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-heading)' }}>
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-6 py-5 space-y-4">

          {/* Name */}
          <Field label="Product Name *" error={errors.name?.message}>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Iced Coffee"
              className={inputClass(!!errors.name)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Category */}
          <Field label="Category" error={errors.categoryId?.message}>
            <select
              {...register('categoryId')}
              className={inputClass(!!errors.categoryId)}
              disabled={isSubmitting}
            >
              <option value="">— No category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* SKU */}
          <Field label="SKU" error={errors.sku?.message}>
            <input
              {...register('sku')}
              type="text"
              placeholder="Auto-generated if empty"
              className={inputClass(!!errors.sku)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Price */}
          <Field label="Selling Price (Rp) *" error={errors.price?.message}>
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              min={0}
              step={500}
              placeholder="25000"
              className={inputClass(!!errors.price)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Cost Price */}
          <Field label="Cost Price (Rp)" error={errors.costPrice?.message}>
            <input
              {...register('costPrice', { valueAsNumber: true })}
              type="number"
              min={0}
              step={500}
              placeholder="Optional — for margin reports"
              className={inputClass(!!errors.costPrice)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Stock + Threshold side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock *" error={errors.stock?.message}>
              <input
                {...register('stock', { valueAsNumber: true })}
                type="number"
                min={0}
                className={inputClass(!!errors.stock)}
                disabled={isSubmitting}
              />
            </Field>
            <Field label="Low Stock Alert" error={errors.lowStockThreshold?.message}>
              <input
                {...register('lowStockThreshold', { valueAsNumber: true })}
                type="number"
                min={0}
                className={inputClass(!!errors.lowStockThreshold)}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Optional description"
              className={inputClass(!!errors.description) + ' resize-none'}
              disabled={isSubmitting}
            />
          </Field>

          {/* Image URL */}
          <Field label="Image URL" error={errors.imageUrl?.message}>
            <input
              {...register('imageUrl')}
              type="url"
              placeholder="https://..."
              className={inputClass(!!errors.imageUrl)}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
              Paste a direct image URL. R2 upload available in production.
            </p>
          </Field>
        </form>

        {/* Footer actions */}
        <div
          className="sticky bottom-0 bg-white px-6 py-4 border-t flex gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors
              hover:bg-neutral-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={() => handleSubmit(onSubmit)()}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all
              active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
    'focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-400 bg-red-50 focus:ring-red-200'
      : 'border-neutral-300 bg-white focus:border-[var(--color-primary)] focus:ring-[color-mix(in_oklch,var(--color-primary),transparent_80%)]',
  ].join(' ')
}

// suppress unused import warning
void formatCurrency
