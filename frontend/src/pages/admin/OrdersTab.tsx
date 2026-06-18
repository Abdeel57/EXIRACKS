import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Package, Truck, RefreshCw, Search, Download, Ban, X } from 'lucide-react';
import type { AdminOrder } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatMxn } from '@/lib/money';
import { useAdmin, apiError, STATUS_LABEL, STATUS_VARIANT } from './shared';

export default function OrdersTab() {
  const { token, logout } = useAdmin();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .orders(token, { status: filter || undefined, search: search || undefined })
      .then(setOrders)
      .catch((e) => toast.error(apiError(e, logout)))
      .finally(() => setLoading(false));
  }, [token, filter, search, logout]);

  // Recarga al cambiar el filtro; la búsqueda se dispara con debounce.
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function update(id: string, body: Parameters<typeof adminApi.updateOrder>[2], okMsg = 'Pedido actualizado') {
    try {
      const updated = await adminApi.updateOrder(token, id, body);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success(okMsg);
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  async function exportCsv() {
    try {
      const blob = await adminApi.exportOrders(token, filter || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pedidos-exiracks.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente o teléfono…"
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="flex-1 sm:w-40">
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="PAID">Pagados</option>
            <option value="SHIPPED">Enviados</option>
            <option value="CANCELLED">Cancelados</option>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Actualizar" title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportCsv} aria-label="Exportar CSV" title="Exportar CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Sin pedidos en este filtro.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} onUpdate={update} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({
  order,
  onUpdate,
}: {
  order: AdminOrder;
  onUpdate: (id: string, body: any, okMsg?: string) => void;
}) {
  const [carrier, setCarrier] = useState(order.trackingCarrier || '');
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const open = order.status !== 'SHIPPED' && order.status !== 'CANCELLED';

  function cancel() {
    if (confirm(`¿Cancelar el pedido ${order.orderNumber}? Si ya estaba pagado, se repone el inventario.`)) {
      onUpdate(order.id, { status: 'CANCELLED' }, 'Pedido cancelado');
    }
  }

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
              <li key={i}>
                {it.quantity}× {it.productName}
                {it.color ? ` · ${it.color}` : ''}
              </li>
            ))}
          </ul>
          {order.needsInvoice && (
            <p className="mt-1 text-xs text-amber-300">
              Requiere factura{order.rfc ? ` · RFC ${order.rfc}` : ''}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold/70">
            <Truck className="h-3.5 w-3.5" /> Envío · {order.zoneName}
          </p>
          <p className="break-words text-cream/90">{order.customer.address}</p>
          <p className="break-words text-xs text-muted-foreground">
            <a href={`tel:${order.customer.phone}`} className="hover:text-gold">{order.customer.phone}</a> ·{' '}
            <a href={`mailto:${order.customer.email}`} className="hover:text-gold">{order.customer.email}</a>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        {open && (
          <>
            <div className="min-w-32 flex-1">
              <Label className="mb-1 block text-xs">Paquetería</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Estafeta, FedEx…" className="h-9" />
            </div>
            <div className="min-w-32 flex-1">
              <Label className="mb-1 block text-xs">No. de guía</Label>
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} className="h-9" />
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => onUpdate(order.id, { status: 'SHIPPED', trackingCarrier: carrier, trackingNumber: tracking }, 'Marcado como enviado')}
              >
                Marcar enviado
              </Button>
              {order.status === 'PENDING' && (
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => onUpdate(order.id, { status: 'PAID' }, 'Marcado como pagado')}>
                  Marcar pagado
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={cancel}>
                <Ban className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </>
        )}
        {order.status === 'SHIPPED' && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {order.trackingNumber ? (
              <p className="text-sm text-muted-foreground">
                Guía: <span className="text-cream">{order.trackingCarrier} {order.trackingNumber}</span>
              </p>
            ) : (
              <span className="text-sm text-muted-foreground">Enviado</span>
            )}
          </div>
        )}
        {order.status === 'CANCELLED' && <span className="text-sm text-muted-foreground">Pedido cancelado</span>}
      </div>
    </div>
  );
}
