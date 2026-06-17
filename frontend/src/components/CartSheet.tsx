import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/store/cart';
import { formatMxn } from '@/lib/money';

export function CartSheet() {
  const { items, isOpen, close, setQty, remove, subtotal } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && close()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gold" /> Tu carrito
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-cream/20" />
            <p className="text-muted-foreground">Tu carrito está vacío.</p>
            <Button variant="outline" onClick={close}>
              Ver catálogo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.color}`} className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 shrink-0 rounded-md border border-border bg-white object-contain"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-medium leading-tight text-cream">{item.name}</p>
                      <button
                        onClick={() => remove(item.productId, item.color)}
                        className="text-cream/40 transition-colors hover:text-destructive"
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.color && <p className="text-xs capitalize text-muted-foreground">{item.color}</p>}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-md border border-border">
                        <button
                          className="grid h-7 w-7 place-items-center text-cream/70 hover:text-gold"
                          onClick={() => setQty(item.productId, item.color, item.quantity - 1)}
                          aria-label="Restar"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          className="grid h-7 w-7 place-items-center text-cream/70 hover:text-gold"
                          onClick={() => setQty(item.productId, item.color, item.quantity + 1)}
                          aria-label="Sumar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gold">
                        {formatMxn(item.priceMxn * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="mb-1 flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-cream">{formatMxn(subtotal())}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Envío e IVA (si pides factura) se calculan en el checkout.
              </p>
              <Separator className="mb-3" />
              <Button asChild className="w-full" size="lg" onClick={close}>
                <Link to="/checkout">Continuar al pago</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
