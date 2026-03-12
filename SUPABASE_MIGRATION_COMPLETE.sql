-- =====================================================
-- PANDIYIN NATURE IN PACK - COMPLETE DATABASE MIGRATION
-- =====================================================
-- Run this SQL in your NEW Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste & Run)
-- =====================================================

-- ================================
-- STEP 1: ENUMS
-- ================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('stripe', 'cod');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ================================
-- STEP 2: CORE TABLES
-- ================================

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products (with all columns including GST, weight, reviews)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(10,2) DEFAULT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT DEFAULT '',
  image_path TEXT DEFAULT '',
  images TEXT[] DEFAULT '{}',
  stock_quantity INT NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  weight TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5,2) DEFAULT 5,
  hsn_code TEXT DEFAULT '',
  tax_inclusive BOOLEAN DEFAULT true,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at_updated BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Addresses (with all columns including geo, flat number, country)
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT DEFAULT '',
  area TEXT,
  district TEXT,
  city TEXT NOT NULL DEFAULT 'Madurai',
  state TEXT NOT NULL DEFAULT 'Tamil Nadu',
  pincode TEXT NOT NULL DEFAULT '',
  country TEXT DEFAULT 'India',
  "flatNumber" TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  display_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Orders (with all GST, tracking, payment columns)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL DEFAULT 'cod',
  payment_mode TEXT DEFAULT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_id TEXT DEFAULT '',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  gst_percentage NUMERIC(5,2) DEFAULT 0,
  gst_type TEXT DEFAULT 'cgst_sgst' CHECK (gst_type IN ('cgst_sgst', 'igst')),
  cgst_amount NUMERIC(10,2) DEFAULT 0,
  sgst_amount NUMERIC(10,2) DEFAULT 0,
  igst_amount NUMERIC(10,2) DEFAULT 0,
  delivery_state TEXT DEFAULT '',
  coupon_code TEXT DEFAULT '',
  delivery_address JSONB DEFAULT '{}',
  notes TEXT DEFAULT '',
  invoice_generated BOOLEAN DEFAULT false,
  invoice_number TEXT DEFAULT NULL,
  invoice_path TEXT DEFAULT NULL,
  cart_hash TEXT DEFAULT NULL,
  tracking_id TEXT DEFAULT '',
  courier_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order Items (with GST fields)
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5,2) DEFAULT 0,
  hsn_code TEXT DEFAULT '',
  gst_amount NUMERIC(10,2) DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT true,
  product_base_price NUMERIC(10,2) DEFAULT 0,
  product_gst_percentage NUMERIC(5,2) DEFAULT NULL,
  cgst_amount NUMERIC(10,2) DEFAULT NULL,
  sgst_amount NUMERIC(10,2) DEFAULT NULL,
  igst_amount NUMERIC(10,2) DEFAULT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Cart Items
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses INT DEFAULT NULL,
  max_uses_per_user INT DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_valid_dates CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
  CONSTRAINT check_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT check_max_uses_per_user_positive CHECK (max_uses_per_user IS NULL OR max_uses_per_user > 0)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Coupon Redemptions
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id, order_id)
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_path TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Delivery Settings
CREATE TABLE public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_delivery_above NUMERIC(10,2) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- Store Settings (with GST fields)
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'PANDIYIN Nature In Pack',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gst_enabled BOOLEAN NOT NULL DEFAULT false,
  gst_number TEXT DEFAULT '',
  gst_percentage NUMERIC NOT NULL DEFAULT 18,
  gst_inclusive BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Shipping Regions
CREATE TABLE public.shipping_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_name TEXT NOT NULL,
  region_key TEXT NOT NULL UNIQUE,
  states TEXT[] NOT NULL DEFAULT '{}',
  base_charge NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC NOT NULL DEFAULT 0,
  free_delivery_above NUMERIC,
  gst_type TEXT DEFAULT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_regions ENABLE ROW LEVEL SECURITY;

