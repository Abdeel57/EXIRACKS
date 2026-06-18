import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { requireAdmin, AuthedRequest } from '../middleware/auth';
import { markOrderPaid, cancelOrder } from '../services/fulfillment';

const router = Router();

router.use(requireAdmin);

// ════════════════════════════════════════════════════════════════
//  Utilidades
// ════════════════════════════════════════════════════════════════

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/** Garantiza un slug único agregando sufijo -2, -3… si ya existe. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || 'producto';
  let slug = root;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

function serializeAdminProduct(p: any) {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    shortDesc: p.shortDesc,
    description: p.description,
    priceMxn: p.priceMxn,
    colors: p.colors,
    images: p.images,
    stock: p.stock,
    inStock: p.stock > 0,
    active: p.active,
    featured: p.featured,
    weightKg: p.weightKg,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    category: p.category ? { id: p.category.id, slug: p.category.slug, name: p.category.name } : null,
    categoryId: p.categoryId,
    soldCount: p._count?.orderItems ?? 0,
    updatedAt: p.updatedAt,
  };
}

// ════════════════════════════════════════════════════════════════
//  Tablero / estadísticas
// ════════════════════════════════════════════════════════════════

const LOW_STOCK_THRESHOLD = 3;

/** GET /api/admin/stats — resumen para el tablero. */
router.get('/admin/stats', async (_req, res) => {
  const [pending, paid, shipped, cancelled, totalProducts, activeProducts, lowStock, outOfStock, revenueAgg] =
    await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.product.count({ where: { active: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      prisma.product.count({ where: { active: true, stock: { lte: 0 } } }),
      prisma.order.aggregate({ _sum: { totalMxn: true }, where: { status: { in: ['PAID', 'SHIPPED'] } } }),
    ]);

  res.json({
    pending,
    paid,
    shipped,
    cancelled,
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    revenueMxn: revenueAgg._sum.totalMxn ?? 0,
  });
});

// ════════════════════════════════════════════════════════════════
//  Pedidos
// ════════════════════════════════════════════════════════════════

function serializeOrder(o: any) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    subtotalMxn: o.subtotalMxn,
    ivaMxn: o.ivaMxn,
    totalMxn: o.totalMxn,
    shippingMxn: o.shippingMxn,
    zoneName: o.zoneName,
    needsInvoice: o.needsInvoice,
    rfc: o.rfc,
    razonSocial: o.razonSocial,
    trackingCarrier: o.trackingCarrier,
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    shippedAt: o.shippedAt,
    customer: {
      name: o.customer.name,
      email: o.customer.email,
      phone: o.customer.phone,
      address: `${o.customer.street} ${o.customer.extNumber}${o.customer.intNumber ? ' int. ' + o.customer.intNumber : ''}, ${o.customer.colonia}, ${o.customer.city}, ${o.customer.state}, CP ${o.customer.postalCode}`,
    },
    items: o.items.map((it: any) => ({
      productName: it.productName,
      color: it.color,
      quantity: it.quantity,
      lineTotalMxn: it.lineTotalMxn,
    })),
  };
}

/** GET /api/admin/orders?status=&search= */
router.get('/admin/orders', async (req, res) => {
  const status = req.query.status as string | undefined;
  const search = (req.query.search as string | undefined)?.trim();

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(orders.map(serializeOrder));
});

/** GET /api/admin/orders/export — CSV de todos los pedidos (respeta ?status=). */
router.get('/admin/orders/export', async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : {},
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Pedido', 'Estado', 'Fecha', 'Cliente', 'Telefono', 'Email', 'Estado/Ciudad',
    'Zona', 'Productos', 'Subtotal', 'IVA', 'Envio', 'Total', 'Factura', 'Paqueteria', 'Guia',
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.status,
      o.createdAt.toISOString(),
      o.customer.name,
      o.customer.phone,
      o.customer.email,
      `${o.customer.city}, ${o.customer.state}`,
      o.zoneName,
      o.items.map((it) => `${it.quantity}x ${it.productName}`).join(' | '),
      o.subtotalMxn,
      o.ivaMxn,
      o.shippingMxn,
      o.totalMxn,
      o.needsInvoice ? 'Si' : 'No',
      o.trackingCarrier ?? '',
      o.trackingNumber ?? '',
    ]
      .map(esc)
      .join(',')
  );

  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pedidos-exiracks.csv"');
  res.send(csv);
});

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED']).optional(),
  trackingCarrier: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
});

