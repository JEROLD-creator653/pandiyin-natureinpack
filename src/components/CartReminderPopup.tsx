/**
 * Cart Reminder Popup Component
 * Shows when user logs in with items in their cart
 * Features:
 * - Professional, non-intrusive design
 * - Random message selection
 * - Quick action buttons
 * - Smooth animations
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getCartReminderMessage } from '@/lib/cartReminderMessages';

interface CartReminderPopupProps {
  cartCount: number;
  userName?: string;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartReminderPopup({
  cartCount,
  userName,
  onClose,
  onCheckout,
}: CartReminderPopupProps) {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Generate message only on mount
    const reminderMessage = getCartReminderMessage(cartCount, userName);
    setMessage(reminderMessage);
  }, [cartCount, userName]);

  const handleCheckout = () => {
    onCheckout();
    navigate('/checkout');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed top-20 right-4 z-50 w-[calc(100vw-2rem)] md:w-auto md:right-6 max-w-md"
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header with close button */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 px-6 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-primary/10 rounded-full p-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm">
                Cart Reminder
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message content */}
        <div className="px-6 py-4">
          <p className="text-foreground text-base leading-relaxed font-medium mb-4">
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Later
            </Button>
            <Button
              size="sm"
              onClick={handleCheckout}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Checkout
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="h-1 bg-gradient-to-r from-primary to-secondary opacity-20" />
      </div>

      {/* Optional backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 -z-10 bg-black/5"
      />
    </motion.div>
  );
}
