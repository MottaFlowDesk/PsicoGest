-- Fix search path in create_default_settings function
CREATE OR REPLACE FUNCTION public.create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (professional_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
