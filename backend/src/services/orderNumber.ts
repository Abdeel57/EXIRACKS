import { prisma } from '../lib/prisma';

/**
 * Genera un número de pedido legible tipo "EXI-2026-0001".
 * Reintenta si hay colisión (poco probable en este volumen).
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EXI-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const countThisYear = await prisma.order.count({
      where: { orderNumber: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(countThisYear + 1 + attempt).padStart(4, '0')}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!exists) return candidate;
  }
  // Fallback con timestamp
  return `${prefix}${Date.now().toString().slice(-6)}`;
}
