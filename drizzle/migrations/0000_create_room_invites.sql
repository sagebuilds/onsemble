CREATE TABLE public.room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid
);

CREATE UNIQUE INDEX room_invites_room_email_pending_idx
  ON public.room_invites (room_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX room_invites_email_idx ON public.room_invites (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_invites TO authenticated;
GRANT ALL ON public.room_invites TO service_role;

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites readable by room members or invitee"
  ON public.room_invites FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid())
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "invites created by room members"
  ON public.room_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.is_room_member(room_id, auth.uid()));

CREATE POLICY "invites updated by members or invitee"
  ON public.room_invites FOR UPDATE TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid())
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    public.is_room_member(room_id, auth.uid())
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "invites deleted by room members"
  ON public.room_invites FOR DELETE TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
