import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clapperboard, Plus, Star, Trash2, Tv } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  currentUserId,
  SHELF_FOR_LABEL,
  useShelf,
  type ShelfFor,
  type ShelfKind,
  type ShelfState,
} from "@/lib/data";

const KIND_ICON: Record<ShelfKind, typeof BookOpen> = {
  book: BookOpen,
  movie: Clapperboard,
  show: Tv,
};

export function Bookshelf({ roomId }: { roomId: string }) {
  const qc = useQueryClient();
  const { data: items } = useShelf(roomId);
  const [open, setOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<ShelfKind | "all">("all");
  const [stateFilter, setStateFilter] = useState<ShelfState>("suggestion");
  const [forFilter, setForFilter] = useState<ShelfFor | "all">("all");

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ShelfKind>("movie");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [intendedFor, setIntendedFor] = useState<ShelfFor>("you");

  const refresh = () => qc.invalidateQueries({ queryKey: ["shelf", roomId] });

  const add = async () => {
    if (!title.trim()) return toast.error("What's it called?");
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await supabase.from("shelf_items").insert({
      room_id: roomId,
      added_by: uid,
      title: title.trim(),
      kind,
      link: link.trim() || null,
      note: note.trim() || null,
      intended_for: intendedFor,
    });
    if (error) return toast.error("Couldn't add that to the shelf.");
    setTitle("");
    setLink("");
    setNote("");
    setOpen(false);
    refresh();
    toast.success("Added to the shelf!");
  };

  const finish = async (id: string, rating: number) => {
    const { error } = await supabase
      .from("shelf_items")
      .update({ state: "finished", rating, finished_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Couldn't move that one.");
    refresh();
  };

  const reopen = async (id: string) => {
    await supabase
      .from("shelf_items")
      .update({ state: "suggestion", finished_at: null, rating: null })
      .eq("id", id);
    refresh();
  };

  const react = async (id: string, reaction: string) => {
    await supabase.from("shelf_items").update({ reaction }).eq("id", id);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shelf_items").delete().eq("id", id);
    if (error) return toast.error("You can only remove things you added.");
    refresh();
  };

  const visible = (items ?? []).filter(
    (i) =>
      i.state === stateFilter &&
      (kindFilter === "all" || i.kind === kindFilter) &&
      (forFilter === "all" || i.intended_for === forFilter),
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Bookshelf</h2>
          <p className="text-sm text-muted-foreground">
            Books, movies and shows you want to share with each other.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Shelve something
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to the shelf</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="t">Title</Label>
                <Input
                  id="t"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                {(["book", "movie", "show"] as ShelfKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold capitalize transition-colors ${
                      kind === k ? "border-primary" : "border-transparent bg-secondary"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l">Link (optional)</Label>
                <Input
                  id="l"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n">Why are you shelving it?</Label>
                <Textarea
                  id="n"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="This reminded me of that trip…"
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                {(["you", "us", "me"] as ShelfFor[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setIntendedFor(f)}
                    className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-colors ${
                      intendedFor === f ? "border-primary" : "border-transparent bg-secondary"
                    }`}
                  >
                    {SHELF_FOR_LABEL[f]}
                  </button>
                ))}
              </div>
              <Button className="w-full rounded-full" onClick={add}>
                Add to shelf
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={stateFilter === "suggestion"} onClick={() => setStateFilter("suggestion")}>
          Suggestions
        </Chip>
        <Chip active={stateFilter === "finished"} onClick={() => setStateFilter("finished")}>
          Finished
        </Chip>
        <span className="mx-2 h-5 w-px bg-border" />
        {(["all", "book", "movie", "show"] as const).map((k) => (
          <Chip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
            {k === "all" ? "Everything" : `${k}s`}
          </Chip>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {(["all", "you", "us", "me"] as const).map((f) => (
          <Chip key={f} active={forFilter === f} onClick={() => setForFilter(f)}>
            {f === "all" ? "Anyone" : SHELF_FOR_LABEL[f]}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nothing here yet — shelve the first one.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind as ShelfKind] ?? Clapperboard;
            return (
              <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold leading-tight">
                        {item.title}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {SHELF_FOR_LABEL[item.intended_for as ShelfFor]}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {item.note && <p className="mt-3 text-sm text-muted-foreground">“{item.note}”</p>}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Open link →
                  </a>
                )}

                {item.state === "suggestion" ? (
                  <div className="mt-4 flex items-center gap-1">
                    <span className="mr-2 text-xs font-semibold text-muted-foreground">
                      Finished it? Rate:
                    </span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => finish(item.id, n)}
                        aria-label={`Finished, ${n} stars`}
                        className="text-muted-foreground transition-colors hover:text-sunshine"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${
                            (item.rating ?? 0) >= n
                              ? "fill-sunshine text-sunshine"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <button
                        onClick={() => reopen(item.id)}
                        className="ml-auto text-xs font-semibold text-primary hover:underline"
                      >
                        Back to suggestions
                      </button>
                    </div>
                    <Input
                      defaultValue={item.reaction ?? ""}
                      placeholder="A quick reaction…"
                      onBlur={(e) => {
                        if (e.target.value !== (item.reaction ?? "")) react(item.id, e.target.value);
                      }}
                      className="h-9 rounded-xl text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
