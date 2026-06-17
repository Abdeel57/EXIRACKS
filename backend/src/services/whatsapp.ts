import { env } from '../config/env';
import { formatMxn } from '../lib/money';

interface WaItem {
  productName: string;
  color?: string | null;
  quantity: number;
  lineTotalMxn: number;
}

interface WaOrder {
  orderNumber: string;
  items: WaItem[];
  subtotalMxn: number;
  ivaMxn: number;
  shippingMxn: number;
  totalMxn: number;
  zoneName: string;
}

/**
 * Construye un link wa.me prellenado hacia el WhatsApp del negocio
 * con el resumen del pedido. El número se configura en BUSINESS_WHATSAPP.
 */
export function buildWhatsAppLink(order: WaOrder): string {
  const lines: string[] = [];
  lines.push(`¡Hola Exiracks! Quiero confirmar mi pedido *${order.orderNumber}*:`);
  lines.push('');
  for (const it of order.items) {
    const color = it.color ? ` (${it.color})` : '';
    lines.push(`• ${it.quantity}x ${it.productName}${color} — ${formatMxn(it.lineTotalMxn)}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${formatMxn(order.subtotalMxn)}`);
  if (order.ivaMxn > 0) lines.push(`IVA: ${formatMxn(order.ivaMxn)}`);
  lines.push(`Envío (${order.zoneName}): ${formatMxn(order.shippingMxn)}`);
  lines.push(`*Total: ${formatMxn(order.totalMxn)}*`);

  const text = encodeURIComponent(lines.join('\n'));
  const number = env.businessWhatsapp.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${text}`;
}
