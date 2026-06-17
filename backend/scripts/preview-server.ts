/**
 * Servidor de PREVISUALIZACIÓN local (SIN base de datos).
 *
 * Sirve el catálogo real y usa el MÓDULO DE ENVÍO real (shippingService),
 * con pedidos en memoria. Pensado sólo para ver/clickear la tienda sin tener
 * que instalar Postgres. El backend real (src/index.ts + Prisma) no cambia.
 *
 * Correr:  npx tsx scripts/preview-server.ts
 */
import express from 'express';
import cors from 'cors';
import { quoteShipping } from '../src/shipping/shippingService';
import { buildWhatsAppLink } from '../src/services/whatsapp';
import { env } from '../src/config/env';
import catalog from '../data/catalog.json';
import productosConfig from '../data/productos.config.json';

const app = express();
app.use(cors());
app.use(express.json());

const AGOTADOS = new Set(['rack-360', 'sam']);
const dims = (productosConfig as any).productos as Record<
  string,
  { lengthCm: number; widthCm: number; heightCm: number; weightKg: number }
>;
const catName = (slug: string) => catalog.categories.find((c) => c.slug === slug)?.name ?? slug;

// id = slug en modo preview
const products = (catalog.products as any[]).map((p) => {
  const d = dims[p.slug] ?? { lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 3 };
  return {
    id: p.slug,
    slug: p.slug,
    name: p.name,
    shortDesc: p.medidas || catName(p.category),
    description: `${p.name} — ${catName(p.category)} de Exiracks, con acabado profesional.${
      p.medidas ? ` Medidas: ${p.medidas}.` : ''
    }${p.colors?.length ? ` Disponible en ${p.colors.join(', ')}.` : ''} Fabricación a medida. Precio + IVA si requieres factura.`,
    priceMxn: p.priceMxn,
    colors: p.colors ?? [],
    images: [`/products/${p.slug}.png`],
    stock: AGOTADOS.has(p.slug) ? 0 : 8,
    inStock: !AGOTADOS.has(p.slug),
    featured: Boolean(p.featured),
    category: { slug: p.category, name: catName(p.category) },
    dimensions: d,
  };
});
const bySlug = new Map(products.map((p) => [p.slug, p]));

// Pedidos en memoria
const orders = new Map<string, any>();
let seq = 0;

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'exiracks-PREVIEW (sin DB)', mercadoPago: 'modo demo' })
);

app.get('/api/categories', (_req, res) => {
  res.json(
    catalog.categories.map((c) => ({
      id: c.slug,
      slug: c.slug,
      name: c.name,
      productCount: products.filter((p) => p.category.slug === c.slug).length,
    }))
  );
});

app.get('/api/products', (req, res) => {
  const { category, search, featured } = req.query as Record<string, string>;
  let list = products;
  if (category) list = list.filter((p) => p.category.slug === category);
  if (featured === 'true') list = list.filter((p) => p.featured);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
  }
  list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || a.priceMxn - b.priceMxn);
  res.json(list);
});

