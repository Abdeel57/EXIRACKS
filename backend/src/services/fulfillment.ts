import { prisma } from '../lib/prisma';
import { sendOrderConfirmation } from './mailer';

/**
 * Marca un pedido como PAGADO: actualiza estado, descuenta stock y envía
 * el correo de confirmación. Idempotente (si ya estaba pagado, no repite).
 */
export async function markOrderPaid(
  orderId: string,
  opts: { paymentStatus?: string; mpPaymentId?: string } = {}
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } });
  if (!order) {
    console.warn('[fulfillment] Pedido no encontrado:', orderId);
    return;
  }
  if (order.status === 'PAID' || order.status === 'SHIPPED') {
    return; // ya procesado
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentStatus: opts.paymentStatus ?? 'approved',
        mpPaymentId: opts.mpPaymentId ?? order.mpPaymentId,
      },
    }),
    // Descuenta stock por cada item
    ...order.items.map((it) =>
      prisma.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      })
    ),
  ]);

  await sendOrderConfirmation({
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    items: order.items.map((it) => ({
      productName: it.productName,
      color: it.color,
      quantity: it.quantity,
      lineTotalMxn: it.lineTotalMxn,
    })),
    subtotalMxn: order.subtotalMxn,
    ivaMxn: order.ivaMxn,
    shippingMxn: order.shippingMxn,
    totalMxn: order.totalMxn,
    zoneName: order.zoneName,
  });

  console.log(`[fulfillment] Pedido ${order.orderNumber} marcado como PAGADO.`);
}
