
-- Fix 1: Atomic coupon redemption function
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
  -- Lock the coupon row to prevent race conditions
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(_coupon_code) AND is_active = true
  FOR UPDATE;

  IF v_coupon IS NULL THEN
    RETURN false;
  END IF;

  -- Re-check usage limits under lock
  IF v_coupon.max_uses IS NOT NULL AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses THEN
    RETURN false;
  END IF;

  -- Re-check per-user limit under lock
  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_redemptions
    FROM public.coupon_redemptions cr
    WHERE cr.coupon_id = v_coupon.id AND cr.user_id = _user_id;
    
    IF v_user_redemptions >= v_coupon.max_uses_per_user THEN
      RETURN false;
    END IF;
  END IF;

  -- Re-check validity dates
  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RETURN false;
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN false;
  END IF;

  -- Insert redemption record
  INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id)
  VALUES (v_coupon.id, _user_id, _order_id)
  ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING;

  -- Increment usage counter
  UPDATE public.coupons
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = v_coupon.id;

  RETURN true;
END;
$$;

-- Fix 2: Revoke anon access to check_email_exists
REVOKE EXECUTE ON FUNCTION public.check_email_exists FROM anon;
