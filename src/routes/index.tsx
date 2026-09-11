import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Clapperboard, Popcorn, Sparkles, MonitorPlay, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateRoomCode, ROOM_KINDS, type RoomKind } from "@/lib/room";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onsemble — Watch movies together, from anywhere" },
      {
        name: "description",
        content:
          "Onsemble creates virtual rooms with video chat and synced playback across YouTube, Netflix, Disney+, Apple TV+ and Prime Video.",
      },
      { property: "og:title", content: "Onsemble — Watch together, from anywhere" },
      {
        property: "og:description",
        content:
          "Create a Friendship Room or Date Room, hop on video chat, and sync your streaming playback in real time.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<RoomKind>("friendship");
  const [joinCode, setJoinCode] = useState("");

  const createRoom = () => {
    const code = generateRoomCode();
    navigate({ to: "/room/$code", params: { code }, search: { kind } });
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("That room code looks too short.");
      return;
    }
    navigate({ to: "/room/$code", params: { code }, search: { kind } });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-sunshine/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-[26rem] w-[26rem] rounded-full bg-bubblegum/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-electric/30 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-joy shadow-playful">
            <Popcorn className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-muted-foreground sm:gap-6">
          <span className="hidden items-center gap-1.5 sm:flex">
            <MonitorPlay className="h-4 w-4" /> Desktop only
          </span>
          <a href="/extension" className="transition-colors hover:text-foreground">
            Chrome extension
          </a>
          <a
            href="/home"
            className="rounded-full bg-joy px-4 py-2 text-primary-foreground shadow-playful transition-transform hover:scale-105"
          >
            Sign in
          </a>
        </nav>

      </header>

      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-24 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-bubblegum" /> Long-distance movie nights
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Press play <span className="text-joy">together</span>, even a thousand miles apart.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Spin up a room, see each other's faces, and keep every stream perfectly in sync — on
            YouTube, Netflix, Disney+, Apple TV+ and Prime Video.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {ROOM_KINDS.map((option) => {
              const active = kind === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setKind(option.id)}
                  className={`flex w-56 flex-col items-start gap-1 rounded-3xl border-2 p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-card shadow-playful"
                      : "border-transparent bg-card/70 hover:border-border"
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="font-display text-base font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.blurb}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" className="rounded-full px-7 text-base" onClick={createRoom}>
              <Clapperboard className="mr-1 h-5 w-5" /> Create a Room
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-sm">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                placeholder="ROOM CODE"
                maxLength={8}
                className="h-9 w-36 border-0 bg-transparent px-0 font-display text-base tracking-[0.25em] shadow-none focus-visible:ring-0"
              />
              <Button variant="secondary" className="rounded-full" onClick={joinRoom}>
                Join
              </Button>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-electric" /> Live video chat
            </span>
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-bubblegum" /> Picture-in-Picture
            </span>
            <span className="flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-sunshine" /> 5 streaming services
            </span>
          </div>
        </div>

        <div className="float-soft relative min-w-0">
          <div className="rounded-[2.5rem] border border-border bg-card p-4 shadow-playful">
            <div className="flex items-center gap-1.5 px-2 pb-3">
              <span className="h-3 w-3 rounded-full bg-bubblegum" />
              <span className="h-3 w-3 rounded-full bg-sunshine" />
              <span className="h-3 w-3 rounded-full bg-mint" />
            </div>
            <div className="grid grid-cols-[1.6fr_1fr] gap-3">
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-joy text-center">
                <span className="font-display text-lg font-semibold text-primary-foreground">
                  Lights, camera…
                  <br />
                  sync!
                </span>
              </div>
              <div className="grid gap-3">
                {["Mia", "Theo", "Ava"].map((n, i) => (
                  <div
                    key={n}
                    className="flex aspect-video items-center justify-center rounded-2xl text-sm font-bold text-primary-foreground"
                    style={{
                      backgroundColor: ["var(--electric)", "var(--bubblegum)", "var(--mint)"][i],
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3 text-xs font-semibold text-secondary-foreground">
              <span>Netflix · Sync active</span>
              <span>00:42:18</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
