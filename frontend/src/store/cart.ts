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
  // datos de envío (snapshot, para referencia)
  weightKg: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (product: Product, color?: string | null, qty?: number) => void;
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

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      add: (product, color = null, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product.id, color));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, product.id, color) ? { ...i, quantity: i.quantity + qty } : i
              ),
              isOpen: true,
            };
          }
          const item: CartItem = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceMxn: product.priceMxn,
            image: product.images[0] || '/brand/logo.png',
            color: color ?? null,
            quantity: qty,
            weightKg: product.dimensions.weightKg,
          };
          return { items: [...state.items, item], isOpen: true };
        }),

      remove: (productId, color) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, color)) })),

      setQty: (productId, color, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (sameLine(i, productId, color) ? { ...i, quantity: Math.max(1, qty) } : i))
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
