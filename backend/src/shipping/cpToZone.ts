import config from './shipping.config.json';

export interface ZoneResolution {
  zoneCode: string; // Z1..Z5 o "DESCONOCIDA"
  zoneName: string;
  etaMinDays: number;
  etaMaxDays: number;
  found: boolean;
}

type ZoneInfo = { name: string; etaMinDays: number; etaMaxDays: number; states: string[] };

const zones = config.zones as Record<string, ZoneInfo>;
const prefixZones = config.prefixZones as Record<string, string>;

/** Normaliza un CP a 5 dígitos (rellena con ceros a la izquierda). */
export function normalizeCp(cp: string): string {
  return (cp || '').replace(/\D/g, '').padStart(5, '0').slice(0, 5);
}

/**
 * Resuelve un código postal mexicano a una zona de envío.
 *
 * Orden de resolución:
 *  1. Rango local (Hermosillo) => Z1
 *  2. Prefijo de 2 dígitos (estado) => Z2..Z5
 */
export function resolveZone(rawCp: string): ZoneResolution {
  const cp = normalizeCp(rawCp);
  const cpNum = Number(cp);

  // 1. Zona local por rango exacto
  const local = config.localZone as { zone: string; cpRanges: number[][] };
  for (const range of local.cpRanges) {
    const [min, max] = range;
    if (cpNum >= min && cpNum <= max) {
      return zoneResult(local.zone);
    }
  }

  // 2. Prefijo de estado (primeros 2 dígitos)
  const prefix = cp.slice(0, 2);
  const code = prefixZones[prefix];
  if (code) return zoneResult(code);

  return {
    zoneCode: 'DESCONOCIDA',
    zoneName: 'Código postal no reconocido',
    etaMinDays: 0,
    etaMaxDays: 0,
    found: false,
  };
}

function zoneResult(code: string): ZoneResolution {
  const z = zones[code];
  return {
    zoneCode: code,
    zoneName: z?.name ?? code,
    etaMinDays: z?.etaMinDays ?? 0,
    etaMaxDays: z?.etaMaxDays ?? 0,
    found: Boolean(z),
  };
}
