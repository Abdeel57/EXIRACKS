import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Truck, ChevronLeft, MessageCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { formatMxn } from '@/lib/money';
import type { ShippingQuote, CustomerInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const IVA_RATE = 0.16; // sólo display; el backend recalcula el total real
const WA = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

const emptyCustomer: CustomerInput = {
  name: '', email: '', phone: '', street: '', extNumber: '', intNumber: '',
  colonia: '', city: '', state: '', postalCode: '', references: '',
};

type Errors = Partial<Record<keyof CustomerInput | 'rfc' | 'razonSocial', string>>;

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const [customer, setCustomer] = useState<CustomerInput>(emptyCustomer);
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearErr = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const set = (k: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomer((c) => ({ ...c, [k]: e.target.value }));
    clearErr(k);
  };
  const setDigits = (k: keyof CustomerInput, maxLen: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomer((c) => ({ ...c, [k]: e.target.value.replace(/\D/g, '').slice(0, maxLen) }));
    clearErr(k);
  };

  const sub = subtotal();
  const iva = needsInvoice ? Math.round(sub * IVA_RATE) : 0;
  const shipping = quote && !quote.needsManualQuote && quote.costMxn !== null ? quote.costMxn : 0;
  const total = sub + iva + shipping;
  const cpReady = customer.postalCode.replace(/\D/g, '').length === 5;
  const shippingReady = Boolean(quote && !quote.needsManualQuote && quote.costMxn !== null);

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

  const validate = useMemo(
    () => (): Errors => {
      const e: Errors = {};
      if (!customer.name.trim()) e.name = 'Escribe tu nombre';
      if (!/^\S+@\S+\.\S+$/.test(customer.email)) e.email = 'Correo no válido';
      if (customer.phone.replace(/\D/g, '').length < 10) e.phone = '10 dígitos';
      if (!customer.street.trim()) e.street = 'Requerido';
      if (!customer.extNumber.trim()) e.extNumber = 'Requerido';
      if (!customer.colonia.trim()) e.colonia = 'Requerido';
      if (customer.postalCode.replace(/\D/g, '').length !== 5) e.postalCode = '5 dígitos';
      if (!customer.city.trim()) e.city = 'Requerido';
      if (!customer.state.trim()) e.state = 'Requerido';
      if (needsInvoice && !rfc.trim()) e.rfc = 'Requerido para factura';
      if (needsInvoice && !razonSocial.trim()) e.razonSocial = 'Requerido para factura';
      return e;
    },
    [customer, needsInvoice, rfc, razonSocial]
  );

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <p className="font-light text-muted-foreground">Tu carrito está vacío.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  async function handlePay() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = Object.keys(e)[0];
      const el = document.getElementById(first);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el?.focus(), 300);
      toast.error('Revisa los campos marcados en rojo.');
      return;
    }
    if (quoting || !cpReady) {
      toast.error('Espera un momento: estamos calculando tu envío.');
      return;
    }
    if (!shippingReady) {
      toast.error(quote?.message || 'Tu envío requiere cotización manual. Escríbenos por WhatsApp.');
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
        window.location.href = res.checkout.initPoint;
        return;
      }
      clear();
      toast.success(`Pedido ${res.orderNumber} creado`);
      navigate(`/pedido/${res.orderNumber}`);
    } catch (err: any) {
      if (err?.status === 409) toast.error(err.message || 'Tu envío requiere cotización manual.');
      else toast.error(err?.message || 'No pudimos crear el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-8 pb-28 lg:pb-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-light text-cream/60 transition-colors hover:text-gold">
        <ChevronLeft className="h-4 w-4" /> Seguir comprando
      </Link>
      <h1 className="mb-8 font-display text-4xl font-bold text-cream md:text-5xl">Finalizar compra</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* FORMULARIO */}
        <div className="space-y-6">
          <section className="card-surface p-6">
            <h2 className="mb-5 font-display text-xl font-semibold text-cream">Datos de contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="name" label="Nombre completo *" value={customer.name} onChange={set('name')} error={errors.name} autoComplete="name" />
              <TextField id="phone" label="Teléfono (WhatsApp) *" value={customer.phone} onChange={setDigits('phone', 10)} error={errors.phone} inputMode="numeric" placeholder="6620000000" autoComplete="tel" />
              <TextField id="email" label="Correo electrónico *" className="sm:col-span-2" type="email" value={customer.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="tucorreo@ejemplo.com" />
            </div>
          </section>

          <section className="card-surface p-6">
            <h2 className="mb-5 font-display text-xl font-semibold text-cream">Dirección de envío</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="street" label="Calle *" className="sm:col-span-2" value={customer.street} onChange={set('street')} error={errors.street} autoComplete="address-line1" />
              <TextField id="extNumber" label="No. exterior *" value={customer.extNumber} onChange={set('extNumber')} error={errors.extNumber} />
              <TextField id="intNumber" label="No. interior" value={customer.intNumber} onChange={set('intNumber')} />
              <TextField id="colonia" label="Colonia *" value={customer.colonia} onChange={set('colonia')} error={errors.colonia} />
              <TextField id="postalCode" label="Código postal *" value={customer.postalCode} onChange={setDigits('postalCode', 5)} error={errors.postalCode} inputMode="numeric" placeholder="83190" autoComplete="postal-code" />
              <TextField id="city" label="Ciudad *" value={customer.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
              <TextField id="state" label="Estado *" value={customer.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" />
              <TextField id="references" label="Referencias (opcional)" className="sm:col-span-2" value={customer.references} onChange={set('references')} placeholder="Entre calles, color de fachada…" />
            </div>
          </section>

          <section className="card-surface p-6">
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={needsInvoice} onCheckedChange={(v) => setNeedsInvoice(Boolean(v))} />
              <span className="text-sm text-cream">Necesito factura <span className="text-muted-foreground">(se agrega 16% de IVA)</span></span>
            </label>
            {needsInvoice && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField id="rfc" label="RFC *" value={rfc} onChange={(e) => { setRfc(e.target.value.toUpperCase()); clearErr('rfc'); }} error={errors.rfc} />
                <TextField id="razonSocial" label="Razón social *" value={razonSocial} onChange={(e) => { setRazonSocial(e.target.value); clearErr('razonSocial'); }} error={errors.razonSocial} />
              </div>
            )}
          </section>
        </div>

        {/* RESUMEN */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-surface p-6">
            <h2 className="mb-4 font-display text-xl font-semibold text-cream">Tu pedido</h2>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={`${i.productId}-${i.color}`} className="flex gap-3">
                  <img src={i.image} alt={i.name} className="h-14 w-14 shrink-0 rounded border border-border bg-white object-contain" />
                  <div className="flex-1 text-sm">
                    <p className="leading-tight text-cream">{i.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
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
              {!cpReady ? (
                <p className="text-xs text-muted-foreground">Escribe tu código postal para cotizar el envío.</p>
              ) : quoting ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando envío…
                </p>
              ) : quote ? (
                quote.needsManualQuote ? (
                  <p className="text-xs text-amber-300">{quote.message || 'Requiere cotización manual.'}</p>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="text-cream">{quote.zoneName}</span> · entrega {quote.etaMinDays}–{quote.etaMaxDays} días
                    </span>
                  </p>
                )
              ) : (
                <p className="text-xs text-destructive">No pudimos cotizar este CP. Revísalo o escríbenos.</p>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMxn(sub)} />
              {needsInvoice && <Row label="IVA (16%)" value={formatMxn(iva)} />}
              <Row label="Envío" value={shippingReady ? formatMxn(shipping) : '—'} />
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cream">Total</span>
                <span className="font-display text-2xl font-bold text-gold-gradient">{formatMxn(total)}</span>
              </div>
            </dl>

            <Button className="mt-5 hidden w-full lg:flex" size="lg" disabled={submitting} onClick={handlePay}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Pagar ahora'}
            </Button>

            {quote?.needsManualQuote && WA && (
              <a
                href={`https://wa.me/${WA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-md border border-[#25D366]/50 py-2.5 text-sm text-[#25D366] transition-colors hover:bg-[#25D366]/10"
              >
                <MessageCircle className="h-4 w-4" /> Cotizar envío por WhatsApp
              </a>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold/70" /> Pago seguro con Mercado Pago
            </p>
          </div>
        </aside>
      </div>

      {/* Barra de pago fija (móvil) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="container flex items-center gap-4 px-0">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="font-display text-xl font-bold text-gold-gradient">{formatMxn(total)}</p>
          </div>
          <Button size="lg" className="flex-1" disabled={submitting} onClick={handlePay}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Pagar ahora'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  error,
  className,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">{label}</Label>
      <Input
        id={id}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive/60')}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
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
