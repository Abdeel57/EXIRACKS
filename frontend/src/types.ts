export interface Category {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  priceMxn: number;
  colors: string[];
  images: string[];
  stock: number;
  inStock: boolean;
  featured: boolean;
  category: { slug: string; name: string };
  dimensions: { lengthCm: number; widthCm: number; heightCm: number; weightKg: number };
}

export interface ShippingQuote {
  zoneCode: string;
  zoneName: string;
  billableWeightKg: number;
  realWeightKg: number;
  volumetricWeightKg: number;
  costMxn: number | null;
  etaMinDays: number;
  etaMaxDays: number;
  needsManualQuote: boolean;
  message?: string;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  street: string;
  extNumber: string;
  intNumber?: string;
  colonia: string;
  city: string;
  state: string;
  postalCode: string;
  references?: string;
}

export interface CreateOrderResponse {
  orderNumber: string;
  total: number;
  checkout: { mode: 'mercadopago' | 'demo' | 'error'; initPoint?: string; message?: string };
  waLink: string;
}

export interface OrderSummary {
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  paymentStatus: string | null;
  createdAt: string;
  items: { productName: string; color: string | null; quantity: number; unitPriceMxn: number; lineTotalMxn: number }[];
  subtotalMxn: number;
  ivaMxn: number;
  shippingMxn: number;
  totalMxn: number;
  zoneName: string;
  needsInvoice: boolean;
  customer: { name: string; city: string; state: string };
  waLink: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string | null;
  subtotalMxn: number;
  ivaMxn: number;
  totalMxn: number;
  shippingMxn: number;
  zoneName: string;
  needsInvoice: boolean;
  rfc: string | null;
  razonSocial: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  customer: { name: string; email: string; phone: string; address: string };
  items: { productName: string; color: string | null; quantity: number; lineTotalMxn: number }[];
}

export interface AdminStats {
  pending: number;
  paid: number;
  shipped: number;
  cancelled: number;
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  revenueMxn: number;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  order: number;
  productCount: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  shortDesc: string;
  description: string;
  priceMxn: number;
  colors: string[];
  images: string[];
  stock: number;
  inStock: boolean;
  active: boolean;
  featured: boolean;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  category: { id: string; slug: string; name: string } | null;
  categoryId: string;
  soldCount: number;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string | null;
  shortDesc?: string;
  description?: string;
  priceMxn: number;
  colors?: string[];
  images?: string[];
  stock?: number;
  active?: boolean;
  featured?: boolean;
  categoryId: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ReportData {
  revenueMxn: number;
  subtotalMxn: number;
  shippingMxn: number;
  ordersCount: number;
  paidOrders: number;
  avgOrderMxn: number;
  unitsSold: number;
  topProducts: { name: string; units: number; revenueMxn: number }[];
}
