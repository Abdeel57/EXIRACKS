import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Clock, MessageCircle, Loader2, Package } from 'lucide-react';
import type { OrderSummary } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatMxn } from '@/lib/money';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export default function Confirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const load = () => {
    if (!orderNumber) return;
    api.getOrder(orderNumber).then(setOrder).catch(() => setOrder(null)).finally(() => setLoading(false));
  };
  useEffect(load, [orderNumber]);

  async function handleDemoConfirm() {
    if (!orderNumber) return;
    setConfirming(true);
    try {
      await api.demoConfirm(orderNumber);
      toast.success('Pago confirmado (modo demo)');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo confirmar');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="container grid place-items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">No encontramos ese pedido.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Ir al inicio</Link></Button>
      </div>
    );
  }

  const isPaid = order.status === 'PAID' || order.status === 'SHIPPED';

  return (
    <div className="container max-w-2xl py-12">
      <div className="card-surface overflow-hidden">
        <div className="border-b border-border bg-coal/60 p-8 text-center">
          {isPaid ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          ) : (
            <Clock className="mx-auto h-14 w-14 text-gold" />
          )}
          <h1 className="mt-4 font-display text-3xl font-bold text-cream">
            {isPaid ? '¡Gracias por tu compra!' : 'Pedido recibido'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pedido <span className="font-mono font-semibold text-gold">{order.orderNumber}</span>
          </p>
          <Badge variant={isPaid ? 'success' : 'default'} className="mt-3">
            {STATUS_LABEL[order.status]}
          </Badge>
        </div>

        <div className="p-8">
          <div className="space-y-3">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-cream">
                  {it.quantity}× {it.productName}
                  {it.color ? <span className="text-muted-foreground"> · {it.color}</span> : null}
                </span>
                <span className="text-cream">{formatMxn(it.lineTotalMxn)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatMxn(order.subtotalMxn)} />
            {order.ivaMxn > 0 && <Row label="IVA" value={formatMxn(order.ivaMxn)} />}
            <Row label={`Envío · ${order.zoneName}`} value={formatMxn(order.shippingMxn)} />
            <div className="flex justify-between pt-2 text-base">
              <span className="font-semibold text-cream">Total</span>
              <span className="font-display text-xl font-bold text-gold-gradient">{formatMxn(order.totalMxn)}</span>
            </div>
          </dl>

          {/* Modo demo: confirmar pago manualmente */}
          {!isPaid && (order.paymentStatus === null || order.paymentStatus === 'demo') && (
            <div className="mt-6 rounded-md border border-gold/30 bg-gold/5 p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                <strong className="text-gold">Modo demostración:</strong> Mercado Pago no está configurado.
                Confirma el pago manualmente para probar el flujo completo.
              </p>
              <Button className="w-full" onClick={handleDemoConfirm} disabled={confirming}>
                {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar pago (demo)'}
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={order.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#25D366]/50 py-2.5 text-sm text-[#25D366] hover:bg-[#25D366]/10"
            >
              <MessageCircle className="h-4 w-4" /> Enviar resumen por WhatsApp
            </a>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/"><Package className="mr-2 h-4 w-4" /> Seguir comprando</Link>
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Te contactaremos para coordinar el envío a {order.customer.city}, {order.customer.state}.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-cream">{value}</span>
    </div>
  );
}
