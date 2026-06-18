import type {
  Category,
  Product,
  ShippingQuote,
  CustomerInput,
  CreateOrderResponse,
  OrderSummary,
  AdminOrder,
  AdminStats,
  AdminCategory,
  AdminProduct,
  ProductInput,
  AdminUser,
  ReportData,
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
    http<{ token: string; email: string; name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

/** Helpers autenticados para el panel. */
function auth(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const adminApi = {
  // ── Tablero ──
  stats: (token: string) => http<AdminStats>('/admin/stats', auth(token)),

  // ── Pedidos ──
  orders: (token: string, params: { status?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return http<AdminOrder[]>(`/admin/orders${qs ? `?${qs}` : ''}`, auth(token));
  },
  updateOrder: (
    token: string,
    id: string,
    body: { status?: string; trackingCarrier?: string; trackingNumber?: string }
  ) =>
    http<AdminOrder>(`/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  exportOrders: async (token: string, status?: string) => {
    const res = await fetch(`${BASE}/admin/orders/export${status ? `?status=${status}` : ''}`, auth(token));
    if (!res.ok) throw new Error('No se pudo exportar');
    return res.blob();
  },

  // ── Categorías ──
  categories: (token: string) => http<AdminCategory[]>('/admin/categories', auth(token)),
  createCategory: (token: string, name: string) =>
    http<AdminCategory>('/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    }),
  updateCategory: (token: string, id: string, body: { name?: string; order?: number }) =>
    http<AdminCategory>(`/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  deleteCategory: (token: string, id: string) =>
    http<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE', ...auth(token) }),

  // ── Productos ──
  products: (token: string, params: { search?: string; category?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.category) q.set('category', params.category);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return http<AdminProduct[]>(`/admin/products${qs ? `?${qs}` : ''}`, auth(token));
  },
  createProduct: (token: string, body: ProductInput) =>
    http<AdminProduct>('/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  updateProduct: (token: string, id: string, body: Partial<ProductInput>) =>
    http<AdminProduct>(`/admin/products/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  setStock: (token: string, id: string, body: { delta?: number; set?: number }) =>
    http<AdminProduct>(`/admin/products/${id}/stock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  deleteProduct: (token: string, id: string) =>
    http<{ ok: boolean; softDeleted: boolean; product?: AdminProduct }>(`/admin/products/${id}`, {
      method: 'DELETE',
      ...auth(token),
    }),
  uploadImage: async (token: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || 'No se pudo subir la imagen');
    return data as { id: string; url: string };
  },

  // ── Reportes ──
  reports: (token: string, params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return http<ReportData>(`/admin/reports${qs ? `?${qs}` : ''}`, auth(token));
  },

  // ── Administradores ──
  users: (token: string) => http<AdminUser[]>('/admin/users', auth(token)),
  createUser: (token: string, body: { email: string; name?: string; password: string }) =>
    http<AdminUser>('/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  updateUser: (token: string, id: string, body: { active?: boolean; name?: string }) =>
    http<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  deleteUser: (token: string, id: string) =>
    http<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE', ...auth(token) }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    http<{ ok: boolean }>('/admin/account/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