app.get('/api/products/:slug', (req, res) => {
  const p = bySlug.get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

app.post('/api/shipping/quote', async (req, res) => {
  const { postalCode, items } = req.body;
  const shippingItems = (items || []).map((i: any) => {
    const p = bySlug.get(i.productId);
    return {
      weightKg: p?.dimensions.weightKg ?? 0,
      lengthCm: p?.dimensions.lengthCm ?? 0,
      widthCm: p?.dimensions.widthCm ?? 0,
      heightCm: p?.dimensions.heightCm ?? 0,
      quantity: i.quantity,
    };
  });
  res.json(await quoteShipping({ postalCode, items: shippingItems }));
});

app.post('/api/orders', async (req, res) => {
  const data = req.body;
  const quote = await quoteShipping({
    postalCode: data.customer.postalCode,
    items: data.items.map((i: any) => {
      const p = bySlug.get(i.productId)!;
      return { ...p.dimensions, quantity: i.quantity };
    }),
  });
  if (quote.needsManualQuote || quote.costMxn === null) {
    return res.status(409).json({ error: 'cotizacion_manual', message: quote.message, quote });
  }
  const subtotalMxn = data.items.reduce((s: number, i: any) => s + bySlug.get(i.productId)!.priceMxn * i.quantity, 0);
  const ivaMxn = data.needsInvoice ? Math.round(subtotalMxn * env.ivaRate) : 0;
  const totalMxn = subtotalMxn + ivaMxn + quote.costMxn;
  const orderNumber = `EXI-${new Date().getFullYear()}-${String(++seq).padStart(4, '0')}`;
  const items = data.items.map((i: any) => {
    const p = bySlug.get(i.productId)!;
    return { productName: p.name, color: i.color ?? null, unitPriceMxn: p.priceMxn, quantity: i.quantity, lineTotalMxn: p.priceMxn * i.quantity };
  });
  const order = {
    orderNumber, status: 'PENDING', paymentStatus: null, createdAt: new Date().toISOString(),
    items, subtotalMxn, ivaMxn, shippingMxn: quote.costMxn, totalMxn,
    zoneName: quote.zoneName, needsInvoice: data.needsInvoice,
    customer: { name: data.customer.name, city: data.customer.city, state: data.customer.state,
      email: data.customer.email, phone: data.customer.phone,
      address: `${data.customer.street} ${data.customer.extNumber}, ${data.customer.colonia}, ${data.customer.city}, ${data.customer.state}, CP ${data.customer.postalCode}` },
    trackingCarrier: null, trackingNumber: null,
  };
  const waLink = buildWhatsAppLink({ orderNumber, items, subtotalMxn, ivaMxn, shippingMxn: quote.costMxn, totalMxn, zoneName: quote.zoneName });
  order['waLink' as keyof typeof order] = waLink as never;
  orders.set(orderNumber, order);
  res.status(201).json({ orderNumber, total: totalMxn, checkout: { mode: 'demo' }, waLink });
});

app.get('/api/orders/:orderNumber', (req, res) => {
  const o = orders.get(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(o);
});

app.post('/api/payments/demo-confirm/:orderNumber', (req, res) => {
  const o = orders.get(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Pedido no encontrado' });
  o.status = 'PAID';
  o.paymentStatus = 'demo';
  o.paidAt = new Date().toISOString();
  res.json({ ok: true, orderNumber: o.orderNumber, status: 'PAID' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === env.adminEmail && password === env.adminPassword) return res.json({ token: 'preview-token', email });
  res.status(401).json({ error: 'Correo o contraseña incorrectos' });
});

const guard = (req: express.Request, res: express.Response, next: express.NextFunction) =>
  (req.headers.authorization || '').includes('preview-token') ? next() : res.status(401).json({ error: 'No autorizado' });

app.get('/api/admin/orders', guard, (req, res) => {
  const status = req.query.status as string | undefined;
  let list = [...orders.values()].reverse();
  if (status) list = list.filter((o) => o.status === status);
  res.json(list.map((o) => ({ id: o.orderNumber, ...o })));
});
app.get('/api/admin/stats', guard, (_req, res) => {
  const all = [...orders.values()];
  res.json({
    pending: all.filter((o) => o.status === 'PENDING').length,
    paid: all.filter((o) => o.status === 'PAID').length,
    shipped: all.filter((o) => o.status === 'SHIPPED').length,
    cancelled: all.filter((o) => o.status === 'CANCELLED').length,
  });
});
app.patch('/api/admin/orders/:id', guard, (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Pedido no encontrado' });
  Object.assign(o, req.body);
  if (req.body.status === 'SHIPPED') o.shippedAt = new Date().toISOString();
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`\n🟡 Exiracks PREVIEW (sin DB) en http://localhost:${PORT}`);
  console.log(`   ${products.length} productos · módulo de envío real · pedidos en memoria\n`);
});
