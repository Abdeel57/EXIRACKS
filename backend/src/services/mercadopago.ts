import { MercadoPagoConfig, Preference } from 'mercadopago';
import { env, isMercadoPagoConfigured } from '../config/env';

export interface MpItemInput {
  title: string;
  quantity: number;
  unitPrice: number; // MXN
}

export interface CreatePreferenceInput {
  orderId: string;
  orderNumber: string;
  items: MpItemInput[];
  shippingMxn: number;
  payerEmail: string;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string; // URL a la que se redirige al cliente para pagar
}

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro).
 * Lanza error si MP no está configurado (el caller debe usar modo DEMO).
 */
export async function createPaymentPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  if (!isMercadoPagoConfigured()) {
    throw new Error('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN).');
  }

  const client = new MercadoPagoConfig({ accessToken: env.mpAccessToken });
  const preference = new Preference(client);

  const items = input.items.map((it, i) => ({
    id: `${input.orderNumber}-${i}`,
    title: it.title,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    currency_id: 'MXN',
  }));

  // El envío se agrega como un item más para que el total cobrado coincida.
  if (input.shippingMxn > 0) {
    items.push({
      id: `${input.orderNumber}-envio`,
      title: 'Envío',
      quantity: 1,
      unit_price: input.shippingMxn,
      currency_id: 'MXN',
    });
  }

  const result = await preference.create({
    body: {
      items,
      payer: { email: input.payerEmail },
      external_reference: input.orderId,
      back_urls: {
        success: `${env.frontendUrl}/pedido/${input.orderNumber}`,
        failure: `${env.frontendUrl}/pedido/${input.orderNumber}`,
        pending: `${env.frontendUrl}/pedido/${input.orderNumber}`,
      },
      auto_return: 'approved',
      notification_url: `${env.backendUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'EXIRACKS',
    },
  });

  return {
    preferenceId: result.id as string,
    initPoint: (result.init_point || result.sandbox_init_point) as string,
  };
}

/** Consulta el estado de un pago por su ID (usado por el webhook). */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: string;
  externalReference: string | null;
} | null> {
  if (!isMercadoPagoConfigured()) return null;
  try {
    const client = new MercadoPagoConfig({ accessToken: env.mpAccessToken });
    const { Payment } = await import('mercadopago');
    const payment = new Payment(client);
    const data = await payment.get({ id: paymentId });
    return {
      status: (data.status as string) || 'unknown',
      externalReference: (data.external_reference as string) || null,
    };
  } catch (err) {
    console.error('[mercadopago] Error consultando pago', paymentId, err);
    return null;
  }
}
