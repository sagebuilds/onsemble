ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS position INTEGER;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at) AS rn
  FROM public.photos
)
UPDATE public.photos p
SET position = ordered.rn
FROM ordered
WHERE p.id = ordered.id AND p.position IS NULL;

CREATE INDEX IF NOT EXISTS photos_room_position_idx ON public.photos (room_id, position);