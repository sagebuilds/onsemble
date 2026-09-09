import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FolderPlus, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, usePhotoAlbums, usePhotos } from "@/lib/data";

const ALL = "all";
const UNFILED = "unfiled";

export function PhotoAlbum({ roomId }: { roomId: string }) {
  const qc = useQueryClient();
  const { data: photos } = usePhotos(roomId);
  const { data: albums } = usePhotoAlbums(roomId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<
    { file: File; url: string; caption: string }[] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [view, setView] = useState<string>(ALL);
  const [newAlbum, setNewAlbum] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    setBulkBusy(true);
    try {
      const targets = (photos ?? []).filter((p) => selected.has(p.id));
      const { error } = await supabase
        .from("photos")
        .delete()
        .in(
          "id",
          targets.map((p) => p.id),
        );
      if (error) throw error;
      await supabase.storage
        .from("room-photos")
        .remove(targets.map((p) => p.storage_path));
      toast.success(
        selected.size === 1
          ? "Photo removed."
          : `${selected.size} photos removed.`,
      );
      exitSelect();
      refresh();
    } catch {
      toast.error("You can only remove photos you added.");
      refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["photos", roomId] });
    qc.invalidateQueries({ queryKey: ["photo-albums", roomId] });
  };

  const visible = useMemo(() => {
    const all = photos ?? [];
    const filtered =
      view === ALL
        ? all
        : view === UNFILED
          ? all.filter((p) => !p.album_id)
          : all.filter((p) => p.album_id === view);
    if (!localOrder) return filtered;
    const rank = (id: string) => {
      const i = localOrder.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...filtered].sort((a, b) => rank(a.id) - rank(b.id));
  }, [photos, view, localOrder]);

  const reorder = async (targetId: string) => {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const ids = visible.map((p) => p.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    setLocalOrder(ids);

    const slots = visible.map((p, i) => p.position ?? i + 1).sort((a, b) => a - b);
    const results = await Promise.all(
      ids.map((id, i) =>
        supabase
          .from("photos")
          .update({ position: slots[i] ?? i + 1 })
          .eq("id", id),
      ),
    );
    if (results.some((r) => r.error)) toast.error("Couldn't save that order.");
    refresh();
  };

  const createAlbum = async () => {
    const name = (newAlbum ?? "").trim();
    if (!name) return setNewAlbum(null);
    const uid = await currentUserId();
    if (!uid) return toast.error("Please sign in again.");
    const { data, error } = await supabase
      .from("photo_albums")
      .insert({ room_id: roomId, created_by: uid, name })
      .select("id")
      .single();
    if (error) toast.error("Couldn't create that album.");
    else {
      setView(data.id);
      toast.success(`Album "${name}" created.`);
    }
    setNewAlbum(null);
    refresh();
  };

  const closePending = () => {
    pending?.forEach((p) => URL.revokeObjectURL(p.url));
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async () => {
    if (!pending?.length) return;
    setBusy(true);
    setProgress({ done: 0, total: pending.length });
    try {
      const uid = await currentUserId();
      if (!uid) throw new Error("Please sign in again.");
      const albumId = view === ALL || view === UNFILED ? null : view;
      let nextPosition = (photos ?? []).reduce((max, p) => Math.max(max, p.position ?? 0), 0);
      let added = 0;
      for (const item of pending) {
        const ext = item.file.name.split(".").pop() ?? "jpg";
        const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("room-photos")
          .upload(path, item.file, { contentType: item.file.type });
        if (uploadError) throw uploadError;
        nextPosition += 1;
        const { error } = await supabase.from("photos").insert({
          room_id: roomId,
          uploaded_by: uid,
          storage_path: path,
          album_id: albumId,
          caption: item.caption.trim() || null,
          position: nextPosition,
        });
        if (error) throw error;
        added += 1;
      }
      closePending();
      refresh();
      toast.success(added === 1 ? "Photo added to the album!" : `${added} photos added!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload those photos.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const moveTo = async (photoId: string, albumId: string) => {
    const { error } = await supabase
      .from("photos")
      .update({ album_id: albumId === UNFILED ? null : albumId })
      .eq("id", photoId);
    if (error) toast.error("Couldn't move that photo.");
    refresh();
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

  const deleteAlbum = async (albumId: string) => {
    const { error } = await supabase.from("photo_albums").delete().eq("id", albumId);
    if (error) toast.error("Only the person who made the album can delete it.");
    else {
      setView(ALL);
      toast.success("Album removed — its photos are still here.");
    }
    refresh();
  };

  const countFor = (key: string) => {
    const all = photos ?? [];
    if (key === ALL) return all.length;
    if (key === UNFILED) return all.filter((p) => !p.album_id).length;
    return all.filter((p) => p.album_id === key).length;
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length)
                setPending(
                  files.map((file) => ({
                    file,
                    url: URL.createObjectURL(file),
                    caption: "",
                  })),
                );
            }}
          />
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="mr-1 h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
          </Button>
          {selectMode ? (
            <>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={exitSelect}
              >
                <X className="mr-1 h-4 w-4" /> Done
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={!selected.size || bulkBusy}
                onClick={bulkDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {bulkBusy
                  ? "Removing…"
                  : selected.size
                    ? `Delete ${selected.size}`
                    : "Delete"}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={busy || visible.length === 0}
              onClick={() => setSelectMode(true)}
            >
              <Check className="mr-1 h-4 w-4" /> Select
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[
          { key: ALL, label: "All photos" },
          ...(albums ?? []).map((a) => ({ key: a.id, label: a.name })),
          { key: UNFILED, label: "Unfiled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setLocalOrder(null);
              setView(tab.key);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              view === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {tab.label} <span className="opacity-60">{countFor(tab.key)}</span>
          </button>
        ))}

        {newAlbum === null ? (
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => setNewAlbum("")}
          >
            <FolderPlus className="mr-1 h-4 w-4" /> New album
          </Button>
        ) : (
          <Input
            autoFocus
            value={newAlbum}
            placeholder="Album name"
            onChange={(e) => setNewAlbum(e.target.value)}
            onBlur={createAlbum}
            onKeyDown={(e) => e.key === "Enter" && createAlbum()}
            className="h-10 w-44 rounded-xl"
          />
        )}

        {view !== ALL && view !== UNFILED && (
          <Button
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={() => deleteAlbum(view)}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete album
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {view === ALL ? "No photos yet — add the first memory." : "Nothing in here yet."}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-3">
          {visible.map((photo) => (
            <div
              key={photo.id}
              draggable={!selectMode}
              onDragStart={() => !selectMode && setDragId(photo.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!selectMode && overId !== photo.id) setOverId(photo.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!selectMode) reorder(photo.id);
              }}
              className={`space-y-2 transition-opacity ${dragId === photo.id ? "opacity-40" : ""}`}
            >
              <div
                className={`group relative aspect-square overflow-hidden rounded-2xl border transition-colors ${
                  selectMode
                    ? selected.has(photo.id)
                      ? "border-primary ring-2 ring-primary"
                      : "border-border"
                    : overId === photo.id && dragId && dragId !== photo.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-border"
                } ${selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                onClick={() =>
                  selectMode ? toggleSelect(photo.id) : photo.url && setLightbox(photo.url)
                }
              >
                {photo.url && (
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "Room photo"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                {selectMode && (
                  <div
                    className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                      selected.has(photo.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/80 bg-background/60 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
                {!selectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(photo.id, photo.storage_path);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {photo.caption && (
                  <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-semibold text-white">
                    {photo.caption}
                  </p>
                )}
              </div>
              <Select
                value={photo.album_id ?? UNFILED}
                onValueChange={(v) => moveTo(photo.id, v)}
              >
                <SelectTrigger className="h-8 rounded-xl text-xs">
                  <SelectValue placeholder="Unfiled" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNFILED}>Unfiled</SelectItem>
                  {(albums ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && closePending()}>
        <DialogContent className="max-w-2xl">
          <h3 className="font-display text-xl font-semibold">
            Add captions ({pending?.length ?? 0})
          </h3>
          <p className="text-sm text-muted-foreground">
            Give each photo its own caption — or leave any of them blank.
          </p>
          <div className="mt-2 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {pending?.map((item, i) => (
              <div key={item.url} className="flex items-center gap-3">
                <img
                  src={item.url}
                  alt={item.file.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <Input
                  value={item.caption}
                  placeholder="Caption (optional)"
                  className="h-10 rounded-xl"
                  onChange={(e) => {
                    const value = e.target.value;
                    setPending((prev) =>
                      prev
                        ? prev.map((p, idx) => (idx === i ? { ...p, caption: value } : p))
                        : prev,
                    );
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" className="rounded-full" disabled={busy} onClick={closePending}>
              Cancel
            </Button>
            <Button className="rounded-full" disabled={busy} onClick={upload}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
