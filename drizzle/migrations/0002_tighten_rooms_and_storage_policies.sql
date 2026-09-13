-- 1. SECURITY DEFINER function should not be callable by app users (email enumeration).
REVOKE EXECUTE ON FUNCTION public.email_has_account(text) FROM anon, authenticated, public;

-- 2. Restrict rooms reads to members (or people with a pending invite to that room).
DROP POLICY IF EXISTS "rooms readable by signed in" ON public.rooms;

CREATE POLICY "rooms readable by members or invitees"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  public.is_room_member(id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.room_invites i
    WHERE i.room_id = rooms.id
      AND i.status = 'pending'
      AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- 3. Storage: allow uploaders who are still room members to update their own objects.
CREATE POLICY "room photos update by owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'room-photos'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.storage_path = storage.objects.name
      AND public.is_room_member(p.room_id, auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'room-photos'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.storage_path = storage.objects.name
      AND public.is_room_member(p.room_id, auth.uid())
  )
);