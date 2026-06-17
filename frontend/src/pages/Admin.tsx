import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LogOut, Package, Truck, RefreshCw } from 'lucide-react';
import type { AdminOrder } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatMxn } from '@/lib/money';

const TOKEN_KEY = 'exiracks-admin-token';
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'muted' | 'soldout'> = {
  PENDING: 'default',
  PAID: 'success',
  SHIPPED: 'muted',
  CANCELLED: 'soldout',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onLogin={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} />;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onLogin(res.token);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container grid min-h-[70vh] place-items-center py-12">
      <form onSubmit={submit} className="card-surface w-full max-w-sm p-8">
        <img src="/brand/logo.png" alt="Exiracks" className="mx-auto h-14" />
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-cream">Panel de pedidos</h1>
        <p className="mb-6 text-center text-xs text-muted-foreground">Acceso restringido</p>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState({ pending: 0, paid: 0, shipped: 0, cancelled: 0 });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.adminOrders(token, filter || undefined), api.adminStats(token)])
      .then(([o, s]) => { setOrders(o); setStats(s); })
      .catch((e: any) => {
        if (e?.status === 401) { toast.error('Sesión expirada'); onLogout(); }
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  async function update(id: string, body: { status?: string; trackingCarrier?: string; trackingNumber?: string }) {
    try {
      await api.adminUpdateOrder(token, id, body);
      toast.success('Pedido actualizado');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar');
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-cream">Pedidos</h1>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="mr-1 h-4 w-4" /> Salir
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pendientes" value={stats.pending} />
        <Stat label="Pagados" value={stats.paid} />
        <Stat label="Enviados" value={stats.shipped} />
        <Stat label="Cancelados" value={stats.cancelled} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-48">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="PAID">Pagados</option>
          <option value="SHIPPED">Enviados</option>
          <option value="CANCELLED">Cancelados</option>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-4 w-4" /> Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>
      ) : orders.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Sin pedidos en este filtro.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => <OrderRow key={o.id} order={o} onUpdate={update} />)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onUpdate }: { order: AdminOrder; onUpdate: (id: string, body: any) => void }) {
  const [carrier, setCarrier] = useState(order.trackingCarrier || '');
  const [tracking, setTracking] = useState(order.trackingNumber || '');

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono font-semibold text-gold">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString('es-MX')} · {order.customer.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          <span className="font-display text-lg font-bold text-cream">{formatMxn(order.totalMxn)}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold/70">
            <Package className="h-3.5 w-3.5" /> Productos
          </p>
          <ul className="space-y-0.5 text-cream/90">
            {order.items.map((it, i) => (
              <li key={i}>{it.quantity}× {it.productName}{it.color ? ` · ${it.color}` : ''}</li>
            ))}
          </ul>
          {order.needsInvoice && <p className="mt-1 text-xs text-amber-300">Requiere factura</p>}
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold/70">
            <Truck className="h-3.5 w-3.5" /> Envío · {order.zoneName}
          </p>
          <p className="text-cream/90">{order.customer.address}</p>
          <p className="text-xs text-muted-foreground">{order.customer.phone} · {order.customer.email}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        {order.status !== 'SHIPPED' && order.status !== 'CANCELLED' && (
          <>
            <div className="flex-1 min-w-32">
              <Label className="mb-1 block text-xs">Paquetería</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Estafeta, FedEx..." className="h-9" />
            </div>
            <div className="flex-1 min-w-32">
              <Label className="mb-1 block text-xs">No. de guía</Label>
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} className="h-9" />
            </div>
            <Button size="sm" onClick={() => onUpdate(order.id, { status: 'SHIPPED', trackingCarrier: carrier, trackingNumber: tracking })}>
              Marcar enviado
            </Button>
            {order.status === 'PENDING' && (
              <Button size="sm" variant="outline" onClick={() => onUpdate(order.id, { status: 'PAID' })}>
                Marcar pagado
              </Button>
            )}
          </>
        )}
        {order.status === 'SHIPPED' && order.trackingNumber && (
          <p className="text-sm text-muted-foreground">
            Guía: <span className="text-cream">{order.trackingCarrier} {order.trackingNumber}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-4 text-center">
      <p className="font-display text-3xl font-bold text-gold-gradient">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
