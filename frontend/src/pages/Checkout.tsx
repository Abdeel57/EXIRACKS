import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Truck, ChevronLeft, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { formatMxn } from '@/lib/money';
import type { ShippingQuote, CustomerInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const IVA_RATE = 0.16; // sólo display; el backend recalcula el total real

const emptyCustomer: CustomerInput = {
  name: '', email: '', phone: '', street: '', extNumber: '', intNumber: '',
  colonia: '', city: '', state: '', postalCode: '', references: '',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const [customer, setCustomer] = useState<CustomerInput>(emptyCustomer);
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCustomer((c) => ({ ...c, [k]: e.target.value }));

  const sub = subtotal();
  const iva = needsInvoice ? Math.round(sub * IVA_RATE) : 0;
  const shipping = quote?.costMxn ?? 0;
  const total = sub + iva + shipping;

  // Cotiza el envío cuando el CP tiene 5 dígitos
  useEffect(() => {
    const cp = customer.postalCode.replace(/\D/g, '');
    if (cp.length !== 5 || items.length === 0) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    const t = setTimeout(() => {
      api
        .quoteShipping(cp, items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(t);
  }, [customer.postalCode, items]);

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  const canPay =
    customer.name && customer.email && customer.phone && customer.street && customer.extNumber &&
    customer.colonia && customer.city && customer.state && customer.postalCode.length >= 5 &&
    quote && !quote.needsManualQuote && quote.costMxn !== null &&
    (!needsInvoice || (rfc && razonSocial));

  async function handlePay() {
    if (!canPay) {
      toast.error('Completa tus datos y verifica el envío antes de pagar.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        customer: { ...customer, postalCode: customer.postalCode.replace(/\D/g, '') },
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, color: i.color })),
        needsInvoice,
        rfc: needsInvoice ? rfc : undefined,
        razonSocial: needsInvoice ? razonSocial : undefined,
      });

      if (res.checkout.mode === 'mercadopago' && res.checkout.initPoint) {
        clear();
        window.location.href = res.checkout.initPoint; // redirige a Mercado Pago
        return;
      }
      // Modo demo o error: vamos a la confirmación
      clear();
      toast.success(`Pedido ${res.orderNumber} creado`);
      navigate(`/pedido/${res.orderNumber}`);
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error(err.message || 'Tu envío requiere cotización manual. Escríbenos por WhatsApp.');
      } else {
        toast.error(err?.message || 'No pudimos crear el pedido. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-cream/70 hover:text-gold">
        <ChevronLeft className="h-4 w-4" /> Seguir comprando
      </Link>
      <h1 className="mb-8 font-display text-4xl font-bold text-cream">Finalizar compra</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* FORMULARIO */}
        <div className="space-y-8">
          <section className="card-surface p-6">
            <h2 className="mb-4 font-display text-xl font-semibold text-cream">Datos de contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo *"><Input value={customer.name} onChange={set('name')} /></Field>
              <Field label="Teléfono *"><Input value={customer.phone} onChange={set('phone')} inputMode="tel" /></Field>
              <Field label="Correo electrónico *" className="sm:col-span-2">
                <Input type="email" value={customer.email} onChange={set('email')} />
              </Field>
            </div>
          </section>

          <section className="card-surface p-6">
            <h2 className="mb-4 font-display text-xl font-semibold text-cream">Dirección de envío</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Calle *" className="sm:col-span-2"><Input value={customer.street} onChange={set('street')} /></Field>
              <Field label="No. exterior *"><Input value={customer.extNumber} onChange={set('extNumber')} /></Field>
              <Field label="No. interior"><Input value={customer.intNumber} onChange={set('intNumber')} /></Field>
              <Field label="Colonia *"><Input value={customer.colonia} onChange={set('colonia')} /></Field>
              <Field label="Código postal *">
                <Input value={customer.postalCode} onChange={set('postalCode')} inputMode="numeric" maxLength={5} placeholder="83190" />
              </Field>
              <Field label="Ciudad *"><Input value={customer.city} onChange={set('city')} /></Field>
              <Field label="Estado *"><Input value={customer.state} onChange={set('state')} /></Field>
              <Field label="Referencias (opcional)" className="sm:col-span-2">
                <Input value={customer.references} onChange={set('references')} placeholder="Entre calles, color de fachada..." />
              </Field>
            </div>
          </section>

          <section className="card-surface p-6">
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={needsInvoice} onCheckedChange={(v) => setNeedsInvoice(Boolean(v))} />
              <span className="text-sm text-cream">Necesito factura (se agrega 16% de IVA)</span>
            </label>
            {needsInvoice && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="RFC *"><Input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} /></Field>
                <Field label="Razón social *"><Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} /></Field>
              </div>
            )}
          </section>
        </div>

        {/* RESUMEN */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="card-surface p-6">
            <h2 className="mb-4 font-display text-xl font-semibold text-cream">Tu pedido</h2>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={`${i.productId}-${i.color}`} className="flex gap-3">
                  <img src={i.image} alt={i.name} className="h-14 w-14 rounded border border-border bg-white object-contain" />
                  <div className="flex-1 text-sm">
                    <p className="leading-tight text-cream">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.quantity} × {formatMxn(i.priceMxn)} {i.color ? `· ${i.color}` : ''}
                    </p>
                  </div>
                  <span className="text-sm text-cream">{formatMxn(i.priceMxn * i.quantity)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Envío */}
            <div className="mb-3 rounded-md border border-border bg-ink/40 p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-medium text-cream">
                <Truck className="h-4 w-4 text-gold" /> Envío
              </p>
              {customer.postalCode.replace(/\D/g, '').length !== 5 ? (
                <p className="text-xs text-muted-foreground">Escribe tu código postal para cotizar el envío.</p>
              ) : quoting ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cotizando...
                </p>
              ) : quote ? (
                quote.needsManualQuote ? (
                  <p className="text-xs text-amber-300">{quote.message || 'Requiere cotización manual.'}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {quote.zoneName} · {quote.billableWeightKg} kg facturables · entrega {quote.etaMinDays}–{quote.etaMaxDays} días
                  </p>
                )
              ) : (
                <p className="text-xs text-destructive">No pudimos cotizar este CP.</p>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMxn(sub)} />
              {needsInvoice && <Row label="IVA (16%)" value={formatMxn(iva)} />}
              <Row
                label="Envío"
                value={quote && !quote.needsManualQuote && quote.costMxn !== null ? formatMxn(shipping) : '—'}
              />
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cream">Total</span>
                <span className="font-display text-2xl font-bold text-gold-gradient">{formatMxn(total)}</span>
              </div>
            </dl>

            <Button className="mt-5 w-full" size="lg" disabled={!canPay || submitting} onClick={handlePay}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Pagar ahora'}
            </Button>

            {quote?.needsManualQuote && (
              <a
                href={`https://wa.me/${(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-md border border-[#25D366]/50 py-2.5 text-sm text-[#25D366] hover:bg-[#25D366]/10"
              >
                <MessageCircle className="h-4 w-4" /> Cotizar envío por WhatsApp
              </a>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">Pago seguro con Mercado Pago.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-cream">{value}</span>
    </div>
  );
}
