import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, KeyRound, UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import type { AdminUser } from '@/types';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdmin, apiError } from './shared';

export default function AccountTab() {
  const { token, email, name, logout } = useAdmin();

  return (
    <div className="space-y-6">
      <div className="card-surface p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-cream">{name || 'Administrador'}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      <ChangePassword token={token} logout={logout} />
      <AdminUsers token={token} logout={logout} myEmail={email} />
    </div>
  );
}

function ChangePassword({ token, logout }: { token: string; logout: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return toast.error('La nueva contraseña debe tener 6+ caracteres');
    if (next !== confirm) return toast.error('Las contraseñas no coinciden');
    setBusy(true);
    try {
      await adminApi.changePassword(token, current, next);
      toast.success('Contraseña actualizada');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      toast.error(apiError(e, logout));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card-surface space-y-3 p-4">
      <p className="flex items-center gap-2 font-medium text-cream">
        <KeyRound className="h-4 w-4 text-gold" /> Cambiar contraseña
      </p>
      <div>
        <Label className="mb-1 block text-xs">Contraseña actual</Label>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs">Nueva contraseña</Label>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Confirmar</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Actualizar contraseña'}
      </Button>
    </form>
  );
}

function AdminUsers({ token, logout, myEmail }: { token: string; logout: () => void; myEmail: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .users(token)
      .then(setUsers)
      .catch((e) => toast.error(apiError(e, logout)))
      .finally(() => setLoading(false));
  }, [token, logout]);

  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('La contraseña debe tener 6+ caracteres');
    setBusy(true);
    try {
      const u = await adminApi.createUser(token, { email, name: name || undefined, password });
      setUsers((p) => [...p, u]);
      setEmail('');
      setName('');
      setPassword('');
      setShowForm(false);
      toast.success('Administrador creado');
    } catch (e) {
      toast.error(apiError(e, logout));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: AdminUser, active: boolean) {
    try {
      const updated = await adminApi.updateUser(token, u.id, { active });
      setUsers((p) => p.map((x) => (x.id === u.id ? updated : x)));
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`¿Eliminar al administrador ${u.email}?`)) return;
    try {
      await adminApi.deleteUser(token, u.id);
      setUsers((p) => p.filter((x) => x.id !== u.id));
      toast.success('Administrador eliminado');
    } catch (e) {
      toast.error(apiError(e, logout));
    }
  }

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 font-medium text-cream">
          <ShieldCheck className="h-4 w-4 text-gold" /> Administradores
        </p>
        <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
          <UserPlus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-4 space-y-3 rounded-md border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">Correo</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Nombre (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear administrador'}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isMe = u.email === myEmail;
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cream">
                    {u.name || u.email}
                    {isMe && <span className="ml-1 text-xs text-gold">(tú)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                    {u.lastLoginAt ? ` · último acceso ${new Date(u.lastLoginAt).toLocaleDateString('es-MX')}` : ''}
                  </p>
                </div>
                {u.active ? <Badge variant="success">Activo</Badge> : <Badge variant="soldout">Inactivo</Badge>}
                <Switch checked={u.active} onCheckedChange={(v) => toggleActive(u, v)} disabled={isMe} aria-label="Activo" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => remove(u)}
                  disabled={isMe}
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
