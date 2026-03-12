import { FaWhatsapp } from "react-icons/fa";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function WhatsAppButton() {
  const { data: store } = useStoreSettings();

  // Strip non-digit chars from the stored number; fall back to empty so the
  // button simply opens wa.me if the setting hasn't loaded yet.
  const phone = store?.whatsapp?.replace(/\D/g, '') || '';

  if (!phone) return null; // Don't render until we know the number

  return (
    <a
      href={`https://wa.me/${phone}?text=Hi%20PANDIYIN!%20I%20have%20a%20query.`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[110px] md:bottom-6 right-6 z-50 flex items-center justify-center 
                 w-16 h-16 rounded-full 
                 bg-[#25D366] text-white shadow-xl
                 hover:scale-110 transition-transform duration-300
                 animate-whatsappPop"
    >
      <FaWhatsapp className="text-3xl" />

      {/* Glow Ring Effect */}
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-30 animate-ping"></span>
    </a>
  );
}
