import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

let configured = false;

/** Configura web-push con las llaves VAPID (una sola vez). */
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.vapid.publicKey || !env.vapid.privateKey) return false;
  try {
    webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] VAPID mal configurado:', err);
    return false;
  }
}

export function vapidPublicKey(): string {
  return env.vapid.publicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envía una notificación a TODOS los dispositivos de administradores suscritos.
 * Limpia automáticamente las suscripciones muertas (404/410). No lanza: los
 * errores se registran para no romper el flujo de pedidos.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          // Suscripción caducada o cancelada → eliminar.
          await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
        } else {
          console.error('[push] Error enviando notificación:', code, err?.body || err?.message);
        }
      }
    })
  );
}
