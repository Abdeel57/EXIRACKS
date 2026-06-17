import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { isMercadoPagoConfigured } from '../config/env';
import { markOrderPaid } from '../services/fulfillment';

const router = Router();

/**
 * POST /api/payments/demo-confirm/:orderNumber
 * Sólo disponible en MODO DEMO (cuando Mercado Pago NO está configurado).
 * Sirve para probar el flujo completo en local sin credenciales reales.
 */
router.post('/payments/demo-confirm/:orderNumber', async (req, res) => {
  if (isMercadoPagoConfigured()) {
    return res.status(403).json({ error: 'No disponible: Mercado Pago está configurado. Usa el pago real.' });
  }
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber } });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  await markOrderPaid(order.id, { paymentStatus: 'demo' });
  res.json({ ok: true, orderNumber: order.orderNumber, status: 'PAID' });
});

export default router;
