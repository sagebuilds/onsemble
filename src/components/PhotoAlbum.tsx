import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, usePhotos } from "@/lib/data";

export function PhotoAlbum({ roomId }: { roomId: string }) {
  const qc = useQueryClient();
  const { data: photos } = usePhotos(roomId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["photos", roomId] });

  const upload = async (files: File[]) => {
    setBusy(true);
    try {
      const uid = await currentUserId();
      if (!uid) throw new Error("Please sign in again.");
      let added = 0;
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("room-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const { error } = await supabase.from("photos").insert({
          room_id: roomId,
          uploaded_by: uid,
          storage_path: path,
          caption: caption.trim() || null,
        });
        if (error) throw error;
        added += 1;
      }
      setCaption("");
      refresh();
      toast.success(added === 1 ? "Photo added to the album!" : `${added} photos added!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload those photos.");
      refresh();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string, path: string) => {
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) {
      toast.error("You can only remove photos you added.");
      return;
    }
    await supabase.storage.from("room-photos").remove([path]);
    refresh();
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Photo album</h2>
          <p className="text-sm text-muted-foreground">
            Just for this room — only members can see these.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="h-10 w-52 rounded-xl"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) upload(files);
            }}
          />
          <Button className="rounded-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="mr-1 h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {(photos ?? []).length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No photos yet — add the first memory.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-3">
          {(photos ?? []).map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border"
            >
              <button
                onClick={() => photo.url && setLightbox(photo.url)}
                className="h-full w-full"
                aria-label={photo.caption ?? "Open photo"}
              >
                {photo.url && (
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "Room photo"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
              </button>
              <button
                onClick={() => remove(photo.id, photo.storage_path)}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {photo.caption && (
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-semibold text-white">
                  {photo.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          {lightbox && (
            <img src={lightbox} alt="Room photo" className="w-full rounded-xl object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