/** PATCH /api/admin/orders/:id — cambia estado / agrega guía (con efectos de inventario). */
router.patch('/admin/orders/:id', async (req, res) => {
  const parsed = updateOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const { status, trackingCarrier, trackingNumber } = parsed.data;

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });

  // Transiciones de estado con efectos de inventario / correo
  if (status && status !== existing.status) {
    if (status === 'PAID') {
      await markOrderPaid(existing.id, { paymentStatus: 'manual' });
    } else if (status === 'CANCELLED') {
      await cancelOrder(existing.id);
    } else if (status === 'SHIPPED') {
      // Si aún no se había cobrado, descuenta inventario al despachar.
      if (existing.status === 'PENDING') {
        await markOrderPaid(existing.id, { paymentStatus: 'manual' });
      }
      await prisma.order.update({ where: { id: existing.id }, data: { status: 'SHIPPED', shippedAt: new Date() } });
    } else {
      await prisma.order.update({ where: { id: existing.id }, data: { status } });
    }
  }

  // Datos de guía (independiente del estado)
  if (trackingCarrier !== undefined || trackingNumber !== undefined) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        ...(trackingCarrier !== undefined ? { trackingCarrier } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
    });
  }

  const updated = await prisma.order.findUnique({
    where: { id: existing.id },
    include: { customer: true, items: true },
  });
  res.json(serializeOrder(updated));
});

// ════════════════════════════════════════════════════════════════
//  Categorías
// ════════════════════════════════════════════════════════════════

/** GET /api/admin/categories — todas, con conteo total de productos. */
router.get('/admin/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(
    categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, order: c.order, productCount: c._count.products }))
  );
});

const categorySchema = z.object({ name: z.string().min(2), order: z.number().int().optional() });

/** POST /api/admin/categories */
router.post('/admin/categories', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const slug = await (async () => {
    let s = slugify(parsed.data.name) || 'categoria';
    let i = 2;
    while (await prisma.category.findUnique({ where: { slug: s } })) s = `${slugify(parsed.data.name)}-${i++}`;
    return s;
  })();
  const count = await prisma.category.count();
  const cat = await prisma.category.create({
    data: { name: parsed.data.name, slug, order: parsed.data.order ?? count },
  });
  res.status(201).json({ id: cat.id, slug: cat.slug, name: cat.name, order: cat.order, productCount: 0 });
});

/** PATCH /api/admin/categories/:id — renombrar / reordenar. */
router.patch('/admin/categories/:id', async (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const cat = await prisma.category.update({
    where: { id: req.params.id },
    data: { ...(parsed.data.name ? { name: parsed.data.name } : {}), ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}) },
  });
  res.json({ id: cat.id, slug: cat.slug, name: cat.name, order: cat.order });
});

/** DELETE /api/admin/categories/:id — sólo si no tiene productos. */
router.delete('/admin/categories/:id', async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (count > 0) {
    return res.status(409).json({ error: `No se puede borrar: tiene ${count} producto(s). Muévelos primero.` });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════
//  Productos
// ════════════════════════════════════════════════════════════════

/** GET /api/admin/products?search=&category=&status=active|inactive|low|out */
router.get('/admin/products', async (req, res) => {
  const { search, category, status } = req.query as Record<string, string>;

  const where: any = {};
  if (category) where.category = { slug: category };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status === 'active') where.active = true;
  else if (status === 'inactive') where.active = false;
  else if (status === 'low') where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
  else if (status === 'out') where.stock = { lte: 0 };

  const products = await prisma.product.findMany({
    where,
    include: { category: true, _count: { select: { orderItems: true } } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
  res.json(products.map(serializeAdminProduct));
});

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional().nullable(),
  slug: z.string().optional(),
  shortDesc: z.string().optional(),
  description: z.string().optional(),
  priceMxn: z.number().int().min(0),
  colors: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().min(1),
  weightKg: z.number().min(0).optional(),
  lengthCm: z.number().int().min(0).optional(),
  widthCm: z.number().int().min(0).optional(),
  heightCm: z.number().int().min(0).optional(),
});

/** POST /api/admin/products — crear producto. */
router.post('/admin/products', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const d = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return res.status(400).json({ error: 'Categoría no válida' });

  if (d.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: d.sku } });
    if (dup) return res.status(409).json({ error: 'Ese SKU ya existe' });
  }

  const slug = await uniqueSlug(d.slug || d.name);
  const product = await prisma.product.create({
    data: {
      slug,
      sku: d.sku || null,
      name: d.name,
      shortDesc: d.shortDesc ?? '',
      description: d.description ?? '',
      priceMxn: d.priceMxn,
      colors: d.colors ?? [],
      images: d.images ?? [],
      stock: d.stock ?? 0,
      active: d.active ?? true,
      featured: d.featured ?? false,
      categoryId: d.categoryId,
      weightKg: d.weightKg ?? 0,
      lengthCm: d.lengthCm ?? 0,
      widthCm: d.widthCm ?? 0,
      heightCm: d.heightCm ?? 0,
    },
    include: { category: true, _count: { select: { orderItems: true } } },
  });
  res.status(201).json(serializeAdminProduct(product));
});