-- Product Reviews (simplified)
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  description TEXT NOT NULL,
  user_name VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id),
  CONSTRAINT product_reviews_description_length_check CHECK (char_length(description) >= 20)
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- GST Settings
CREATE TABLE public.gst_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_enabled BOOLEAN DEFAULT false,
  gst_number TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  business_address TEXT DEFAULT '',
  state TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'PNP',
  invoice_counter INT DEFAULT 0,
  supported_gst_rates NUMERIC[] DEFAULT ARRAY[0, 5, 12, 18, 28],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL DEFAULT '',
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  business_name TEXT NOT NULL,
  business_address TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_gst_number TEXT DEFAULT NULL,
  gst_type TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL,
  cgst_amount NUMERIC(10,2) DEFAULT NULL,
  sgst_amount NUMERIC(10,2) DEFAULT NULL,
  igst_amount NUMERIC(10,2) DEFAULT NULL,
  total_tax NUMERIC(10,2) NOT NULL,
  delivery_charge NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  invoice_pdf_path TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Payment Logs
CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  event_type text NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric,
  currency text DEFAULT 'INR',
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 3: INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_banners_user_id ON public.banners(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_banners_image_path ON public.banners(image_path);
CREATE INDEX IF NOT EXISTS idx_products_image_path ON public.products(image_path);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_name ON public.product_reviews(user_name);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order_id ON public.coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON public.payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at);

-- ================================
-- STEP 4: FUNCTIONS
-- ================================

-- has_role function (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- handle_new_user (auto profile + role on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'PNP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- decrement_stock_on_order
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id AND stock_quantity >= NEW.quantity;
  
  IF NOT FOUND AND NEW.product_id IS NOT NULL THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- update_product_rating_stats
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  product_uuid UUID;
  avg_rating NUMERIC;
  total_reviews INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    product_uuid := OLD.product_id;
  ELSE
    product_uuid := NEW.product_id;
  END IF;

  SELECT 
    COALESCE(AVG(rating), 0)::NUMERIC(3,2),
    COUNT(*)::INT
  INTO avg_rating, total_reviews
  FROM public.product_reviews
  WHERE product_id = product_uuid;

  UPDATE public.products
  SET 
    average_rating = avg_rating,
    review_count = total_reviews
  WHERE id = product_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- validate_coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _coupon_code TEXT,
  _user_id UUID,
  _order_total NUMERIC
)
RETURNS TABLE(
  is_valid BOOLEAN,
  error_message TEXT,
  discount_value NUMERIC,
  discount_type TEXT,
  coupon_id UUID
) 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_redemptions INT;
  v_total_redemptions INT;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(_coupon_code)
  LIMIT 1;

  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid coupon code'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT false, 'This coupon is no longer active'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, 'This coupon is not yet valid'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, 'This coupon has expired'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_coupon.min_order_value IS NOT NULL AND _order_total < v_coupon.min_order_value THEN
    RETURN QUERY SELECT false, 
      format('Minimum order amount is %s', v_coupon.min_order_value)::TEXT, 
      0::NUMERIC, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL THEN
    SELECT COALESCE(v_coupon.current_uses, 0) INTO v_total_redemptions;
    IF v_total_redemptions >= v_coupon.max_uses THEN
      RETURN QUERY SELECT false, 'This coupon has reached its usage limit'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_redemptions
    FROM public.coupon_redemptions cr
    WHERE cr.coupon_id = v_coupon.id AND cr.user_id = _user_id;
    
    IF v_user_redemptions >= v_coupon.max_uses_per_user THEN
      RETURN QUERY SELECT false, 'You have already used this coupon'::TEXT, 0::NUMERIC, ''::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT 
    true, 
    'Coupon is valid'::TEXT, 
    v_coupon.discount_value::NUMERIC,
    v_coupon.discount_type::TEXT,
    v_coupon.id;
END;
$$;

-- redeem_coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  _coupon_code TEXT,
  _user_id UUID,
  _order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  SELECT id INTO v_coupon_id
  FROM public.coupons
  WHERE code = UPPER(_coupon_code) AND is_active = true
  LIMIT 1;

  IF v_coupon_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id)
  VALUES (v_coupon_id, _user_id, _order_id)
  ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING;

  UPDATE public.coupons
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = v_coupon_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- redeem_coupon_atomic (prevents race conditions)
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(
  _coupon_code text,
  _user_id uuid,
  _order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_coupon RECORD;
  v_user_redemptions INT;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(_coupon_code) AND is_active = true
  FOR UPDATE;

  IF v_coupon IS NULL THEN
    RETURN false;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses THEN
    RETURN false;
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_redemptions
    FROM public.coupon_redemptions cr
    WHERE cr.coupon_id = v_coupon.id AND cr.user_id = _user_id;
    
    IF v_user_redemptions >= v_coupon.max_uses_per_user THEN
      RETURN false;
    END IF;
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RETURN false;
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN false;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id)
  VALUES (v_coupon.id, _user_id, _order_id)
  ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING;

  UPDATE public.coupons
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = v_coupon.id;

  RETURN true;
