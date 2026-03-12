
-- Make log_admin_action SECURITY DEFINER so it can write audit logs
-- even though we removed the client INSERT policy
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
  -- Only log if user is admin
  IF public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_data, 
      new_data
    ) VALUES (
      auth.uid(), 
      _action, 
      _table_name, 
      _record_id, 
      _old_data, 
      _new_data
    );
  END IF;
END;
$$;
