import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: num(process.env.PORT, 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',

  databaseUrl: process.env.DATABASE_URL || '',

  // Mercado Pago
  mpAccessToken: process.env.MP_ACCESS_TOKEN || '',
  mpWebhookSecret: process.env.MP_WEBHOOK_SECRET || '',

  // Correo
  mailProvider: (process.env.MAIL_PROVIDER || 'none') as 'resend' | 'smtp' | 'none',
  mailFrom: process.env.MAIL_FROM || 'Exiracks <no-reply@exiracks.com>',
  resendApiKey: process.env.RESEND_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  // WhatsApp
  businessWhatsapp: process.env.BUSINESS_WHATSAPP || '',

  // Admin
  adminEmail: process.env.ADMIN_EMAIL || 'admin@exiracks.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'cambiame123',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiame',

  // Negocio
  ivaRate: num(process.env.IVA_RATE, 0.16),
};

/** ¿Mercado Pago está configurado? Si no, el checkout corre en modo DEMO. */
export const isMercadoPagoConfigured = (): boolean => env.mpAccessToken.trim().length > 0;
