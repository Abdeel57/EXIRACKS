import { MessageCircle } from 'lucide-react';

const NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || '526626548989').replace(/\D/g, '');

export function WhatsAppButton() {
  if (!NUMBER) return null;
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(
    '¡Hola Exiracks! Me interesa cotizar un producto.'
  )}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/40 transition-transform hover:scale-105"
      aria-label="Escríbenos por WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