/** PATCH /api/admin/products/:id — actualizar producto. */
router.patch('/admin/products/:id', async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const d = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  if (d.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
    if (!category) return res.status(400).json({ error: 'Categoría no válida' });
  }
  if (d.sku && d.sku !== existing.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: d.sku } });
    if (dup && dup.id !== existing.id) return res.status(409).json({ error: 'Ese SKU ya existe' });
  }

  const data: any = {};
  for (const k of ['name', 'shortDesc', 'description', 'priceMxn', 'colors', 'images', 'stock', 'active', 'featured', 'categoryId', 'weightKg', 'lengthCm', 'widthCm', 'heightCm'] as const) {
    if (d[k] !== undefined) data[k] = d[k];
  }
  if (d.sku !== undefined) data.sku = d.sku || null;
  if (d.slug && d.slug !== existing.slug) data.slug = await uniqueSlug(d.slug, existing.id);

  const product = await prisma.product.update({
    where: { id: existing.id },
    data,
    include: { category: true, _count: { select: { orderItems: true } } },
  });
  res.json(serializeAdminProduct(product));
});

/** POST /api/admin/products/:id/stock — ajuste rápido { delta } o { set }. */
router.post('/admin/products/:id/stock', async (req, res) => {
  const schema = z.object({ delta: z.number().int().optional(), set: z.number().int().min(0).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || (parsed.data.delta === undefined && parsed.data.set === undefined)) {
    return res.status(400).json({ error: 'Indica delta o set' });
  }
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  const newStock =
    parsed.data.set !== undefined ? parsed.data.set : Math.max(0, existing.stock + (parsed.data.delta ?? 0));

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { stock: newStock },
    include: { category: true, _count: { select: { orderItems: true } } },
  });
  res.json(serializeAdminProduct(product));
});

/** DELETE /api/admin/products/:id — borra; si tiene ventas, lo desactiva. */
router.delete('/admin/products/:id', async (req, res) => {
  const count = await prisma.orderItem.count({ where: { productId: req.params.id } });
  if (count > 0) {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { active: false },
      include: { category: true, _count: { select: { orderItems: true } } },
    });
    return res.json({ ok: true, softDeleted: true, product: serializeAdminProduct(product) });
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ ok: true, softDeleted: false });
});

// ════════════════════════════════════════════════════════════════
//  Reportes
// ════════════════════════════════════════════════════════════════

/** GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get('/admin/reports', async (req, res) => {
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(`${toStr}T23:59:59.999`) : undefined;

  const dateWhere = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const paidWhere = { status: { in: ['PAID', 'SHIPPED'] as any }, ...dateWhere };

  const [agg, ordersCount, paidOrders, topItems] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalMxn: true, subtotalMxn: true, shippingMxn: true }, where: paidWhere }),
    prisma.order.count({ where: dateWhere }),
    prisma.order.count({ where: paidWhere }),
    prisma.orderItem.groupBy({
      by: ['productName'],
      where: { order: paidWhere },
      _sum: { quantity: true, lineTotalMxn: true },
      orderBy: { _sum: { lineTotalMxn: 'desc' } },
      take: 10,
    }),
  ]);

  const revenue = agg._sum.totalMxn ?? 0;
  const units = topItems.reduce((s, t) => s + (t._sum.quantity ?? 0), 0);

  res.json({
    revenueMxn: revenue,
    subtotalMxn: agg._sum.subtotalMxn ?? 0,
    shippingMxn: agg._sum.shippingMxn ?? 0,
    ordersCount,
    paidOrders,
    avgOrderMxn: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
    unitsSold: units,
    topProducts: topItems.map((t) => ({
      name: t.productName,
      units: t._sum.quantity ?? 0,
      revenueMxn: t._sum.lineTotalMxn ?? 0,
    })),
  });
});

// ════════════════════════════════════════════════════════════════
//  Subida de imágenes (se guardan en la base, se sirven en /api/assets/:id)
// ════════════════════════════════════════════════════════════════

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Solo se permiten imágenes')),
});

/** URL pública base: usa BACKEND_URL si está configurado (y no es localhost); si no, la deriva del request. */
function publicBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  if (env.backendUrl && !env.backendUrl.includes('localhost')) return env.backendUrl.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/** POST /api/admin/upload — sube una imagen y devuelve su URL pública. */
router.post('/admin/upload', (req, res) => {
  upload.single('file')(req, res, async (err: any) => {
    try {
      if (err) return res.status(400).json({ error: err.message || 'No se pudo subir la imagen' });
      if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });
      const asset = await prisma.asset.create({
        data: { mimeType: req.file.mimetype, data: req.file.buffer, sizeBytes: req.file.size },
      });
      res.status(201).json({ id: asset.id, url: `${publicBaseUrl(req)}/api/assets/${asset.id}` });
    } catch (e) {
      console.error('[admin/upload]', e);
      res.status(500).json({ error: 'No se pudo guardar la imagen' });
    }
  });
});

// ════════════════════════════════════════════════════════════════
//  Administradores
// ════════════════════════════════════════════════════════════════

/** GET /api/admin/users — lista de administradores (sin hash). */
router.get('/admin/users', async (_req, res) => {
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      active: u.active,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }))
  );
});

const newUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
});

/** POST /api/admin/users — crear administrador. */
router.post('/admin/users', async (req, res) => {
  const parsed = newUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Correo válido y contraseña de 6+ caracteres' });
  const email = parsed.data.email.toLowerCase();
  const dup = await prisma.adminUser.findUnique({ where: { email } });
  if (dup) return res.status(409).json({ error: 'Ya existe un administrador con ese correo' });
  const user = await prisma.adminUser.create({
    data: {
      email,
      name: parsed.data.name ?? '',
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  res.status(201).json({ id: user.id, email: user.email, name: user.name, active: user.active, createdAt: user.createdAt, lastLoginAt: null });
});

/** PATCH /api/admin/users/:id — activar/desactivar o renombrar. */
router.patch('/admin/users/:id', async (req: AuthedRequest, res) => {
  const schema = z.object({ active: z.boolean().optional(), name: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  if (parsed.data.active === false) {
    if (req.admin?.id === req.params.id) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    const activeCount = await prisma.adminUser.count({ where: { active: true } });
    if (activeCount <= 1) return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
  }

  const user = await prisma.adminUser.update({
    where: { id: req.params.id },
    data: { ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}), ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}) },
  });
  res.json({ id: user.id, email: user.email, name: user.name, active: user.active, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt });
});

/** DELETE /api/admin/users/:id — eliminar administrador (no a ti mismo ni al último). */
router.delete('/admin/users/:id', async (req: AuthedRequest, res) => {
  if (req.admin?.id === req.params.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  const total = await prisma.adminUser.count();
  if (total <= 1) return res.status(400).json({ error: 'Debe quedar al menos un administrador' });
  await prisma.adminUser.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) });

/** POST /api/admin/account/password — cambiar la contraseña propia. */
router.post('/admin/account/password', async (req: AuthedRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'La nueva contraseña debe tener 6+ caracteres' });

  if (!req.admin || req.admin.id === 'env') {
    return res.status(400).json({ error: 'Tu sesión usa credenciales de .env. Ejecuta el seed para crear tu usuario.' });
  }
  const user = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  res.json({ ok: true });
});

export default router;
