CREATE TABLE public.licenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  license_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  variant text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;