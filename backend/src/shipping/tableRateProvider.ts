import config from './shipping.config.json';
import { resolveZone } from './cpToZone';
import type { ShippingProvider, ShippingQuote, ShippingQuoteInput, ShippingItem } from './types';

type Bracket = { maxKg: number | null; prices: Record<string, number> | null };

const DIVISOR = config.volumetricDivisor as number;
const BRACKETS = config.weightBrackets as Bracket[];

/** Peso volumétrico (kg) de UNA caja. */
export function volumetricWeight(item: Pick<ShippingItem, 'lengthCm' | 'widthCm' | 'heightCm'>): number {
  return (item.lengthCm * item.widthCm * item.heightCm) / DIVISOR;
}

/** Peso facturable de UNA unidad: el mayor entre el real y el volumétrico. */
export function billableWeightPerUnit(item: ShippingItem): number {
  return Math.max(item.weightKg || 0, volumetricWeight(item));
}

/**
 * Proveedor de envío basado en TABLA DE TARIFAS (shipping.config.json).
 *
 * Implementa `ShippingProvider`. Para migrar a una API de paquetería en el
 * futuro, crea otra clase que implemente la misma interfaz y cámbiala en
 * shippingService.ts — nada más del sistema necesita cambiar.
 */
export class TableRateProvider implements ShippingProvider {
  readonly name = 'TableRate (tabla fija desde Hermosillo)';

  async quote(input: ShippingQuoteInput): Promise<ShippingQuote> {
    const zone = resolveZone(input.postalCode);

    // Suma de pesos sobre todas las piezas y cantidades
    let realTotal = 0;
    let volTotal = 0;
    let billableTotal = 0;
    for (const item of input.items) {
      const qty = Math.max(1, item.quantity || 1);
      realTotal += (item.weightKg || 0) * qty;
      volTotal += volumetricWeight(item) * qty;
      billableTotal += billableWeightPerUnit(item) * qty;
    }

    const billableKg = Math.round(billableTotal); // peso facturable redondeado (como en la tabla de tarifas)
    const realWeightKg = round1(realTotal);
    const volumetricWeightKg = round1(volTotal);

    // CP no reconocido
    if (!zone.found) {
      return {
        zoneCode: 'DESCONOCIDA',
        zoneName: zone.zoneName,
        billableWeightKg: billableKg,
        realWeightKg,
        volumetricWeightKg,
        costMxn: null,
        etaMinDays: 0,
        etaMaxDays: 0,
        needsManualQuote: true,
        message: 'No pudimos identificar tu código postal. Escríbenos por WhatsApp y te cotizamos el envío.',
      };
    }

    // Busca el primer rango cuyo maxKg cubre el peso facturable
    const bracket = BRACKETS.find((b) => b.maxKg !== null && billableKg <= b.maxKg);

    if (!bracket || !bracket.prices) {
      // Excede el último rango numérico => cotización manual
      return {
        zoneCode: zone.zoneCode,
        zoneName: zone.zoneName,
        billableWeightKg: billableKg,
        realWeightKg,
        volumetricWeightKg,
        costMxn: null,
        etaMinDays: zone.etaMinDays,
        etaMaxDays: zone.etaMaxDays,
        needsManualQuote: true,
        message:
          'Tu pedido supera los 90 kg facturables. Escríbenos por WhatsApp para cotizar envío por carga/tarima o en varias guías.',
      };
    }

    const cost = bracket.prices[zone.zoneCode];

    return {
      zoneCode: zone.zoneCode,
      zoneName: zone.zoneName,
      billableWeightKg: billableKg,
      realWeightKg,
      volumetricWeightKg,
      costMxn: typeof cost === 'number' ? cost : null,
      etaMinDays: zone.etaMinDays,
      etaMaxDays: zone.etaMaxDays,
      needsManualQuote: typeof cost !== 'number',
    };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
