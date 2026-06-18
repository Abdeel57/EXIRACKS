import { adminApi } from './api';

/** ¿El navegador soporta notificaciones push? */
export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Registra el service worker (idempotente). Seguro de llamar al arrancar. */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('[pwa] No se pudo registrar el service worker:', err);
  }
}

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

/** Estado del permiso de notificaciones de este dispositivo. */
export function notificationState(): PushState {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushState;
}

/** ¿Este dispositivo ya está suscrito a push? */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Activa las notificaciones push en este dispositivo: pide permiso, se suscribe
 * con la llave VAPID del servidor y registra la suscripción en el backend.
 */
export async function enablePush(token: string): Promise<void> {
  if (!pushSupported()) throw new Error('Este navegador no soporta notificaciones.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('No diste permiso de notificaciones. Actívalo en los ajustes del navegador.');
  }

  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await adminApi.pushPublicKey(token);

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  await adminApi.pushSubscribe(token, {
    endpoint: json.endpoint as string,
    keys: { p256dh: json.keys?.p256dh as string, auth: json.keys?.auth as string },
  });
}

/** Desactiva las notificaciones en este dispositivo. */
export async function disablePush(token: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await adminApi.pushUnsubscribe(token, sub.endpoint).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch (err) {
    console.error('[pwa] Error al desactivar push:', err);
  }
}
