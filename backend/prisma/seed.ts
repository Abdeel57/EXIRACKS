import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import catalog from '../data/catalog.json';
import productosConfig from '../data/productos.config.json';
import shippingConfig from '../src/shipping/shipping.config.json';

const prisma = new PrismaClient();

// Productos que arrancan AGOTADOS (stock 0) para demostrar el badge.
// Edítalo a tu gusto; por defecto todo lo demás tiene stock.
const AGOTADOS = new Set<string>(['rack-360', 'sam']);
const STOCK_DEFAULT = 8;

type CatProduct = {
  slug: string;
  name: string;
  category: string;
  priceMxn: number;
  medidas?: string;
  colors?: string[];
  featured?: boolean;
};

type DimConfig = { lengthCm: number; widthCm: number; heightCm: number; weightKg: number };

function buildShortDesc(p: CatProduct, categoryName: string): string {
  const base = p.medidas ? p.medidas : categoryName;
  return base.length > 90 ? base.slice(0, 87) + '…' : base;
}

function buildDescription(p: CatProduct, categoryName: string): string {
  const colores =
    p.colors && p.colors.length
      ? ` Disponible en ${p.colors.join(', ')}.`
      : '';
  const medidas = p.medidas ? ` Medidas: ${p.medidas}.` : '';
  return (
    `${p.name} — ${categoryName} de Exiracks, fabricado con acabado profesional para exhibir y vender mejor.` +
    `${medidas}${colores} Fabricación personalizada sobre medida disponible. Precio + IVA en caso de requerir factura.`
  );
}

async function main() {
  console.log('🌱 Sembrando base de datos Exiracks...');

  // ── Categorías ──────────────────────────────────────────────
  const categoryIdBySlug = new Map<string, string>();
  for (const c of catalog.categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: { slug: c.slug, name: c.name, order: c.order },
    });
    categoryIdBySlug.set(c.slug, cat.id);
  }
  console.log(`   ✓ ${catalog.categories.length} categorías`);

  // ── Productos ───────────────────────────────────────────────
  const dims = (productosConfig as { productos: Record<string, DimConfig> }).productos;
  let count = 0;
  for (const p of catalog.products as CatProduct[]) {
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) {
      console.warn(`   ! Producto ${p.slug} con categoría desconocida "${p.category}", se omite`);
      continue;
    }
    const categoryName = catalog.categories.find((c) => c.slug === p.category)?.name ?? p.category;
    const d = dims[p.slug] ?? { lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 3 };

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        priceMxn: p.priceMxn,
        shortDesc: buildShortDesc(p, categoryName),
        description: buildDescription(p, categoryName),
        colors: p.colors ?? [],
        images: [`/products/${p.slug}.png`],
        featured: Boolean(p.featured),
        categoryId,
        weightKg: d.weightKg,
        lengthCm: d.lengthCm,
        widthCm: d.widthCm,
        heightCm: d.heightCm,
      },
      create: {
        slug: p.slug,
        name: p.name,
        priceMxn: p.priceMxn,
        shortDesc: buildShortDesc(p, categoryName),
        description: buildDescription(p, categoryName),
        colors: p.colors ?? [],
        images: [`/products/${p.slug}.png`],
        stock: AGOTADOS.has(p.slug) ? 0 : STOCK_DEFAULT,
        featured: Boolean(p.featured),
        categoryId,
        weightKg: d.weightKg,
        lengthCm: d.lengthCm,
        widthCm: d.widthCm,
        heightCm: d.heightCm,
      },
    });
    count++;
  }
  console.log(`   ✓ ${count} productos`);

  // ── Zonas de envío ──────────────────────────────────────────
  const zones = shippingConfig.zones as Record<
    string,
    { name: string; etaMinDays: number; etaMaxDays: number; states: string[] }
  >;
  for (const [code, z] of Object.entries(zones)) {
    await prisma.shippingZone.upsert({
      where: { code },
      update: { name: z.name, states: z.states, etaMinDays: z.etaMinDays, etaMaxDays: z.etaMaxDays },
      create: { code, name: z.name, states: z.states, etaMinDays: z.etaMinDays, etaMaxDays: z.etaMaxDays },
    });
  }
  console.log(`   ✓ ${Object.keys(zones).length} zonas de envío`);

  // ── Administrador inicial ───────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@exiracks.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'cambiame123';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });
    console.log(`   ✓ admin inicial: ${adminEmail}`);
  } else {
    console.log(`   • admin ${adminEmail} ya existe (sin cambios)`);
  }

  console.log('✅ Seed completo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
