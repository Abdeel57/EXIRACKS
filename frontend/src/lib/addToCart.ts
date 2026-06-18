import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import type { Product } from '@/types';

/**
 * Agrega un producto al carrito y muestra feedback claro (toast con acción).
 * Respeta el tope de stock. Centraliza el comportamiento para tarjeta y detalle.
 */
export function addToCart(product: Product, color: string | null = null, qty = 1) {
  const r = useCart.getState().add(product, color, qty);
  if (r.added > 0) {
    toast.success(`${product.name} agregado al carrito`, {
      description: r.atMax ? 'Agregamos el máximo disponible en existencia.' : undefined,
      action: { label: 'Ver carrito', onClick: () => useCart.getState().open() },
    });
  } else {
    toast.error('Sin existencias', { description: 'No quedan más unidades disponibles.' });
  }
  return r;
}
