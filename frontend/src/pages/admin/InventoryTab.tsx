import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, PackageX, Check } from 'lucide-react';
import type { AdminProduct } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatMxn } from '@/lib/money';
import { useAdmin, apiError } from './shared';

export default function InventoryTab() {
  const { token, logout } = useAdmin();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [view, setView] = useState('low'); // low = bajos + agotados
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    // "low" combina agotados + bajos: la API "low" sólo trae stock>0, así que
    // pedimos los activos y filtramos en cliente para incluir los agotados.
    const statusFilter = view === 'out' ? 'out' : 'active';
    adminApi
      .products(token, { status: statusFilter })
      .then((list) => {
        const filtered = view === 'low' ? list.filter((p) => p.stock <= 3) : list;
        setProducts(filtered.sort((a, b) => a.stock - b.stock));
      })
      .catch((e) => toast.error(apiError(e, logout)))
      .finally(() => setLoading(false));
  }, [token, view, logout]);

  useEffect(load, [load]);

  async function setStock(p: AdminProduct, value: number) {
    try {
      const updated = await adminApi.setStock(token, p.id, { set: Math.max(0, value) });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      toast.success(`Stock de ${p.name}: ${updated.stock}`);
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  const out = products.filter((p) => p.stock <= 0).length;
  const low = products.filter((p) => p.stock > 0 && p.stock <= 3).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface flex items-center gap-3 p-4">
          <PackageX className="h-7 w-7 text-destructive" />
          <div>
            <p className="font-display text-2xl font-bold text-cream">{out}</p>
            <p className="text-xs text-muted-foreground">Agotados</p>
          </div>
        </div>
        <div className="card-surface flex items-center gap-3 p-4">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <div>
            <p className="font-display text-2xl font-bold text-cream">{low}</p>
            <p className="text-xs text-muted-foreground">Stock bajo (≤3)</p>
          </div>
        </div>
      </div>

      <Select value={view} onChange={(e) => setView(e.target.value)} className="w-56">
        <option value="low">Por reabastecer (≤3)</option>
        <option value="out">Sólo agotados</option>
        <option value="all">Todo el inventario activo</option>
      </Select>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Todo en orden. Nada por reabastecer.</p>
      ) : (
        <div className="space-y-2.5">
          {products.map((p) => (
            <InventoryRow key={p.id} product={p} onSet={setStock} />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryRow({ product: p, onSet }: { product: AdminProduct; onSet: (p: AdminProduct, v: number) => void }) {
  const [value, setValue] = useState(String(p.stock));
  useEffect(() => setValue(String(p.stock)), [p.stock]);
  const changed = Number(value) !== p.stock;

  return (
    <div className="card-surface flex items-center gap-3 p-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-white/95">
        {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cream">{p.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatMxn(p.priceMxn)} ·{' '}
          {p.stock <= 0 ? (
            <span className="text-destructive">Agotado</span>
          ) : p.stock <= 3 ? (
            <span className="text-amber-400">Quedan {p.stock}</span>
          ) : (
            <span>{p.stock} en existencia</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-20 text-center"
        />
        <Button size="icon" className="h-9 w-9" disabled={!changed} onClick={() => onSet(p, Number(value) || 0)} aria-label="Guardar stock">
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
