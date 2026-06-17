import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { quoteShipping } from '../shipping/shippingService';

const router = Router();

const quoteSchema = z.object({
  postalCode: z.string().min(4).max(6),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }))
    .min(1),
});

/**
 * POST /api/shipping/quote
 * Body: { postalCode, items: [{ productId, quantity }] }
 * El servidor resuelve peso/medidas de cada producto desde la DB y cotiza.
 */
router.post('/shipping/quote', async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const { postalCode, items } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const shippingItems = items.map((i) => {
    const p = byId.get(i.productId);
    return {
      weightKg: p?.weightKg ?? 0,
      lengthCm: p?.lengthCm ?? 0,
      widthCm: p?.widthCm ?? 0,
      heightCm: p?.heightCm ?? 0,
      quantity: i.quantity,
    };
  });

  const quote = await quoteShipping({ postalCode, items: shippingItems });
  res.json(quote);
});

export default router;