END;
$$;

-- check_coupon_usage trigger function
CREATE OR REPLACE FUNCTION public.check_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.max_uses IS NOT NULL AND NEW.current_uses > NEW.max_uses THEN
    RAISE EXCEPTION 'Coupon usage limit exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- validate_order_fields trigger function
CREATE OR REPLACE FUNCTION public.validate_order_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 500 THEN
    NEW.notes := left(NEW.notes, 500);
  END IF;
  
  IF NEW.coupon_code IS NOT NULL AND length(NEW.coupon_code) > 50 THEN
    RAISE EXCEPTION 'Invalid coupon code';
  END IF;
  
  RETURN NEW;
END;
$$;

-- log_admin_action (SECURITY DEFINER to write audit logs)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text, 
  _table_name text, 
  _record_id uuid, 
  _old_data jsonb DEFAULT NULL::jsonb, 
  _new_data jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.audit_logs (
      user_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
      auth.uid(), _action, _table_name, _record_id, _old_data, _new_data
    );
  END IF;
END;
$$;

-- get_review_user_name
CREATE OR REPLACE FUNCTION public.get_review_user_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(full_name, ''),
    'Customer'
  )
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- calculate_gst function
CREATE OR REPLACE FUNCTION public.calculate_gst(
  p_price NUMERIC,
  p_gst_percentage NUMERIC,
  p_tax_inclusive BOOLEAN
)
RETURNS TABLE(base_amount NUMERIC, gst_amount NUMERIC, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_tax_inclusive THEN
    base_amount := ROUND(p_price / (1 + p_gst_percentage / 100), 2);
    gst_amount := ROUND(p_price - base_amount, 2);
    total_amount := p_price;
  ELSE
    base_amount := p_price;
    gst_amount := ROUND(p_price * p_gst_percentage / 100, 2);
    total_amount := base_amount + gst_amount;
  END IF;
  RETURN NEXT;
END;
$$;

-- generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INT;
  v_invoice_number TEXT;
BEGIN
  UPDATE public.gst_settings
  SET invoice_counter = invoice_counter + 1
  RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;

  v_invoice_number := v_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_counter::TEXT, 4, '0');
  RETURN v_invoice_number;
END;
$$;

-- get_gst_type_for_state function
CREATE OR REPLACE FUNCTION public.get_gst_type_for_state(p_state TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_business_state TEXT;
BEGIN
  SELECT state INTO v_business_state FROM public.gst_settings LIMIT 1;
  
  IF LOWER(TRIM(p_state)) = LOWER(TRIM(v_business_state)) THEN
    RETURN 'cgst_sgst';
  ELSE
    RETURN 'igst';
  END IF;
END;
$$;

-- ================================
-- STEP 5: TRIGGERS
-- ================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_settings_updated_at BEFORE UPDATE ON public.delivery_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_order_number 
  BEFORE INSERT ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER trg_decrement_stock_on_order
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_order();

CREATE TRIGGER update_product_rating_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating_stats();

CREATE TRIGGER trigger_check_coupon_usage
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.check_coupon_usage();

CREATE TRIGGER trg_validate_order_fields
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_fields();

-- ================================
-- STEP 6: VIEWS
-- ================================

-- Product review stats view
CREATE OR REPLACE VIEW public.product_review_stats AS
SELECT 
  product_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star,
  COUNT(*) FILTER (WHERE rating = 4) as four_star,
  COUNT(*) FILTER (WHERE rating = 3) as three_star,
  COUNT(*) FILTER (WHERE rating = 2) as two_star,
  COUNT(*) FILTER (WHERE rating = 1) as one_star
FROM public.product_reviews
GROUP BY product_id;

-- Public product reviews view (hides user_id)
CREATE OR REPLACE VIEW public.public_product_reviews AS
SELECT 
  id, product_id, rating, description, user_name, created_at
FROM public.product_reviews;
ALTER VIEW public.public_product_reviews SET (security_invoker = on);

-- Public banners view
CREATE OR REPLACE VIEW public.public_banners AS
SELECT id, title, subtitle, image_url, link_url, is_active, sort_order, created_at
FROM public.banners
WHERE is_active = true;

-- Public store settings view  
CREATE OR REPLACE VIEW public.public_store_settings AS
SELECT store_name, gst_enabled, gst_inclusive, gst_percentage
FROM public.store_settings;

-- Public GST settings view
CREATE OR REPLACE VIEW public.public_gst_settings AS
SELECT gst_enabled, state, supported_gst_rates
FROM public.gst_settings;

-- ================================
-- STEP 7: RLS POLICIES
-- ================================

-- user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products
CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all addresses" ON public.addresses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can only modify own addresses" ON public.addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete own addresses" ON public.addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update order status" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- order_items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- cart_items
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id);

