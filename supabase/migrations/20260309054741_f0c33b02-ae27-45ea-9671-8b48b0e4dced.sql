
-- Payment event logs for fraud detection and debugging
CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  event_type text NOT NULL, -- 'order_created', 'payment_success', 'payment_failed', 'signature_verified', 'signature_failed', 'webhook_received'
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric,
  currency text DEFAULT 'INR',
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins can read logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment logs"
  ON public.payment_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert payment logs"
  ON public.payment_logs FOR INSERT
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_payment_logs_order_id ON public.payment_logs(order_id);
CREATE INDEX idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX idx_payment_logs_created_at ON public.payment_logs(created_at);
