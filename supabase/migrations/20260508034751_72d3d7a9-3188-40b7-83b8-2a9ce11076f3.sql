
-- Attach trigger so new signups get profile + (first user becomes owner)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing users missing profile/roles
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Add fields needed for richer certs
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS partners jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage bucket for logos / signatures / stamps
INSERT INTO storage.buckets (id, name, public)
VALUES ('cert-assets', 'cert-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read; staff can write
DROP POLICY IF EXISTS "public read cert-assets" ON storage.objects;
CREATE POLICY "public read cert-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'cert-assets');

DROP POLICY IF EXISTS "staff write cert-assets" ON storage.objects;
CREATE POLICY "staff write cert-assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cert-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff update cert-assets" ON storage.objects;
CREATE POLICY "staff update cert-assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'cert-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff delete cert-assets" ON storage.objects;
CREATE POLICY "staff delete cert-assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cert-assets' AND public.is_staff(auth.uid()));
