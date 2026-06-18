import { useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LogOut, ShoppingBag, Boxes, Warehouse, BarChart3, Settings } from 'lucide-react';
import type { AdminStats } from '@/types';
import { api, adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMxn } from '@/lib/money';
import { AdminContext, type AdminSession } from './admin/shared';
import OrdersTab from './admin/OrdersTab';
import ProductsTab from './admin/ProductsTab';
import InventoryTab from './admin/InventoryTab';
import ReportsTab from './admin/ReportsTab';
import AccountTab from './admin/AccountTab';

const STORAGE_KEY = 'exiracks-admin-session';

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migración del esquema viejo (solo token).
    const legacy = localStorage.getItem('exiracks-admin-token');
    if (legacy) return { token: legacy, email: '', name: '' };
  } catch {
    /* ignore */
  }
  return null;
}

export default function Admin() {
  const [session, setSession] = useState<AdminSession | null>(readSession);

  function login(s: AdminSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.removeItem('exiracks-admin-token');
    setSession(s);
  }
  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('exiracks-admin-token');
    setSession(null);
  }

  if (!session) return <Login onLogin={login} />;
  return (
    <AdminContext.Provider value={{ ...session, logout }}>
      <Dashboard />
    </AdminContext.Provider>
  );
}

function Login({ onLogin }: { onLogin: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onLogin({ token: res.token, email: res.email, name: res.name });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container grid min-h-screen place-items-center py-12">
      <form onSubmit={submit} className="card-surface w-full max-w-sm p-8">
        <img src="/brand/logo.png" alt="Exiracks" className="mx-auto h-14" />
        <h1 className="mt-4 text-center font-display text-2xl font-bold text-cream">Panel de administración</h1>
        <p className="mb-6 text-center text-xs text-muted-foreground">Acceso restringido</p>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <Label className="mb-1.5 block">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}

const TABS = [
  { key: 'orders', label: 'Pedidos', icon: ShoppingBag, Comp: OrdersTab },
  { key: 'products', label: 'Productos', icon: Boxes, Comp: ProductsTab },
  { key: 'inventory', label: 'Inventario', icon: Warehouse, Comp: InventoryTab },
  { key: 'reports', label: 'Reportes', icon: BarChart3, Comp: ReportsTab },
  { key: 'account', label: 'Cuenta', icon: Settings, Comp: AccountTab },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function Dashboard() {
  const [tab, setTab] = useState<TabKey>('orders');
  const Active = useMemo(() => TABS.find((t) => t.key === tab)!.Comp, [tab]);

  return (
    <div className="min-h-screen bg-ink pb-20 sm:pb-0">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b border-border bg-ink/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/brand/logo.png" alt="Exiracks" className="h-8" />
            <span className="font-display text-lg font-bold text-cream">Admin</span>
          </div>
          <StatsStrip />
          <LogoutButton />
        </div>

        {/* Pestañas (escritorio) */}
        <div className="container hidden gap-1 sm:flex">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? 'border-gold text-gold' : 'border-transparent text-muted-foreground hover:text-cream'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="container py-5">
        <Active />
      </main>

      {/* Navegación inferior (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-ink/95 backdrop-blur sm:hidden">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
              tab === key ? 'text-gold' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function LogoutButton() {
  return (
    <AdminContext.Consumer>
      {(ctx) => (
        <Button variant="ghost" size="sm" onClick={() => ctx?.logout()} title="Salir">
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Salir</span>
        </Button>
      )}
    </AdminContext.Consumer>
  );
}

function StatsStrip() {
  const ctx = useContext(AdminContext);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!ctx) return;
    adminApi.stats(ctx.token).then(setStats).catch(() => {});
  }, [ctx]);

  if (!stats) return <div className="flex-1" />;

  return (
    <div className="flex flex-1 items-center justify-end gap-3 overflow-x-auto text-xs sm:gap-5">
      <Chip label="Pendientes" value={String(stats.pending)} tone={stats.pending > 0 ? 'gold' : 'muted'} />
      <Chip label="Ingresos" value={formatMxn(stats.revenueMxn)} tone="muted" />
      <Chip label="Por reabastecer" value={String(stats.lowStock + stats.outOfStock)} tone={stats.outOfStock > 0 ? 'danger' : 'muted'} />
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: 'gold' | 'muted' | 'danger' }) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'danger' ? 'text-destructive' : 'text-cream';
  return (
    <div className="hidden whitespace-nowrap text-right lg:block">
      <p className={`font-display text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
