import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode, ROOM_KINDS, type RoomKind } from "@/lib/room";
import { currentUserId, useMyRooms } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "My rooms — Onsemble" },
      {
        name: "description",
        content:
          "All your saved Onsemble rooms: shared bookshelves, photo albums, watch history and synced movie nights.",
      },
      { property: "og:title", content: "My Onsemble rooms" },
      {
        property: "og:description",
        content: "Jump back into a saved room with your people.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useMyRooms();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RoomKind>("friendship");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) return toast.error("Give your room a name first.");
    setBusy(true);
    try {
      const uid = await currentUserId();
      if (!uid) throw new Error("Please sign in again.");
      const { data: room, error } = await supabase
        .from("rooms")
        .insert({ name: name.trim(), kind, code: generateRoomCode(), created_by: uid })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, user_id: uid });
      if (memberError) throw memberError;
      await qc.invalidateQueries({ queryKey: ["my-rooms"] });
      setName("");
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create that room.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return toast.error("That invite code looks too short.");
    setBusy(true);
    try {
      const uid = await currentUserId();
      if (!uid) throw new Error("Please sign in again.");
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!room) throw new Error("No room with that invite code.");
      const { error: joinError } = await supabase
        .from("room_members")
        .upsert({ room_id: room.id, user_id: uid }, { onConflict: "room_id,user_id" });
      if (joinError) throw joinError;
      await qc.invalidateQueries({ queryKey: ["my-rooms"] });
      setJoinCode("");
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join that room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-sunshine/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-[26rem] w-[26rem] rounded-full bg-bubblegum/40 blur-3xl" />

      <AppHeader />

      <section className="relative mx-auto w-full max-w-6xl px-8 pb-24">
        <h1 className="font-display text-5xl font-semibold tracking-tight">Your rooms</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          Every room keeps its own bookshelf, photo album and watch history — for as many people as
          you like.
        </p>

        <div className="mt-8 grid grid-cols-[1.2fr_1fr] gap-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-playful">
            <p className="font-display text-lg font-semibold">Start a new room</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Movie Club"
              className="mt-4 rounded-xl"
            />
            <div className="mt-4 flex gap-3">
              {ROOM_KINDS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setKind(option.id)}
                  className={`flex-1 rounded-2xl border-2 p-3 text-left transition-all ${
                    kind === option.id
                      ? "border-primary bg-card shadow-playful"
                      : "border-transparent bg-secondary hover:border-border"
                  }`}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <p className="font-display text-sm font-semibold">{option.label}</p>
                </button>
              ))}
            </div>
            <Button
              className="mt-4 w-full rounded-full"
              size="lg"
              disabled={busy}
              onClick={createRoom}
            >
              <Clapperboard className="mr-1 h-5 w-5" /> Create room
            </Button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-playful">
            <p className="font-display text-lg font-semibold">Join with an invite code</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Someone shared a code with you? Drop it in here to join for good.
            </p>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="ROOM CODE"
              maxLength={8}
              className="mt-4 rounded-xl font-display tracking-[0.25em]"
            />
            <Button
              variant="secondary"
              className="mt-4 w-full rounded-full"
              size="lg"
              disabled={busy}
              onClick={joinRoom}
            >
              <Users className="mr-1 h-5 w-5" /> Join room
            </Button>
          </div>
        </div>

        <div className="mt-12">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Saved rooms
          </p>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading your rooms…</p>
          ) : (rooms ?? []).length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-border p-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-bubblegum" />
              <p className="mt-3 font-display text-xl font-semibold">No rooms yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one above and invite your people.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {(rooms ?? []).map((room) => (
                <Link
                  key={room.id}
                  to="/rooms/$roomId"
                  params={{ roomId: room.id }}
                  className="rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-playful"
                >
                  <span className="text-2xl">{room.kind === "date" ? "💞" : "🍿"}</span>
                  <p className="mt-2 font-display text-xl font-semibold">{room.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {room.code}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
