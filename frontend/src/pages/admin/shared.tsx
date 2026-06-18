import { createContext, useContext } from 'react';
import type { OrderStatus } from '@/types';

export interface AdminSession {
  token: string;
  email: string;
  name: string;
}

interface AdminCtx extends AdminSession {
  logout: () => void;
}

export const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin fuera de AdminContext');
  return ctx;
}

/** Maneja errores de API: si la sesión expiró, cierra sesión. Devuelve el mensaje. */
export function apiError(e: any, logout: () => void): string {
  if (e?.status === 401) {
    logout();
    return 'Sesión expirada';
  }
  return e?.message || 'Ocurrió un error';
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export const STATUS_VARIANT: Record<OrderStatus, 'default' | 'success' | 'muted' | 'soldout'> = {
  PENDING: 'default',
  PAID: 'success',
  SHIPPED: 'muted',
  CANCELLED: 'soldout',
};
