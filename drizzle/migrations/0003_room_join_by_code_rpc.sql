-- Creators must be able to read the room they just made (before membership exists).
DROP POLICY IF EXISTS "rooms readable by members or invitees" ON public.rooms;

CREATE POLICY "rooms readable by members or invitees"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_room_member(id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.room_invites i
    WHERE i.room_id = rooms.id
      AND i.status = 'pending'
      AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- Joining by invite code without exposing every room row.
CREATE OR REPLACE FUNCTION public.join_room_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO _room_id FROM public.rooms WHERE lower(code) = lower(trim(_code)) LIMIT 1;
  IF _room_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.room_members (room_id, user_id)
  VALUES (_room_id, _uid)
  ON CONFLICT (room_id, user_id) DO NOTHING;

  UPDATE public.room_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = _uid
  WHERE room_id = _room_id
    AND status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));

  RETURN _room_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_room_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_room_by_code(text) TO authenticated;