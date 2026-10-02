CREATE POLICY "members remove others" ON public.room_members FOR DELETE TO authenticated
USING (
  public.is_room_member(room_id, auth.uid())
  AND user_id <> (SELECT r.created_by FROM public.rooms r WHERE r.id = room_members.room_id)
);