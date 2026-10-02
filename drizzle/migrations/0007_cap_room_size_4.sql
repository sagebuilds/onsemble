CREATE OR REPLACE FUNCTION public.enforce_room_member_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.room_members WHERE room_id = NEW.room_id AND user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM public.room_members WHERE room_id = NEW.room_id) >= 4 THEN
    RAISE EXCEPTION 'room_full' USING HINT = 'Rooms hold at most 4 people';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER room_members_cap BEFORE INSERT ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_member_cap();

CREATE OR REPLACE FUNCTION public.enforce_room_invite_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.room_members WHERE room_id = NEW.room_id)
     + (SELECT count(*) FROM public.room_invites WHERE room_id = NEW.room_id AND status = 'pending') >= 4 THEN
    RAISE EXCEPTION 'room_full' USING HINT = 'Rooms hold at most 4 people';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER room_invites_cap BEFORE INSERT ON public.room_invites
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_invite_cap();