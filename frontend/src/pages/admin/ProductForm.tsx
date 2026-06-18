import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, X, Star, ImageOff, ChevronDown } from 'lucide-react';
import type { AdminProduct, AdminCategory, ProductInput } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAdmin, apiError } from './shared';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProduct | null;
  categories: AdminCategory[];
  onSaved: (p: AdminProduct) => void;
}

const blank = {
  name: '',
  sku: '',
  categoryId: '',
  priceMxn: '',
  stock: '0',
  shortDesc: '',
  description: '',
  colors: '',
  active: true,
  featured: false,
  weightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
};

export default function ProductForm({ open, onOpenChange, product, categories, onSaved }: Props) {
  const { token, logout } = useAdmin();
  const [f, setF] = useState({ ...blank });
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carga los valores al abrir.
  useEffect(() => {
    if (!open) return;
    if (product) {
      setF({
        name: product.name,
        sku: product.sku ?? '',
        categoryId: product.categoryId,
        priceMxn: String(product.priceMxn),
        stock: String(product.stock),
        shortDesc: product.shortDesc,
        description: product.description,
        colors: product.colors.join(', '),
        active: product.active,
        featured: product.featured,
        weightKg: product.weightKg ? String(product.weightKg) : '',
        lengthCm: product.lengthCm ? String(product.lengthCm) : '',
        widthCm: product.widthCm ? String(product.widthCm) : '',
        heightCm: product.heightCm ? String(product.heightCm) : '',
      });
      setImages(product.images);
    } else {
      setF({ ...blank, categoryId: categories[0]?.id ?? '' });
      setImages([]);
    }
    setImageUrl('');
    setShowShipping(false);
  }, [open, product, categories]);

  const set = (k: keyof typeof blank, v: any) => setF((p) => ({ ...p, [k]: v }));

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    if (!images.includes(url)) setImages((p) => [...p, url]);
    setImageUrl('');
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(token, file);
      setImages((p) => [...p, url]);
      toast.success('Imagen subida');
    } catch (err) {
      toast.error(apiError(err, logout));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((p) => p.filter((u) => u !== url));
  }
  function makePrimary(url: string) {
    setImages((p) => [url, ...p.filter((u) => u !== url)]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Falta el nombre');
    if (!f.categoryId) return toast.error('Elige una categoría');
    const price = Number(f.priceMxn);
    if (!Number.isFinite(price) || price < 0) return toast.error('Precio inválido');

    const body: ProductInput = {
      name: f.name.trim(),
      sku: f.sku.trim() || null,
      categoryId: f.categoryId,
      priceMxn: Math.round(price),
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      shortDesc: f.shortDesc.trim(),
      description: f.description.trim(),
      colors: f.colors.split(',').map((c) => c.trim()).filter(Boolean),
      images,
      active: f.active,
      featured: f.featured,
      weightKg: Number(f.weightKg) || 0,
      lengthCm: Math.round(Number(f.lengthCm) || 0),
      widthCm: Math.round(Number(f.widthCm) || 0),
      heightCm: Math.round(Number(f.heightCm) || 0),
    };

    setSaving(true);
    try {
      const saved = product
        ? await adminApi.updateProduct(token, product.id, body)
        : await adminApi.createProduct(token, body);
      toast.success(product ? 'Producto actualizado' : 'Producto creado');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, logout));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>{product ? product.slug : 'Completa los datos del producto'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Imágenes */}
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wide text-gold/70">Imágenes</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border bg-white/95">
                    <img src={url} alt="" className="h-full w-full object-contain p-1" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
                    {i === 0 && (
                      <span className="absolute left-0 top-0 rounded-br bg-gold px-1 text-[9px] font-semibold text-ink">Principal</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/80 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {i !== 0 && (
                        <button type="button" onClick={() => makePrimary(url)} title="Hacer principal" className="text-gold">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(url)} title="Quitar" className="ml-auto text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="grid h-20 w-20 place-items-center rounded-md border border-dashed border-gold/40 text-gold/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                </button>
                {images.length === 0 && !uploading && (
                  <div className="grid h-20 flex-1 place-items-center rounded-md border border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ImageOff className="h-4 w-4" /> Sin imágenes</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <div className="mt-2 flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                  placeholder="…o pega una URL / ruta (/products/foo.png)"
                  className="h-9"
                />
                <Button type="button" variant="outline" size="sm" onClick={addImageUrl}>Agregar</Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Nombre</Label>
                <Input value={f.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Categoría</Label>
                <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="" disabled>Elige…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">SKU (opcional)</Label>
                <Input value={f.sku} onChange={(e) => set('sku', e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Precio (MXN, sin IVA)</Label>
                <Input type="number" inputMode="numeric" min={0} value={f.priceMxn} onChange={(e) => set('priceMxn', e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Stock</Label>
                <Input type="number" inputMode="numeric" min={0} value={f.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Descripción corta</Label>
                <Input value={f.shortDesc} onChange={(e) => set('shortDesc', e.target.value)} placeholder="Medidas o detalle breve" />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Descripción</Label>
                <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Colores (separados por coma)</Label>
                <Input value={f.colors} onChange={(e) => set('colors', e.target.value)} placeholder="Oro, Negro, Blanco" />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2.5">
                <Switch checked={f.active} onCheckedChange={(v) => set('active', v)} aria-label="Activo" />
                <span className="text-sm text-cream">Activo (visible en la tienda)</span>
              </label>
              <label className="flex items-center gap-2.5">
                <Switch checked={f.featured} onCheckedChange={(v) => set('featured', v)} aria-label="Destacado" />
                <span className="text-sm text-cream">Destacado</span>
              </label>
            </div>

            {/* Datos de envío (colapsable) */}
            <div className="rounded-md border border-border">
              <button
                type="button"
                onClick={() => setShowShipping((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-cream"
              >
                <span>Datos de envío (peso y medidas)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showShipping ? 'rotate-180' : ''}`} />
              </button>
              {showShipping && (
                <div className="grid grid-cols-2 gap-3 border-t border-border p-3 sm:grid-cols-4">
                  <div>
                    <Label className="mb-1 block text-xs">Peso (kg)</Label>
                    <Input type="number" inputMode="decimal" step="0.1" min={0} value={f.weightKg} onChange={(e) => set('weightKg', e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Largo (cm)</Label>
                    <Input type="number" inputMode="numeric" min={0} value={f.lengthCm} onChange={(e) => set('lengthCm', e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Ancho (cm)</Label>
                    <Input type="number" inputMode="numeric" min={0} value={f.widthCm} onChange={(e) => set('widthCm', e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Alto (cm)</Label>
                    <Input type="number" inputMode="numeric" min={0} value={f.heightCm} onChange={(e) => set('heightCm', e.target.value)} className="h-9" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : product ? 'Guardar' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
