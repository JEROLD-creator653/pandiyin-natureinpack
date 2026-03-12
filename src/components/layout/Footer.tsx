import { Link } from "react-router-dom";
import { Leaf, Mail, Phone, Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function Footer() {
  const { data: store, isLoading: loadingStore } = useStoreSettings();
  const whatsappNumber = store?.whatsapp?.replace(/\D/g, '') || '';
  const phoneNumber = store?.phone?.replace(/\D/g, '') || '';
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);
  return (
    <footer id="footer" className="bg-foreground text-primary-foreground pt-12 pb-6">
      <div className="container mx-auto px-4">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-y-10 md:gap-x-16 mb-10">

          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6" />
              <h2 className="text-xl font-display font-bold tracking-wide">
                PANDIYIN
              </h2>
            </div>

            <p className="text-sm opacity-80 leading-relaxed">
              Nature In Every Pack. Authentic homemade foods from the heart of Madurai,
              crafted with love and tradition.
            </p>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Address</h3>
              <p className="text-sm opacity-80 leading-relaxed whitespace-pre-line">
                {loadingStore ? '...' : (store?.address || 'Madurai, Tamil Nadu, India')}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Quick Links</h4>

            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link
                to="/"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Home
              </Link>

              <Link
                to="/products"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                All Products
              </Link>

              <Link
                to="/about"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                About Us
              </Link>

              <Link
                to="/dashboard"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                My Orders
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Categories</h4>

            <div className="flex flex-col gap-2 text-sm opacity-80">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="inline-block w-fit hover:opacity-100 transition-opacity"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Policies</h4>

            <div className="flex flex-col gap-2 text-sm opacity-80">
              <Link
                to="/privacy-policy"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Privacy Policy
              </Link>

              <Link
                to="/terms"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Terms of Service
              </Link>

              <Link
                to="/return-refund"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Return & Refund
              </Link>

              <Link
                to="/shipping-policy"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Shipping Policy
              </Link>

              <Link
                to="/cancellation-policy"
                className="inline-block w-fit hover:opacity-100 transition-opacity"
              >
                Cancellation Policy
              </Link>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Contact Us</h4>

            <p className="text-sm opacity-80 leading-relaxed">
              Need help with your order? Reach us anytime.
            </p>

            {/* Social Icons */}
            <div className="flex items-center justify-between w-full max-w-[240px]">

              {/* Instagram */}
              <a
                href="https://instagram.com/pandiyin_nature_in_pack"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="h-12 w-12 rounded-full border border-primary-foreground/50 flex items-center justify-center 
                           hover:bg-primary-foreground hover:text-foreground hover:scale-110 
                           transition-all duration-300"
              >
                <Instagram className="h-5 w-5" />
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="h-12 w-12 rounded-full border border-primary-foreground/50 flex items-center justify-center 
                           hover:bg-primary-foreground hover:text-foreground hover:scale-110 
                           transition-all duration-300"
              >
                <FaWhatsapp className="h-6 w-6" />
              </a>

              {/* Phone */}
              <a
                href={`tel:+${phoneNumber}`}
                aria-label="Phone"
                className="h-12 w-12 rounded-full border border-primary-foreground/50 flex items-center justify-center 
                           hover:bg-primary-foreground hover:text-foreground hover:scale-110 
                           transition-all duration-300"
              >
                <Phone className="h-5 w-5" />
              </a>

              {/* Mail */}
              <a
                href={loadingStore ? '#' : `mailto:${store?.email || 'pandiyinnatureinpack@gmail.com'}`}
                aria-label="Email"
                className="h-12 w-12 rounded-full border border-primary-foreground/50 flex items-center justify-center 
                           hover:bg-primary-foreground hover:text-foreground hover:scale-110 
                           transition-all duration-300"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="border-t border-primary-foreground/20 pt-6 text-center text-sm opacity-60">
          © {new Date().getFullYear()} PANDIYIN Nature In Every Pack. All rights reserved.
        </div>

      </div>
    </footer>
  );
}
