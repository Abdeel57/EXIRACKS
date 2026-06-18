import 'express-async-errors'; // reenvía errores de handlers async al manejador de errores
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env, isMercadoPagoConfigured } from './config/env';
import { shippingProviderName } from './shipping/shippingService';

import productsRouter from './routes/products';
import shippingRouter from './routes/shipping';
import ordersRouter from './routes/orders';
import paymentsRouter from './routes/payments';
import webhooksRouter from './routes/webhooks';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import assetsRouter from './routes/assets';

const app = express();

// Detrás del proxy de Railway: confía en X-Forwarded-* para que req.protocol sea https.
app.set('trust proxy', 1);

app.use(cors({ origin: env.frontendUrl === '*' ? true : env.frontendUrl }));
app.use(express.json());
app.use(morgan('dev'));

// Health / info
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'exiracks-backend',
    mercadoPago: isMercadoPagoConfigured() ? 'configurado' : 'modo demo',
    shippingProvider: shippingProviderName(),
    mailProvider: env.mailProvider,
  });
});

// Rutas
app.use('/api', productsRouter);
app.use('/api', shippingRouter);
app.use('/api', ordersRouter);
app.use('/api', paymentsRouter);
app.use('/api', webhooksRouter);
app.use('/api', authRouter);
app.use('/api', assetsRouter);
app.use('/api', adminRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo de errores
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(env.port, () => {
  console.log(`\n🟡 Exiracks API en http://localhost:${env.port}`);
  console.log(`   Mercado Pago: ${isMercadoPagoConfigured() ? 'configurado ✓' : 'MODO DEMO (sin credenciales)'}`);
  console.log(`   Envío: ${shippingProviderName()}`);
  console.log(`   Correo: ${env.mailProvider}\n`);
});
