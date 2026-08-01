import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  stock: number          // current stock — used to cap qty
  imageUrl: string | null
}

interface CartState {
  items: CartItem[]
  // ── Derived (computed from items) ──────────────────────────────────────────
  subtotal: number
  totalItems: number
  // ── Actions ────────────────────────────────────────────────────────────────
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDerived(items: CartItem[]) {
  return {
    subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  totalItems: 0,

  addItem(incoming) {
    const existing = get().items.find((i) => i.productId === incoming.productId)

    let nextItems: CartItem[]

    if (existing) {
      // increment, cap at stock
      const nextQty = Math.min(existing.quantity + 1, incoming.stock)
      nextItems = get().items.map((i) =>
        i.productId === incoming.productId ? { ...i, quantity: nextQty } : i,
      )
    } else {
      nextItems = [...get().items, { ...incoming, quantity: 1 }]
    }

    set({ items: nextItems, ...computeDerived(nextItems) })
  },

  removeItem(productId) {
    const nextItems = get().items.filter((i) => i.productId !== productId)
    set({ items: nextItems, ...computeDerived(nextItems) })
  },

  setQuantity(productId, quantity) {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    const nextItems = get().items.map((i) => {
      if (i.productId !== productId) return i
      return { ...i, quantity: Math.min(quantity, i.stock) }
    })

    set({ items: nextItems, ...computeDerived(nextItems) })
  },

  clear() {
    set({ items: [], subtotal: 0, totalItems: 0 })
  },
}))
