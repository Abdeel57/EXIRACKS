/** Marquesina dorada infinita con los valores de la marca (eco de las cintas del logo). */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="group relative overflow-hidden border-y border-border bg-coal/40 py-3.5">
      <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <span key={i} className="flex items-center">
            <span className="eyebrow px-8 text-gold/70">{t}</span>
            <span className="text-[8px] text-gold/40">◆</span>
          </span>
        ))}
      </div>
      {/* desvanecidos laterales */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
