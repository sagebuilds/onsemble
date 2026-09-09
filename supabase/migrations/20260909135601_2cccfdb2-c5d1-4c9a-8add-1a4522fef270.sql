CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Friend',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'friendship' CHECK (kind IN ('friendship','date')),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  services text[] NOT NULL DEFAULT '{}',
  vibe text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.shares_room_with(_other uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members a
    JOIN public.room_members b ON a.room_id = b.room_id
    WHERE a.user_id = _other AND b.user_id = _user_id
  );
$$;

CREATE TABLE public.shelf_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'movie' CHECK (kind IN ('book','movie','show')),
  link text,
  cover_url text,
  note text,
  intended_for text NOT NULL DEFAULT 'us' CHECK (intended_for IN ('you','us','me')),
  state text NOT NULL DEFAULT 'suggestion' CHECK (state IN ('suggestion','finished')),
  rating int CHECK (rating BETWEEN 1 AND 5),
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelf_items TO authenticated;
GRANT ALL ON public.shelf_items TO service_role;
ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  started_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service text,
  title text,
  participant_names text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_sessions TO authenticated;
GRANT ALL ON public.watch_sessions TO service_role;
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_room_with(id, auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "rooms readable by signed in" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms insert own" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "rooms update by members" ON public.rooms FOR UPDATE TO authenticated
  USING (public.is_room_member(id, auth.uid())) WITH CHECK (public.is_room_member(id, auth.uid()));
CREATE POLICY "rooms delete by owner" ON public.rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "members visible to members" ON public.room_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id, auth.uid()));
CREATE POLICY "join room as self" ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave room" ON public.room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "shelf read" ON public.shelf_items FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "shelf insert" ON public.shelf_items FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "shelf update" ON public.shelf_items FOR UPDATE TO authenticated
  USING (public.is_room_member(room_id, auth.uid()))
  WITH CHECK (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "shelf delete" ON public.shelf_items FOR DELETE TO authenticated
  USING (added_by = auth.uid());

CREATE POLICY "history read" ON public.watch_sessions FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "history insert" ON public.watch_sessions FOR INSERT TO authenticated
  WITH CHECK (started_by = auth.uid() AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "history update" ON public.watch_sessions FOR UPDATE TO authenticated
  USING (public.is_room_member(room_id, auth.uid()))
  WITH CHECK (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "history delete" ON public.watch_sessions FOR DELETE TO authenticated
  USING (started_by = auth.uid());

CREATE POLICY "photos read" ON public.photos FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "photos insert" ON public.photos FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "photos delete" ON public.photos FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Friend'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "room photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'room-photos' AND public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid()));
CREATE POLICY "room photos insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-photos' AND public.is_room_member((storage.foldername(name))[1]::uuid, auth.uid()) AND owner = auth.uid());
CREATE POLICY "room photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'room-photos' AND owner = auth.uid());