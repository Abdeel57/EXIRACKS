import { Router } from 'express';
import { getPaymentStatus } from '../services/mercadopago';
import { markOrderPaid } from '../services/fulfillment';

const router = Router();

/**
 * POST /api/webhooks/mercadopago
 * Mercado Pago notifica aquí los cambios de pago. Respondemos 200 rápido.
 * La notificación llega como ?type=payment&data.id=XXX (o en el body).
 */
router.post('/webhooks/mercadopago', async (req, res) => {
  // Responder 200 cuanto antes; procesamos en segundo plano.
  res.sendStatus(200);

  try {
    const type = (req.query.type as string) || req.body?.type;
    const paymentId =
      (req.query['data.id'] as string) || req.body?.data?.id || (req.query.id as string);

    if (type !== 'payment' || !paymentId) return;

    const info = await getPaymentStatus(String(paymentId));
    if (!info) return;

    if (info.status === 'approved' && info.externalReference) {
      await markOrderPaid(info.externalReference, {
        paymentStatus: 'approved',
        mpPaymentId: String(paymentId),
      });
    }
  } catch (err) {
    console.error('[webhook] Error procesando notificación MP:', err);
  }
});

export default router;
