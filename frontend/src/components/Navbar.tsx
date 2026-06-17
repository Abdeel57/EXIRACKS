import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/store/cart';
import { cn } from '@/lib/utils';

const LINKS = [
  { label: 'Catálogo', href: '/#categorias' },
  { label: 'Destacados', href: '/#destacados' },
  { label: 'Envíos', href: '/#envios' },
];

export function Navbar() {
  const { count, open } = useCart();
  const total = count();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled ? 'border-b border-border bg-ink/90 backdrop-blur-md' : 'border-b border-transparent bg-gradient-to-b from-ink/80 to-transparent'
      )}
    >
      <div className="container flex h-[72px] items-center justify-between">
        <Link to="/" className="flex items-center transition-opacity hover:opacity-90" aria-label="Exiracks · inicio">
          <img src="/brand/logo.png" alt="Exiracks · Con propósito" className="h-14 w-auto" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="group relative text-sm font-light tracking-wide text-cream/75 transition-colors hover:text-gold"
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-gold-line transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <button
          onClick={open}
          className="relative grid h-11 w-11 place-items-center rounded-full border border-border text-cream transition-colors hover:border-gold/50 hover:text-gold"
          aria-label="Abrir carrito"
        >
          <ShoppingBag className="h-[18px] w-[18px]" />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-gradient px-1 text-[11px] font-semibold text-ink">
              {total}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
