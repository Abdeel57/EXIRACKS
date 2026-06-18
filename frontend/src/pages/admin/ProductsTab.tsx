import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Pencil, Trash2, Minus, Star, Tags, X } from 'lucide-react';
import type { AdminProduct, AdminCategory } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatMxn } from '@/lib/money';
import { useAdmin, apiError } from './shared';
import ProductForm from './ProductForm';

export default function ProductsTab() {
  const { token, logout } = useAdmin();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .products(token, { search: search || undefined, category: category || undefined, status: status || undefined })
      .then(setProducts)
      .catch((e) => toast.error(apiError(e, logout)))
      .finally(() => setLoading(false));
  }, [token, search, category, status, logout]);

  const loadCats = useCallback(() => {
    adminApi.categories(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);
  useEffect(loadCats, [loadCats]);

  function onSaved(p: AdminProduct) {
    setProducts((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
    });
    loadCats();
  }

  async function adjustStock(p: AdminProduct, delta: number) {
    try {
      const updated = await adminApi.setStock(token, p.id, { delta });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  async function toggle(p: AdminProduct, field: 'active' | 'featured', value: boolean) {
    try {
      const updated = await adminApi.updateProduct(token, p.id, { [field]: value });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  async function remove(p: AdminProduct) {
    const msg = p.soldCount > 0
      ? `"${p.name}" tiene ventas registradas, por lo que se desactivará (no se borra para conservar el historial). ¿Continuar?`
      : `¿Eliminar "${p.name}" definitivamente?`;
    if (!confirm(msg)) return;
    try {
      const r = await adminApi.deleteProduct(token, p.id);
      if (r.softDeleted && r.product) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? r.product! : x)));
        toast.success('Producto desactivado');
      } else {
        setProducts((prev) => prev.filter((x) => x.id !== p.id));
        toast.success('Producto eliminado');
      }
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: AdminProduct) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o SKU…" className="pl-9" />
        </div>
        <Button onClick={openNew} className="sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-40">
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotados</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
          <Tags className="mr-1 h-4 w-4" /> Categorías
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{products.length} productos</span>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No hay productos con estos filtros.</p>
      ) : (
        <div className="space-y-2.5">
          {products.map((p) => (
            <div key={p.id} className={`card-surface flex flex-wrap items-center gap-3 p-3 ${!p.active ? 'opacity-60' : ''}`}>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-white/95">
                {p.images[0] ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <div className="grid h-full place-items-center text-[9px] text-muted-foreground">sin foto</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-cream">{p.name}</p>
                  {p.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.category?.name ?? 'Sin categoría'} · {formatMxn(p.priceMxn)}
                  {p.sku ? ` · ${p.sku}` : ''}
                </p>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustStock(p, -1)} disabled={p.stock <= 0} aria-label="Menos stock">
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className={`w-9 text-center text-sm font-semibold ${p.stock <= 0 ? 'text-destructive' : p.stock <= 3 ? 'text-amber-400' : 'text-cream'}`}>
                  {p.stock}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustStock(p, 1)} aria-label="Más stock">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5">
                  <Switch checked={p.active} onCheckedChange={(v) => toggle(p, 'active', v)} aria-label="Activo" />
                  <span className="text-[9px] uppercase text-muted-foreground">{p.active ? 'Activo' : 'Oculto'}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(p)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => remove(p)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductForm open={formOpen} onOpenChange={setFormOpen} product={editing} categories={categories} onSaved={onSaved} />
      <CategoriesDialog open={catOpen} onOpenChange={setCatOpen} categories={categories} onChange={() => { loadCats(); load(); }} />
    </div>
  );
}

function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: AdminCategory[];
  onChange: () => void;
}) {
  const { token, logout } = useAdmin();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await adminApi.createCategory(token, name.trim());
      setName('');
      onChange();
      toast.success('Categoría creada');
    } catch (e) {
      toast.error(apiError(e, logout));
    } finally {
      setBusy(false);
    }
  }

  async function rename(c: AdminCategory) {
    const next = prompt('Nuevo nombre de la categoría', c.name);
    if (!next || next === c.name) return;
    try {
      await adminApi.updateCategory(token, c.id, { name: next });
      onChange();
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  async function remove(c: AdminCategory) {
    if (c.productCount > 0) return toast.error('Tiene productos: muévelos antes de borrar');
    if (!confirm(`¿Borrar la categoría "${c.name}"?`)) return;
    try {
      await adminApi.deleteCategory(token, c.id);
      onChange();
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorías</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <span className="flex-1 text-sm text-cream">{c.name}</span>
              <Badge variant="muted">{c.productCount}</Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rename(c)} aria-label="Renombrar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => remove(c)} aria-label="Borrar">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <div className="flex w-full gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
            <Button onClick={add} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ProductsTab };
