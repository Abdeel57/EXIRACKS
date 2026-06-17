import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAdmin);

/** GET /api/admin/orders?status=PENDING|PAID|SHIPPED|CANCELLED */
router.get('/admin/orders', async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : {},
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalMxn: o.totalMxn,
      shippingMxn: o.shippingMxn,
      zoneName: o.zoneName,
      needsInvoice: o.needsInvoice,
      trackingCarrier: o.trackingCarrier,
      trackingNumber: o.trackingNumber,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      shippedAt: o.shippedAt,
      customer: {
        name: o.customer.name,
        email: o.customer.email,
        phone: o.customer.phone,
        address: `${o.customer.street} ${o.customer.extNumber}${o.customer.intNumber ? ' int. ' + o.customer.intNumber : ''}, ${o.customer.colonia}, ${o.customer.city}, ${o.customer.state}, CP ${o.customer.postalCode}`,
      },
      items: o.items.map((it) => ({
        productName: it.productName,
        color: it.color,
        quantity: it.quantity,
        lineTotalMxn: it.lineTotalMxn,
      })),
    }))
  );
});

/** GET /api/admin/stats — conteos por estado para el tablero. */
router.get('/admin/stats', async (_req, res) => {
  const [pending, paid, shipped, cancelled] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count({ where: { status: 'SHIPPED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
  ]);
  res.json({ pending, paid, shipped, cancelled });
});

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED']).optional(),
  trackingCarrier: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
});

/** PATCH /api/admin/orders/:id — cambiar estado / agregar guía. */
router.patch('/admin/orders/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const { status, trackingCarrier, trackingNumber } = parsed.data;

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      ...(status ? { status } : {}),
      ...(trackingCarrier !== undefined ? { trackingCarrier } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      ...(status === 'SHIPPED' && !existing.shippedAt ? { shippedAt: new Date() } : {}),
    },
  });
  res.json({ ok: true, id: order.id, status: order.status });
});

export default router;
