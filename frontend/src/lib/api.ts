import type {
  Category,
  Product,
  ShippingQuote,
  CustomerInput,
  CreateOrderResponse,
  OrderSummary,
  AdminOrder,
} from '@/types';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.message || (data as any)?.error || 'Error de red') as Error & {
      status?: number;
      payload?: unknown;
    };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export interface CartLineInput {
  productId: string;
  quantity: number;
  color?: string | null;
}

export const api = {
  getCategories: () => http<Category[]>('/categories'),
  getProducts: (params: { category?: string; search?: string; featured?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    if (params.featured) q.set('featured', 'true');
    const qs = q.toString();
    return http<Product[]>(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug: string) => http<Product>(`/products/${slug}`),

  quoteShipping: (postalCode: string, items: { productId: string; quantity: number }[]) =>
    http<ShippingQuote>('/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({ postalCode, items }),
    }),

  createOrder: (body: {
    customer: CustomerInput;
    items: CartLineInput[];
    needsInvoice: boolean;
    rfc?: string;
    razonSocial?: string;
  }) => http<CreateOrderResponse>('/orders', { method: 'POST', body: JSON.stringify(body) }),

  getOrder: (orderNumber: string) => http<OrderSummary>(`/orders/${orderNumber}`),

  demoConfirm: (orderNumber: string) =>
    http<{ ok: boolean }>(`/payments/demo-confirm/${orderNumber}`, { method: 'POST' }),

  // Admin
  login: (email: string, password: string) =>
    http<{ token: string; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminOrders: (token: string, status?: string) =>
    http<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminStats: (token: string) =>
    http<{ pending: number; paid: number; shipped: number; cancelled: number }>('/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminUpdateOrder: (
    token: string,
    id: string,
    body: { status?: string; trackingCarrier?: string; trackingNumber?: string }
  ) =>
    http<{ ok: boolean }>(`/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
};
