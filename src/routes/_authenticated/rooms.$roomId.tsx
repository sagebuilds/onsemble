import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, History, Play, Settings2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { Bookshelf } from "@/components/Bookshelf";
import { PhotoAlbum } from "@/components/PhotoAlbum";
import { RoomInvites } from "@/components/RoomInvites";
import { supabase } from "@/integrations/supabase/client";
import { RoomEmojiPicker } from "@/components/RoomEmojiPicker";
import { roomEmoji, STREAMING_SERVICES } from "@/lib/room";
import {
  currentUserId,
  useRoom,
  useRoomInvites,
  useRoomMembers,
  useWatchHistory,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Shared room — Onsemble" },
      {
        name: "description",
        content:
          "Your shared Onsemble room: bookshelf, photo album, watch history and a one-click movie night.",
      },
      { property: "og:title", content: "A shared Onsemble room" },
      {
        property: "og:description",
        content: "Shelve books and films, share photos and start a synced movie night.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomHub,
});

function RoomHub() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: room, isLoading } = useRoom(roomId);
  const { data: members } = useRoomMembers(roomId);
  const { data: history } = useWatchHistory(roomId);
  const { data: invites } = useRoomInvites(roomId);
  const [name, setName] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <p className="mx-auto max-w-6xl px-8 text-sm text-muted-foreground">Loading room…</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-6xl px-8">
          <h1 className="font-display text-3xl font-semibold">Room not found</h1>
          <Button className="mt-4 rounded-full" onClick={() => navigate({ to: "/home" })}>
            Back to my rooms
          </Button>
        </div>
      </main>
    );
  }

  const copyCode = () => {
    navigator.clipboard
      ?.writeText(room.code)
      .then(() => toast.success("Invite code copied!"))
      .catch(() => toast.error("Couldn't copy the code."));
  };

  const renameRoom = async () => {
    if (name === null || !name.trim()) return setName(null);
    const { error } = await supabase.from("rooms").update({ name: name.trim() }).eq("id", roomId);
    if (error) toast.error("Couldn't rename the room.");
    else await qc.invalidateQueries({ queryKey: ["room", roomId] });
    setName(null);
  };

  const setEmoji = async (emoji: string | null) => {
    const { error } = await supabase.from("rooms").update({ emoji }).eq("id", roomId);
    if (error) toast.error("Couldn't save that emoji.");
    else {
      await qc.invalidateQueries({ queryKey: ["room", roomId] });
      await qc.invalidateQueries({ queryKey: ["my-rooms"] });
    }
  };

  const toggleService = async (service: string) => {
    const current = room.services ?? [];
    const next = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service];
    const { error } = await supabase.from("rooms").update({ services: next }).eq("id", roomId);
    if (error) toast.error("Couldn't save that preference.");
    else await qc.invalidateQueries({ queryKey: ["room", roomId] });
  };

  const startNight = async () => {
    const uid = await currentUserId();
    if (uid) {
      await supabase.from("watch_sessions").insert({
        room_id: roomId,
        started_by: uid,
        service: room.services?.[0] ?? null,
        participant_names: (members ?? [])
          .map((m) => m.profile?.display_name ?? "Friend")
          .filter(Boolean),
      });
      await qc.invalidateQueries({ queryKey: ["history", roomId] });
    }
    navigate({
      to: "/room/$code",
      params: { code: room.code },
      search: { kind: room.kind === "date" ? "date" : "friendship" },
    });
  };

  const leaveRoom = async () => {
    const uid = await currentUserId();
    if (!uid) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", uid);
    await qc.invalidateQueries({ queryKey: ["my-rooms"] });
    navigate({ to: "/home" });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-mint/40 blur-3xl" />
      <AppHeader />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <RoomEmojiPicker
              className="-ml-2 text-3xl"
              value={roomEmoji(room)}
              onSelect={setEmoji}
            />
            {name === null ? (
              <h1
                className="mt-1 cursor-text font-display text-3xl font-semibold tracking-tight sm:text-5xl"
                onDoubleClick={() => setName(room.name)}
                title="Double-click to rename"
              >
                {room.name}
              </h1>
            ) : (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={renameRoom}
                onKeyDown={(e) => e.key === "Enter" && renameRoom()}
                className="mt-1 h-14 rounded-xl font-display text-3xl"
              />
            )}
            <button
              onClick={copyCode}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-secondary-foreground"
            >
              <Copy className="h-3.5 w-3.5" /> {room.code}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {(members ?? []).map((m) => (
                <Avatar key={m.user_id} className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-electric text-xs text-background">
                    {(m.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {(invites ?? []).map((invite) => (
                <span
                  key={invite.id}
                  title={`${invite.email} — invited, not joined yet`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-xs font-semibold text-muted-foreground"
                >
                  {invite.email.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
            <Button size="lg" className="rounded-full" onClick={startNight}>
              <Play className="mr-1 h-5 w-5" /> Start movie night
            </Button>
          </div>
        </div>

        <Tabs defaultValue="shelf" className="mt-10">
          <TabsList className="rounded-full">
            <TabsTrigger value="shelf" className="rounded-full">
              Bookshelf
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-full">
              Photos
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full">
              Room settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shelf" className="mt-6">
            <Bookshelf roomId={roomId} />
          </TabsContent>

          <TabsContent value="photos" className="mt-6">
            <PhotoAlbum roomId={roomId} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-semibold">Watch history</h2>
              {(history ?? []).length === 0 ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Nothing watched together yet.
                </p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {(history ?? []).map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3"
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {session.title ?? session.service ?? "Movie night"}
                        </span>
                        <span className="text-muted-foreground">
                          with {(session.participant_names ?? []).join(", ") || "the room"}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.started_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
                <Settings2 className="h-5 w-5" /> Room preferences
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Which streaming services does this group use?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {STREAMING_SERVICES.map((service) => {
                  const active = (room.services ?? []).includes(service);
                  return (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Members
                </p>
                <ul className="mt-3 space-y-2">
                  {(members ?? []).map((m) => (
                    <li key={m.user_id} className="flex items-center gap-3 text-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="bg-bubblegum text-xs text-background">
                          {(m.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {m.profile?.display_name ?? "Friend"}
                    </li>
                  ))}
                  {(invites ?? []).map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-xs">
                        {invite.email.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate">{invite.email}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        Invited
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <RoomInvites roomId={roomId} roomName={room.name} code={room.code} />
              </div>

              <Button variant="ghost" className="mt-8 rounded-full" onClick={leaveRoom}>
                <UserMinus className="mr-1 h-4 w-4" /> Leave this room
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
