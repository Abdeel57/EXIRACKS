/**
 * shippingService — punto único de entrada para cotizar envíos.
 *
 * El resto de la aplicación SÓLO importa de aquí. La implementación concreta
 * (tabla fija, API de paquetería, etc.) se inyecta en `activeProvider`.
 *
 * Para cambiar a una API real (Skydropx / Envía / DHL) en el futuro:
 *   1. Crea una clase que implemente `ShippingProvider` (ver types.ts).
 *   2. Cambia la línea `activeProvider = new TableRateProvider()` por la tuya.
 *   Nada más del sistema (rutas, checkout, frontend) necesita cambiar.
 */
import { TableRateProvider } from './tableRateProvider';
import type { ShippingProvider, ShippingQuote, ShippingQuoteInput } from './types';

// Proveedor activo. Cámbialo aquí cuando integres una paquetería real.
const activeProvider: ShippingProvider = new TableRateProvider();

/** Cotiza el envío para un CP destino y los items del carrito. */
export async function quoteShipping(input: ShippingQuoteInput): Promise<ShippingQuote> {
  return activeProvider.quote(input);
}

/** Nombre del proveedor activo (para debug/health). */
export function shippingProviderName(): string {
  return activeProvider.name;
}

export type { ShippingQuote, ShippingQuoteInput, ShippingItem, ShippingProvider } from './types';
