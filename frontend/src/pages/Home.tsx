import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Truck, Ruler, Sparkles, ArrowRight, ArrowUpRight, MessageCircle, Boxes, Plus } from 'lucide-react';
import type { Category, Product } from '@/types';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Marquee } from '@/components/Marquee';
import { Reveal } from '@/components/Reveal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMxn } from '@/lib/money';
import { cn } from '@/lib/utils';

const WA = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
const PAGE = 24; // productos por tanda

const ZONES = [
  ['Z1', 'Local · Hermosillo', '1–2 días'],
  ['Z2', 'Sonora / Noroeste', '2–4 días'],
  ['Z3', 'Norte / Bajío', '3–5 días'],
  ['Z4', 'Centro', '4–6 días'],
  ['Z5', 'Sur / Sureste', '5–8 días'],
] as const;

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } } };

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getProducts({ featured: true }).then(setFeatured).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setVisible(PAGE); // reinicia la paginación al cambiar filtro/búsqueda
    const t = setTimeout(
      () => {
        api
          .getProducts({ category: activeCat || undefined, search: search || undefined })
          .then(setProducts)
          .catch(() => setProducts([]))
          .finally(() => setLoading(false));
      },
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [activeCat, search]);

  const hero = featured[0];
  const showFeatured = !activeCat && !search && featured.length > 1;
  const shown = products.slice(0, visible);

  return (
    <div>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 glow-gold" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[460px] w-[460px] rotate-45 border border-gold/10" />
        <div className="pointer-events-none absolute -right-24 top-28 h-[300px] w-[300px] rotate-45 border border-gold/[0.07]" />

        <div className="container relative grid items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div variants={item} className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-gold-line" />
              <span className="eyebrow">Colección 2026 · Hermosillo, Son.</span>
            </motion.div>
            <motion.h1 variants={item} className="font-display text-5xl font-bold leading-[0.98] text-cream md:text-7xl">
              Exhibe, organiza
              <br />y <span className="text-gold-gradient">vende mejor</span>
            </motion.h1>
            <motion.p variants={item} className="mt-6 max-w-md text-base font-light leading-relaxed text-muted-foreground">
              Maniquíes, racks, exhibidores y mobiliario comercial con acabado profesional. Fabricación a medida y
              envíos a todo México — en negro y dorado.
            </motion.p>
            <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
              <a href="#categorias" className="btn-gold inline-flex h-12 items-center gap-2 rounded-md px-7 text-sm font-medium uppercase tracking-[0.12em]">
                Explorar catálogo <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#envios" className="inline-flex h-12 items-center rounded-md border border-gold/40 px-7 text-sm font-medium uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold/10">
                Cotizar envío
              </a>
            </motion.div>
            <motion.div variants={item} className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-light text-muted-foreground">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold/70" /> Negro y dorado</span>
              <span className="flex items-center gap-2"><Ruler className="h-4 w-4 text-gold/70" /> Fabricación a medida</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-gold/70" /> Envío nacional</span>
            </motion.div>
          </motion.div>

          {hero && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
              className="relative mx-auto w-full max-w-md"
            >
              <Link to={`/producto/${hero.slug}`} className="group block">
                <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-[#fbfbfb] to-[#e7e7e7] shadow-gold">
                  <div className="absolute inset-0 bg-spotlight" />
                  <img src={hero.images[0]} alt={hero.name} className="relative z-10 aspect-[4/5] w-full animate-float object-contain p-8" />
                  <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5">
                    <div>
                      <p className="eyebrow">Destacado</p>
                      <p className="font-display text-2xl font-semibold text-white">{hero.name}</p>
                    </div>
                    <span className="font-display text-xl font-bold text-gold-light">{formatMxn(hero.priceMxn)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      <Marquee items={['Diseño', 'Creación', 'Solución', 'Envíos a todo México', 'Fabricación a medida', 'Negro y dorado']} />

      {/* ───────── DESTACADOS ───────── */}
      {showFeatured && (
        <section id="destacados" className="container scroll-mt-24 py-20">
          <Reveal className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Selección</p>
              <h2 className="font-display text-4xl font-bold text-cream md:text-5xl">Piezas destacadas</h2>
            </div>
            <a href="#categorias" className="hidden items-center gap-1.5 text-sm text-gold transition-colors hover:text-gold-light sm:flex">
              Ver todo <ArrowUpRight className="h-4 w-4" />
            </a>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── CATÁLOGO ───────── */}
      <section id="categorias" className="container scroll-mt-24 py-16">
        <Reveal>
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-10 bg-gold-line" />
            <span className="eyebrow">Catálogo completo · {categories.reduce((n, c) => n + c.productCount, 0)} piezas</span>
          </div>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="font-display text-4xl font-bold text-cream md:text-5xl">Explora la colección</h2>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="rounded-full pl-10" />
            </div>
          </div>
        </Reveal>

        {/* Chips de categoría */}
        <div className="mb-10 flex flex-wrap gap-2">
          <Chip active={activeCat === ''} onClick={() => setActiveCat('')}>Todo</Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={activeCat === c.slug} onClick={() => setActiveCat(c.slug)}>
              {c.name} <span className="opacity-50">{c.productCount}</span>
            </Chip>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-20 text-center font-light text-muted-foreground">No encontramos piezas con ese filtro.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {shown.length} de {products.length}
              </p>
              {visible < products.length && (
                <Button variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE)} className="gap-2">
                  <Plus className="h-4 w-4" /> Mostrar más
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ───────── ENVÍOS ───────── */}
      <section id="envios" className="relative scroll-mt-24 overflow-hidden border-t border-border bg-coal/30 py-20">
        <div className="pointer-events-none absolute inset-0 glow-gold" />
        <div className="container relative">
          <Reveal className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow mb-2">Logística</p>
              <h2 className="font-display text-4xl font-bold text-cream md:text-5xl">Envíos a todo México</h2>
              <p className="mt-4 max-w-md font-light text-muted-foreground">
                Calculamos el costo exacto en el checkout según tu código postal y el volumen del pedido. Salimos desde
                Hermosillo, Sonora.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-gold/25 bg-ink/50 px-4 py-3">
                <Boxes className="h-5 w-5 shrink-0 text-gold" />
                <p className="text-xs font-light text-cream/80">
                  Tarifa por <span className="text-gold">peso volumétrico</span> = (largo × ancho × alto) ÷ 5000
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ZONES.map(([code, area, eta], i) => (
                <Reveal key={code} delay={i * 0.05}>
                  <div className="h-full rounded-lg border border-border bg-ink/40 p-4 transition-colors hover:border-gold/40">
                    <p className="font-display text-3xl font-bold text-gold-gradient">{code}</p>
                    <p className="mt-2 text-xs font-medium text-cream">{area}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{eta}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="container py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-gold/25 px-8 py-14 text-center md:py-20">
            <div className="pointer-events-none absolute inset-0 glow-gold opacity-80" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-gold/10" />
            <div className="relative">
              <p className="eyebrow mb-3">¿Listo para crecer?</p>
              <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-tight text-cream md:text-5xl">
                Cuéntanos tu proyecto y lo fabricamos <span className="text-gold-gradient">a tu medida</span>
              </h2>
              {WA && (
                <a
                  href={`https://wa.me/${WA}?text=${encodeURIComponent('¡Hola Exiracks! Quiero cotizar un proyecto a medida.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold mt-8 inline-flex h-12 items-center gap-2 rounded-md px-8 text-sm font-medium uppercase tracking-[0.12em]"
                >
                  <MessageCircle className="h-4 w-4" /> Cotizar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-1.5 text-sm font-light transition-all duration-200',
        active ? 'border-gold bg-gold/15 text-gold' : 'border-border text-cream/70 hover:border-gold/50 hover:text-cream'
      )}
    >
      {children}
    </button>
  );
}
