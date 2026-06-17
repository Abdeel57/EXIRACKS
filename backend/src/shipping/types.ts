/**
 * Tipos del módulo de envío.
 *
 * Este módulo está AISLADO a propósito: el resto de la app sólo conoce la
 * interfaz `ShippingProvider`. Hoy la implementación es una tabla de tarifas
 * (TableRateProvider) que lee `shipping.config.json`. Mañana puedes cambiarla
 * por una API de paquetería (Skydropx, Envía, etc.) implementando la MISMA
 * interfaz, sin tocar rutas, checkout ni frontend.
 */

/** Una pieza del carrito, con su caja y peso reales para calcular el flete. */
export interface ShippingItem {
  weightKg: number; // peso real (báscula) de UNA unidad
  lengthCm: number; // largo de la caja
  widthCm: number; // ancho de la caja
  heightCm: number; // alto de la caja
  quantity: number;
}

/** Lo que recibe el proveedor para cotizar. */
export interface ShippingQuoteInput {
  postalCode: string; // CP de destino (5 dígitos)
  items: ShippingItem[];
}

/** Resultado de la cotización. */
export interface ShippingQuote {
  zoneCode: string; // Z1..Z5 (o "DESCONOCIDA" si el CP no mapea)
  zoneName: string; // "Centro", "Sur / Sureste", ...
  billableWeightKg: number; // peso facturable total (mayor entre real y volumétrico)
  realWeightKg: number; // peso real total (referencia)
  volumetricWeightKg: number; // peso volumétrico total (referencia)
  costMxn: number | null; // costo del envío. null => requiere cotización manual
  etaMinDays: number;
  etaMaxDays: number;
  needsManualQuote: boolean; // true cuando excede el último rango de la tabla
  message?: string; // mensaje para mostrar al cliente cuando aplica
}

/** Contrato que cualquier proveedor de envío debe cumplir. */
export interface ShippingProvider {
  /** Cotiza el envío para un CP destino y los items del carrito. */
  quote(input: ShippingQuoteInput): Promise<ShippingQuote>;
  /** Nombre legible del proveedor (para logs / debug). */
  readonly name: string;
}
