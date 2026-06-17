import { env } from '../config/env';
import { formatMxn } from '../lib/money';

interface MailItem {
  productName: string;
  color?: string | null;
  quantity: number;
  lineTotalMxn: number;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: MailItem[];
  subtotalMxn: number;
  ivaMxn: number;
  shippingMxn: number;
  totalMxn: number;
  zoneName: string;
}

function buildHtml(o: OrderEmailData): string {
  const rows = o.items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${it.quantity}× ${it.productName}${
          it.color ? ` (${it.color})` : ''
        }</td><td align="right">${formatMxn(it.lineTotalMxn)}</td></tr>`
    )
    .join('');
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
    <div style="background:#0B0B0B;color:#C9A24B;padding:24px;text-align:center">
      <h1 style="margin:0;letter-spacing:4px">EXIRACKS</h1>
      <p style="margin:4px 0 0;color:#E8CE8B">Con propósito</p>
    </div>
    <div style="padding:24px">
      <h2>¡Gracias por tu compra, ${o.customerName}!</h2>
      <p>Tu pedido <strong>${o.orderNumber}</strong> fue recibido. Aquí está el resumen:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
      <hr style="border:none;border-top:1px solid #eee"/>
      <table style="width:100%;margin-top:8px">
        <tr><td>Subtotal</td><td align="right">${formatMxn(o.subtotalMxn)}</td></tr>
        ${o.ivaMxn > 0 ? `<tr><td>IVA</td><td align="right">${formatMxn(o.ivaMxn)}</td></tr>` : ''}
        <tr><td>Envío (${o.zoneName})</td><td align="right">${formatMxn(o.shippingMxn)}</td></tr>
        <tr><td><strong>Total</strong></td><td align="right"><strong>${formatMxn(o.totalMxn)}</strong></td></tr>
      </table>
      <p style="margin-top:24px;color:#666;font-size:13px">Te contactaremos para coordinar el envío. ¿Dudas? Responde este correo o escríbenos por WhatsApp.</p>
    </div>
  </div>`;
}

/**
 * Envía el correo de confirmación del pedido.
 * Provider configurable por MAIL_PROVIDER: "resend" | "smtp" | "none".
 * En "none" sólo registra en consola (útil en local).
 */
export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  const subject = `Tu pedido ${data.orderNumber} en Exiracks`;
  const html = buildHtml(data);

  try {
    if (env.mailProvider === 'resend' && env.resendApiKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(env.resendApiKey);
      await resend.emails.send({
        from: env.mailFrom,
        to: data.customerEmail,
        subject,
        html,
      });
      console.log(`[mailer] Correo enviado por Resend a ${data.customerEmail}`);
      return;
    }

    if (env.mailProvider === 'smtp' && env.smtp.host) {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      });
      await transport.sendMail({ from: env.mailFrom, to: data.customerEmail, subject, html });
      console.log(`[mailer] Correo enviado por SMTP a ${data.customerEmail}`);
      return;
    }

    console.log(
      `[mailer] (MODO none) Confirmación de ${data.orderNumber} para ${data.customerEmail} — configura MAIL_PROVIDER para enviar correos reales.`
    );
  } catch (err) {
    // No tumbar el pedido si el correo falla
    console.error('[mailer] Error enviando correo:', err);
  }
}
