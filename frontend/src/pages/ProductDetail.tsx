import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Truck, Package, Check, Minus, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/store/cart';
import { formatMxn } from '@/lib/money';
import { colorStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setQty(1);
    api
      .getProduct(slug)
      .then((p) => {
        setProduct(p);
        setColor(p.colors[0] ?? null);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container grid gap-10 py-12 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-24 text-center">
        <p className="font-light text-muted-foreground">Producto no encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  const { dimensions: d } = product;

  return (
    <div className="container py-8">
      <Link to="/" className="mb-7 inline-flex items-center gap-1 text-sm font-light text-cream/60 transition-colors hover:text-gold">
        <ChevronLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid gap-12 md:grid-cols-2">
        {/* Escenario */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="md:sticky md:top-24 md:h-fit"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-[#fbfbfb] to-[#e7e7e7] shadow-gold">
            <div className="absolute inset-0 bg-spotlight" />
            <img src={product.images[0] || '/brand/logo.png'} alt={product.name} className="relative z-10 aspect-square w-full object-contain p-8" />
            {!product.inStock && (
              <span className="absolute left-4 top-4 z-20 rounded-full bg-ink/85 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-destructive backdrop-blur">
                Agotado
              </span>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold-line" />
            <p className="eyebrow">{product.category.name}</p>
          </div>
          <h1 className="mt-2 font-display text-5xl font-bold leading-none text-cream">{product.name}</h1>
          <p className="mt-4 font-display text-3xl font-bold text-gold-gradient">{formatMxn(product.priceMxn)}</p>
          <p className="mt-1 text-xs font-light text-muted-foreground">Precio + IVA en caso de requerir factura.</p>

          <p className="mt-6 text-sm font-light leading-relaxed text-cream/80">{product.description}</p>

          {product.colors.length > 0 && (
            <div className="mt-7">
              <p className="mb-2.5 text-sm font-light text-cream/90">
                Color: <span className="capitalize text-gold">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full border-2 transition-all duration-200',
                      color === c ? 'scale-110 border-gold' : 'border-border hover:border-gold/50'
                    )}
                  >
                    <span style={colorStyle(c)} className="h-6 w-6 rounded-full border border-white/20" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-border">
              <button className="grid h-12 w-12 place-items-center text-cream/70 transition-colors hover:text-gold" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button className="grid h-12 w-12 place-items-center text-cream/70 transition-colors hover:text-gold" onClick={() => setQty((q) => q + 1)} aria-label="Sumar">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" className="h-12 flex-1 uppercase tracking-[0.12em]" disabled={!product.inStock} onClick={() => add(product, color, qty)}>
              {product.inStock ? 'Agregar al carrito' : 'Agotado'}
            </Button>
          </div>

          {/* Especificaciones */}
          <div className="mt-9 space-y-3 rounded-lg border border-border bg-coal p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-cream">
              <Package className="h-4 w-4 text-gold" /> Especificaciones
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-light">
              <Spec label="Medidas / caja" value={`${d.lengthCm} × ${d.widthCm} × ${d.heightCm} cm`} />
              <Spec label="Peso aprox." value={`${d.weightKg} kg`} />
              <Spec label="Disponibilidad" value={product.inStock ? `${product.stock} en stock` : 'Agotado'} />
              <Spec label="Fabricación" value="Sobre medida" />
            </dl>
            <p className="flex items-center gap-2 pt-1 text-xs font-light text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-gold/70" /> Calcula tu envío por código postal en el checkout.
            </p>
          </div>

          <ul className="mt-6 space-y-2 text-xs font-light text-muted-foreground">
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-gold/70" /> Disponible en negro y dorado</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-gold/70" /> Imágenes ilustrativas; el producto puede variar</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-gold/70" /> Algunos accesorios decorativos no incluidos</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-cream">{value}</dd>
    </div>
  );
}
