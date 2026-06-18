import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceMxn: number;
  image: string;
  color: string | null;
  quantity: number;
  maxStock: number; // tope de existencias (no se puede pedir más)
  weightKg: number; // snapshot para referencia de envío
}

export interface AddResult {
  added: number; // cuántas unidades se agregaron realmente
  atMax: boolean; // true si ya no se pudo agregar todo lo pedido (tope de stock)
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (product: Product, color?: string | null, qty?: number) => AddResult;
  remove: (productId: string, color: string | null) => void;
  setQty: (productId: string, color: string | null, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  count: () => number;
  subtotal: () => number;
}

const sameLine = (a: CartItem, productId: string, color: string | null) =>
  a.productId === productId && (a.color ?? null) === (color ?? null);

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      add: (product, color = null, qty = 1) => {
        const max = product.stock > 0 ? product.stock : 0;
        const current = get().items.find((i) => sameLine(i, product.id, color))?.quantity ?? 0;
        const toAdd = clamp(max - current, 0, Math.max(0, qty));
        if (toAdd <= 0) return { added: 0, atMax: true };

        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product.id, color));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, product.id, color) ? { ...i, quantity: i.quantity + toAdd, maxStock: max } : i
              ),
            };
          }
          const newItem: CartItem = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceMxn: product.priceMxn,
            image: product.images[0] || '/brand/logo.png',
            color: color ?? null,
            quantity: toAdd,
            maxStock: max,
            weightKg: product.dimensions.weightKg,
          };
          return { items: [...state.items, newItem] };
        });
        return { added: toAdd, atMax: toAdd < qty };
      },

      remove: (productId, color) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, color)) })),

      setQty: (productId, color, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (!sameLine(i, productId, color)) return i;
              const cap = i.maxStock > 0 ? i.maxStock : qty;
              return { ...i, quantity: clamp(qty, 1, cap) };
            })
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.priceMxn * i.quantity, 0),
    }),
    { name: 'exiracks-cart', partialize: (s) => ({ items: s.items }) }
  )
);