-- coupons
CREATE POLICY "Authenticated users can view valid coupons" ON public.coupons FOR SELECT TO authenticated USING (
  is_active = true 
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until >= now())
  AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- coupon_redemptions
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert redemptions" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage redemptions" ON public.coupon_redemptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- banners
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all banners" ON public.banners FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- delivery_settings
CREATE POLICY "Anyone can view active delivery settings" ON public.delivery_settings FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage delivery settings" ON public.delivery_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- store_settings
CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- shipping_regions
CREATE POLICY "Anyone can view shipping regions" ON public.shipping_regions FOR SELECT USING (true);
CREATE POLICY "Admins can manage shipping regions" ON public.shipping_regions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- product_reviews
CREATE POLICY "Anyone can view product reviews" ON public.product_reviews FOR SELECT TO public USING (true);
CREATE POLICY "Users can create reviews" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.product_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- gst_settings
CREATE POLICY "Anyone can view GST settings" ON public.gst_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage GST settings" ON public.gst_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- invoices
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = invoices.order_id AND orders.user_id = auth.uid())
);

-- audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payment_logs
CREATE POLICY "Admins can view payment logs" ON public.payment_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert payment logs" ON public.payment_logs FOR INSERT WITH CHECK (true);

-- ================================
-- STEP 8: STORAGE BUCKETS
-- ================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banner-images', 'banner-images', true);

CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view banner images" ON storage.objects FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "Admins can upload banner images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete banner images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));

-- ================================
-- STEP 9: REALTIME
-- ================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_regions;

-- ================================
-- STEP 10: GRANTS
-- ================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT INSERT ON public.coupon_redemptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT SELECT ON public.product_review_stats TO anon, authenticated;
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;

-- ================================
-- STEP 11: SEED DATA
-- ================================

-- Default store settings
INSERT INTO public.store_settings (store_name, phone, whatsapp, email, address)
VALUES ('PANDIYIN Nature In Pack', '+91 98765 43210', '+91 98765 43210', 'hello@pandiyin.com', 'Madurai, Tamil Nadu, India');

-- Default delivery settings
INSERT INTO public.delivery_settings (base_charge, free_delivery_above, is_active) 
VALUES (40.00, 500.00, true);

-- Default categories
INSERT INTO public.categories (name, description, sort_order) VALUES
  ('Pickles', 'Traditional homemade pickles', 1),
  ('Snacks', 'Crispy homemade snacks', 2),
  ('Spice Powders', 'Pure ground spice powders', 3),
  ('Ready Mixes', 'Instant cooking mixes', 4),
  ('Sweets', 'Traditional Indian sweets', 5),
  ('Health Foods', 'Nutritious health products', 6);

-- Default shipping regions
INSERT INTO public.shipping_regions (region_name, region_key, states, base_charge, free_delivery_above, per_kg_rate, is_enabled, sort_order) VALUES
('Within Tamil Nadu & Pondicherry', 'local', ARRAY['Tamil Nadu','Pondicherry','Puducherry'], 40, 500, 40, true, 0),
('Nearby States', 'nearby', ARRAY['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'], 0, NULL, 70, true, 1),
('Other Indian States', 'rest_of_india', ARRAY[]::text[], 80, NULL, 150, true, 2),
('International Delivery', 'international', ARRAY[]::text[], 0, NULL, 0, false, 3);

-- Default GST settings
INSERT INTO public.gst_settings (gst_enabled, business_name, state, invoice_prefix)
VALUES (true, 'PANDIYIN Nature In Pack', 'Tamil Nadu', 'PNP');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
