CREATE TABLE public.photo_albums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_albums TO authenticated;
GRANT ALL ON public.photo_albums TO service_role;

ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "albums read" ON public.photo_albums FOR SELECT TO authenticated
  USING (is_room_member(room_id, auth.uid()));
CREATE POLICY "albums insert" ON public.photo_albums FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_room_member(room_id, auth.uid()));
CREATE POLICY "albums update" ON public.photo_albums FOR UPDATE TO authenticated
  USING (is_room_member(room_id, auth.uid())) WITH CHECK (is_room_member(room_id, auth.uid()));
CREATE POLICY "albums delete" ON public.photo_albums FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_photo_albums_updated_at BEFORE UPDATE ON public.photo_albums
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.photos ADD COLUMN album_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL;

CREATE INDEX photos_album_id_idx ON public.photos(album_id);
CREATE INDEX photo_albums_room_id_idx ON public.photo_albums(room_id);

CREATE POLICY "photos update" ON public.photos FOR UPDATE TO authenticated
  USING (is_room_member(room_id, auth.uid())) WITH CHECK (is_room_member(room_id, auth.uid()));