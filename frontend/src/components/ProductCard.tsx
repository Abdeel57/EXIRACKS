import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/store/cart';
import { formatMxn } from '@/lib/money';
import { colorStyle } from '@/lib/colors';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const to = `/producto/${product.slug}`;

  return (
    <div className="group/card relative flex flex-col overflow-hidden rounded-lg border border-border bg-coal transition-all duration-300 hover:border-gold/45 hover:shadow-gold">
      {/* Zona de imagen — escenario con luz */}
      <div className="relative">
        <Link
          to={to}
          className="relative block aspect-square overflow-hidden bg-gradient-to-b from-[#fbfbfb] to-[#e9e9e9]"
        >
          <div className="absolute inset-0 bg-spotlight opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
          {/* reflejo de pedestal */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/5" />
          <img
            src={product.images[0] || '/brand/logo.png'}
            alt={product.name}
            loading="lazy"
            className="relative z-10 h-full w-full object-contain p-4 transition-transform duration-700 ease-out group-hover/card:scale-[1.06]"
          />
          {!product.inStock && (
            <span className="absolute left-3 top-3 z-20 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-destructive backdrop-blur">
              Agotado
            </span>
          )}
          {product.featured && product.inStock && (
            <span className="absolute left-3 top-3 z-20 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur">
              Destacado
            </span>
          )}
        </Link>

        {/* Agregar rápido (aparece en hover, escritorio) */}
        {product.inStock && (
          <button
            onClick={() => add(product, product.colors[0] ?? null, 1)}
            className="btn-gold absolute inset-x-3 bottom-3 z-20 hidden h-10 translate-y-2 items-center justify-center gap-2 rounded-md text-xs font-medium uppercase tracking-[0.15em] opacity-0 transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 md:flex"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow">{product.category.name}</p>
        <Link to={to}>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-cream transition-colors group-hover/card:text-gold">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-xs font-light text-muted-foreground">{product.shortDesc}</p>

        {product.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {product.colors.slice(0, 5).map((c) => (
              <span key={c} title={c} style={colorStyle(c)} className="h-3.5 w-3.5 rounded-full border border-white/20" />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{product.colors.length - 5}</span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Desde</p>
            <span className="font-display text-2xl font-bold text-gold-gradient">{formatMxn(product.priceMxn)}</span>
          </div>
          <Button
            size="icon"
            variant="outline"
            disabled={!product.inStock}
            onClick={() => add(product, product.colors[0] ?? null, 1)}
            aria-label={`Agregar ${product.name}`}
            className="rounded-full md:hidden"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
