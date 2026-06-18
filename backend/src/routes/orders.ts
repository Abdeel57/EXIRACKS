import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env, isMercadoPagoConfigured } from '../config/env';
import { quoteShipping } from '../shipping/shippingService';
import { generateOrderNumber } from '../services/orderNumber';
import { createPaymentPreference } from '../services/mercadopago';
import { buildWhatsAppLink } from '../services/whatsapp';
import { sendPushToAdmins } from '../services/push';

const router = Router();

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    street: z.string().min(2),
    extNumber: z.string().min(1),
    intNumber: z.string().optional().nullable(),
    colonia: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().min(4).max(6),
    references: z.string().optional().nullable(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        color: z.string().optional().nullable(),
      })
    )
    .min(1),
  needsInvoice: z.boolean().default(false),
  rfc: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable(),
});

/** POST /api/orders — crea el pedido y arranca el pago. */
router.post('/orders', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const data = parsed.data;

  if (data.needsInvoice && (!data.rfc || !data.razonSocial)) {
    return res.status(400).json({ error: 'Para factura necesitamos RFC y razón social.' });
  }

  // 1. Productos (precios y medidas SIEMPRE desde la DB, nunca del cliente)
  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) }, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of data.items) {
    const p = byId.get(item.productId);
    if (!p) return res.status(400).json({ error: `Producto no disponible: ${item.productId}` });
    if (p.stock <= 0) return res.status(400).json({ error: `Producto agotado: ${p.name}` });
  }

  // 2. Cotización de envío (server-side, con las medidas reales de la DB)
  const quote = await quoteShipping({
    postalCode: data.customer.postalCode,
    items: data.items.map((i) => {
      const p = byId.get(i.productId)!;
      return { weightKg: p.weightKg, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, quantity: i.quantity };
    }),
  });

  if (quote.needsManualQuote || quote.costMxn === null) {
    return res.status(409).json({
      error: 'cotizacion_manual',
      message:
        quote.message || 'Tu envío requiere cotización manual. Escríbenos por WhatsApp para ayudarte.',
      quote,
    });
  }

  // 3. Totales (IVA sólo si pide factura)
  const subtotalMxn = data.items.reduce((sum, i) => sum + byId.get(i.productId)!.priceMxn * i.quantity, 0);
  const ivaMxn = data.needsInvoice ? Math.round(subtotalMxn * env.ivaRate) : 0;
  const shippingMxn = quote.costMxn;
  const totalMxn = subtotalMxn + ivaMxn + shippingMxn;

  // 4. Persistir Customer + Order + Items
  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      status: 'PENDING',
      subtotalMxn,
      ivaMxn,
      shippingMxn,
      totalMxn,
      zoneCode: quote.zoneCode,
      zoneName: quote.zoneName,
      billableWeightKg: quote.billableWeightKg,
      needsInvoice: data.needsInvoice,
      rfc: data.rfc ?? null,
      razonSocial: data.razonSocial ?? null,
      customer: {
        create: {
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
          street: data.customer.street,
          extNumber: data.customer.extNumber,
          intNumber: data.customer.intNumber ?? null,
          colonia: data.customer.colonia,
          city: data.customer.city,
          state: data.customer.state,
          postalCode: data.customer.postalCode,
          references: data.customer.references ?? null,
        },
      },
      items: {
        create: data.items.map((i) => {
          const p = byId.get(i.productId)!;
          return {
            productId: p.id,
            productName: p.name,
            color: i.color ?? null,
            unitPriceMxn: p.priceMxn,
            quantity: i.quantity,
            weightKg: p.weightKg,
            lengthCm: p.lengthCm,
            widthCm: p.widthCm,
            heightCm: p.heightCm,
            lineTotalMxn: p.priceMxn * i.quantity,
          };
        }),
      },
    },
    include: { items: true },
  });

  // Avisa a los administradores que entró un pedido nuevo (push, no bloquea).
  sendPushToAdmins({
    title: '🛒 Nuevo pedido',
    body: `${orderNumber} · $${totalMxn.toLocaleString('es-MX')} · ${data.customer.name}, ${data.customer.city}`,
    url: '/admin',
    tag: `order-${orderNumber}`,
  }).catch(() => {});

  // 5. Pago: Mercado Pago si está configurado, si no MODO DEMO
  const waLink = buildWhatsAppLink({
    orderNumber,
    items: order.items,
    subtotalMxn,
    ivaMxn,
    shippingMxn,
    totalMxn,
    zoneName: quote.zoneName,
  });

  if (isMercadoPagoConfigured()) {
    try {
      const pref = await createPaymentPreference({
        orderId: order.id,
        orderNumber,
        payerEmail: data.customer.email,
        shippingMxn,
        items: order.items.map((it) => ({
          title: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPriceMxn,
        })),
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { mpPreferenceId: pref.preferenceId },
      });
      return res.status(201).json({
        orderNumber,
        total: totalMxn,
        checkout: { mode: 'mercadopago', initPoint: pref.initPoint },
        waLink,
      });
    } catch (err) {
      console.error('[orders] Error creando preferencia MP:', err);
      return res.status(201).json({
        orderNumber,
        total: totalMxn,
        checkout: { mode: 'error', message: 'No se pudo iniciar el pago. Intenta de nuevo o escríbenos.' },
        waLink,
      });
    }
  }

  // Modo DEMO (sin credenciales de MP): el pedido queda PENDING y se puede
  // confirmar manualmente para probar el flujo completo en local.
  return res.status(201).json({
    orderNumber,
    total: totalMxn,
    checkout: { mode: 'demo', message: 'Mercado Pago no está configurado: pedido en modo demostración.' },
    waLink,
  });
});

/** GET /api/orders/:orderNumber — datos para la página de confirmación. */
router.get('/orders/:orderNumber', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    include: { items: true, customer: true },
  });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  const waLink = buildWhatsAppLink({
    orderNumber: order.orderNumber,
    items: order.items,
    subtotalMxn: order.subtotalMxn,
    ivaMxn: order.ivaMxn,
    shippingMxn: order.shippingMxn,
    totalMxn: order.totalMxn,
    zoneName: order.zoneName,
  });

  res.json({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    items: order.items.map((it) => ({
      productName: it.productName,
      color: it.color,
      quantity: it.quantity,
      unitPriceMxn: it.unitPriceMxn,
      lineTotalMxn: it.lineTotalMxn,
    })),
    subtotalMxn: order.subtotalMxn,
    ivaMxn: order.ivaMxn,
    shippingMxn: order.shippingMxn,
    totalMxn: order.totalMxn,
    zoneName: order.zoneName,
    needsInvoice: order.needsInvoice,
    customer: { name: order.customer.name, city: order.customer.city, state: order.customer.state },
    waLink,
  });
});

export default router;
