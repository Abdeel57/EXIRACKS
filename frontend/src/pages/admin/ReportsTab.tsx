import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, TrendingUp, ShoppingBag, Boxes, Receipt } from 'lucide-react';
import type { ReportData } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMxn } from '@/lib/money';
import { useAdmin, apiError } from './shared';

const PRESETS = [
  { key: '7d', label: '7 días', days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
  { key: 'all', label: 'Todo', days: 0 },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ReportsTab() {
  const { token, logout } = useAdmin();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('30d');
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(
    (f?: string, t?: string) => {
      setLoading(true);
      adminApi
        .reports(token, { from: f, to: t })
        .then(setData)
        .catch((e) => toast.error(apiError(e, logout)))
        .finally(() => setLoading(false));
    },
    [token, logout]
  );

  useEffect(() => {
    load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(key: string, days: number) {
    setPreset(key);
    if (days === 0) {
      setFrom('');
      setTo('');
      load(undefined, undefined);
    } else {
      const f = isoDaysAgo(days);
      const t = new Date().toISOString().slice(0, 10);
      setFrom(f);
      setTo(t);
      load(f, t);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.key} size="sm" variant={preset === p.key ? 'default' : 'outline'} onClick={() => applyPreset(p.key, p.days)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="mb-1 block text-xs">Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
        </div>
        <Button size="sm" variant="outline" onClick={() => { setPreset(''); load(from || undefined, to || undefined); }}>
          Aplicar
        </Button>
      </div>

      {loading || !data ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<TrendingUp className="h-5 w-5" />} label="Ingresos (pagados)" value={formatMxn(data.revenueMxn)} highlight />
            <Metric icon={<ShoppingBag className="h-5 w-5" />} label="Pedidos pagados" value={String(data.paidOrders)} />
            <Metric icon={<Boxes className="h-5 w-5" />} label="Unidades vendidas" value={String(data.unitsSold)} />
            <Metric icon={<Receipt className="h-5 w-5" />} label="Ticket promedio" value={formatMxn(data.avgOrderMxn)} />
          </div>

          <div className="card-surface p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Productos (sin IVA)</span>
              <span className="text-cream">{formatMxn(data.subtotalMxn)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Envíos cobrados</span>
              <span className="text-cream">{formatMxn(data.shippingMxn)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Pedidos totales (incl. pendientes)</span>
              <span className="text-cream">{data.ordersCount}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-gold/70">Productos más vendidos</p>
            {data.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay ventas en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((t, i) => (
                  <div key={t.name} className="card-surface flex items-center gap-3 p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm font-bold text-gold">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-cream">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.units} unidades</p>
                    </div>
                    <span className="font-display font-bold text-gold-gradient">{formatMxn(t.revenueMxn)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card-surface p-4">
      <div className={`mb-2 flex items-center gap-2 ${highlight ? 'text-gold' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <p className={`font-display text-xl font-bold ${highlight ? 'text-gold-gradient' : 'text-cream'}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
