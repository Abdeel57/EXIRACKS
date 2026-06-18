import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';
import { vapidPublicKey, sendPushToAdmins } from '../services/push';

const router = Router();
router.use(requireAdmin);

/** GET /api/admin/push/public-key — llave pública VAPID para suscribirse. */
router.get('/admin/push/public-key', (_req, res) => {
  res.json({ publicKey: vapidPublicKey() });
});

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** POST /api/admin/push/subscribe — guarda la suscripción de este dispositivo. */
router.post('/admin/push/subscribe', async (req, res) => {
  const parsed = subSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Suscripción inválida' });
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(201).json({ ok: true });
});

/** POST /api/admin/push/unsubscribe — quita la suscripción de este dispositivo. */
router.post('/admin/push/unsubscribe', async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
  if (endpoint) await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {});
  res.json({ ok: true });
});

/** POST /api/admin/push/test — envía una notificación de prueba a todos. */
router.post('/admin/push/test', async (_req, res) => {
  await sendPushToAdmins({
    title: 'Exiracks',
    body: '🔔 ¡Listo! Las notificaciones de compras están activas.',
    url: '/admin',
    tag: 'exiracks-test',
  });
  res.json({ ok: true });
});

export default router;
