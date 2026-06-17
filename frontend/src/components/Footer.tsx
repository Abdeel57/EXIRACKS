import { Link } from 'react-router-dom';
import { MapPin, Clock, Instagram, ArrowUp } from 'lucide-react';

const TAGS = ['Diseño', 'Creación', 'Solución'];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-coal/50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-line" />

      {/* Cintas de marca */}
      <div className="container flex flex-wrap items-center justify-center gap-3 pt-12">
        {TAGS.map((t) => (
          <span
            key={t}
            className="rounded-full border border-gold/30 px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-gold/80"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src="/brand/logo.png" alt="Exiracks" className="h-16 w-auto" />
          <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
            Soluciones para exhibir, organizar y crecer. Maniquíes, racks, exhibidores y mobiliario comercial fabricado
            a medida. Envíos a todo México desde Hermosillo, Sonora.
          </p>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Contacto</h4>
          <ul className="space-y-3 text-sm font-light text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              Calle Guadalupe Victoria 114, Col. San Benito, Hermosillo, Son. C.P. 83190
            </li>
            <li className="flex items-center gap-2.5">
              <Instagram className="h-4 w-4 shrink-0 text-gold/70" /> @Exiracks
            </li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Horario</h4>
          <ul className="space-y-3 text-sm font-light text-muted-foreground">
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 shrink-0 text-gold/70" /> Lun–Vie · 9:00 a 18:00</li>
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 shrink-0 text-gold/70" /> Sábado · 9:00 a 15:00</li>
          </ul>
          <Link to="/admin" className="mt-5 inline-block text-xs font-light text-cream/40 transition-colors hover:text-gold">
            Panel de pedidos →
          </Link>
        </div>
      </div>

      <div className="hairline mx-auto max-w-5xl" />
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-center text-xs font-light text-muted-foreground sm:flex-row sm:text-left">
        <span>© {new Date().getFullYear()} Exiracks · Con propósito. Imágenes ilustrativas; el producto puede variar.</span>
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1.5 text-cream/50 transition-colors hover:text-gold">
          Volver arriba <ArrowUp className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}
