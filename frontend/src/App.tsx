import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartSheet } from '@/components/CartSheet';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import Checkout from '@/pages/Checkout';
import Confirmation from '@/pages/Confirmation';
import Admin from '@/pages/Admin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.includes('#')) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function StoreLayout() {
  return (
    <div className="grain flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/producto/:slug" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:orderNumber" element={<Confirmation />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        <p className="font-display text-6xl font-bold text-gold-gradient">404</p>
        <p className="mt-2 text-muted-foreground">Página no encontrada.</p>
        <a href="/" className="btn-gold mt-6 inline-block rounded-md px-6 py-2.5 text-sm">Ir al inicio</a>
      </div>
    </div>
  );
}
