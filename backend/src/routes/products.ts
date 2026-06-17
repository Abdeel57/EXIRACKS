import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/** GET /api/categories — lista de categorías con conteo de productos activos. */
router.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  res.json(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      productCount: c._count.products,
    }))
  );
});

/** GET /api/products?category=slug&search=texto&featured=true */
router.get('/products', async (req, res) => {
  const { category, search, featured } = req.query as Record<string, string>;

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(featured === 'true' ? { featured: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: [{ featured: 'desc' }, { priceMxn: 'asc' }],
  });

  res.json(products.map(serializeProduct));
});

/** GET /api/products/:slug — detalle de un producto. */
router.get('/products/:slug', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { category: true },
  });
  if (!product || !product.active) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(serializeProduct(product));
});

function serializeProduct(p: any) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDesc: p.shortDesc,
    description: p.description,
    priceMxn: p.priceMxn,
    colors: p.colors,
    images: p.images,
    stock: p.stock,
    inStock: p.stock > 0,
    featured: p.featured,
    category: { slug: p.category.slug, name: p.category.name },
    dimensions: { lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, weightKg: p.weightKg },
  };
}

export default router;
