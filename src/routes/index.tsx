import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Globe,
  Heart,
  House,
  Images,
  MonitorPlay,
  MonitorUp,
  NotebookPen,
  Popcorn,
  Sparkles,
  Users,
  Video as VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/SiteFooter";
import { generateRoomCode, ROOM_KINDS, type RoomKind } from "@/lib/room";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onsemble — A shared room for the people you love" },
      {
        name: "description",
        content:
          "A private room for your partner, friends or family: video chat, screen sharing, synced streaming, a shared bookshelf and a photo album you build together.",
      },
      { property: "og:title", content: "Onsemble — A shared room for the people you love" },
      {
        property: "og:description",
        content:
          "Video chat, screen sharing, synced streaming, a shared bookshelf and a private photo album — for friends, lovers and family in different places.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const AUDIENCES = [
  {
    icon: Heart,
    tone: "bg-bubblegum",
    title: "Long-distance partners",
    body: "A date room that's just the two of you: dinner on a shared screen, a book each of you is reading, and an album of every night you've had.",
  },
  {
    icon: Users,
    tone: "bg-electric",
    title: "Friends in different cities",
    body: "Six people, one room, zero coordination. Drop in, talk over the movie, and leave the good stuff on the shelf for whoever shows up next.",
  },
  {
    icon: House,
    tone: "bg-mint",
    title: "Family back home",
    body: "Put a show on for the kids, share the screen with grandma, and keep the photo album somewhere everyone can add to it.",
  },
  {
    icon: Globe,
    tone: "bg-sunshine",
    title: "Anyone in another time zone",
    body: "Your room remembers where you left off — watch history, notes and photos stay put while the rest of you sleeps.",
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    tone: "bg-electric",
    title: "A bookshelf you build together",
    body: "Shelve a book, movie or show for someone with a note about why. 'For you', 'for us', or 'for me' — then mark it finished when you get there.",
  },
  {
    icon: Images,
    tone: "bg-bubblegum",
    title: "A private photo album",
    body: "Upload a stack of photos, caption each one, and file them into albums. Only the people in your room can see them.",
  },
  {
    icon: MonitorUp,
    tone: "bg-mint",
    title: "Screen sharing mid-call",
    body: "Show your screen — the map, the spreadsheet, the hotel booking. It opens as its own tile so everyone can still see your face.",
  },
  {
    icon: MonitorPlay,
    tone: "bg-sunshine",
    title: "Streaming that stays in sync",
    body: "Play, pause and seek together on YouTube, Netflix, Disney+, Apple TV+ and Prime Video with the Onsemble Chrome extension.",
  },
  {
    icon: VideoIcon,
    tone: "bg-primary",
    title: "Video chat that feels like a room",
    body: "Real camera and mic connections with grid and speaker layouts, pin the person you're looking at, and the room dims when the lights go down.",
  },
  {
    icon: Sparkles,
    tone: "bg-accent",
    title: "Rooms that remember you",
    body: "Saved rooms with invitations, watch history and preferences. Lock the door so it's only ever your people inside.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Open your room",
    body: "Pick a Friendship Room or a Date Room and name it. Your room gets its own invite code straight away.",
  },
  {
    n: "02",
    title: "Invite your people",
    body: "Send an email invitation or share the code. There's no member limit — add as many as you like.",
  },
  {
    n: "03",
    title: "Press play together",
    body: "Hop on camera, share a screen, put something on the shelf, and let the room keep everything for next time.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<RoomKind>("friendship");
  const [joinCode, setJoinCode] = useState("");
  const { isAuthenticated, loading: sessionLoading } = useSession();

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
          <a href="#room" className="transition-colors hover:text-foreground">
            What's in a room
          </a>
          <Link to="/extension" className="transition-colors hover:text-foreground">
            Chrome extension
          </Link>
          {sessionLoading ? (
            <span className="h-9 w-24 animate-pulse rounded-full bg-card" aria-hidden />
          ) : isAuthenticated ? (
            <>
              <Link to="/account" className="transition-colors hover:text-foreground">
                Account
              </Link>
              <Link
                to="/home"
                className="rounded-full bg-joy px-4 py-2 text-primary-foreground shadow-playful transition-transform hover:scale-105"
              >
                My rooms
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-joy px-4 py-2 text-primary-foreground shadow-playful transition-transform hover:scale-105"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section
        id="create"
        className="relative mx-auto grid w-full max-w-6xl scroll-mt-24 items-center gap-10 px-4 pb-20 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
      >
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-bubblegum" /> A room of your own, anywhere they are
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Feel <span className="text-joy">close</span>, even a thousand miles apart.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Onsemble is one shared room for the people you love. Talk face to face, share your
            screen, keep every stream in sync, and leave each other books, notes and photos that
            are still there when you come back.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {ROOM_KINDS.map((option) => {
              const active = kind === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setKind(option.id)}
                  className={`flex w-full flex-col items-start gap-1 rounded-3xl border-2 p-4 text-left transition-all sm:w-56 ${
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
                className="h-9 w-28 min-w-0 border-0 bg-transparent px-0 font-display text-base tracking-[0.25em] shadow-none focus-visible:ring-0 sm:w-36"
              />
              <Button variant="secondary" className="rounded-full" onClick={joinRoom}>
                Join
              </Button>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-electric" /> Live video chat
            </span>
            <span className="flex items-center gap-2">
              <MonitorUp className="h-4 w-4 text-mint" /> Screen sharing
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
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3">
              <div className="flex aspect-video min-w-0 flex-col justify-between rounded-2xl bg-joy p-4 text-primary-foreground">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                  Mia's screen
                </span>
                <span className="font-display text-lg font-semibold">
                  The hotel booking,
                  <br />
                  argued over live.
                </span>
              </div>
              <div className="grid min-w-0 gap-3">
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

          <div className="absolute -bottom-10 -left-4 hidden w-60 rotate-[-3deg] rounded-2xl border border-border bg-card p-4 shadow-playful sm:block">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-electric" /> For you
            </p>
            <p className="mt-2 font-display text-sm font-semibold">
              "Chapter three made me think of you."
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              The Left Hand of Darkness · on the shelf
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          For whoever you're missing
        </h2>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          The same room, whatever it's for. Nothing about it assumes you're in the same place.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-playful"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone} text-primary-foreground`}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="room" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything lives in <span className="text-joy">one room</span>
        </h2>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Not six apps and a group chat. Your shelf, your album, your call and your stream sit in
          the same place, with the same people in it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-playful"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone} text-primary-foreground`}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <div className="grid items-center gap-10 rounded-[2.5rem] border border-border bg-card p-6 shadow-playful sm:p-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
              <NotebookPen className="h-3.5 w-3.5 text-bubblegum" /> The bookshelf
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Leave something for them to find
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Recommend a book to your partner with a note about why. Put a film on the shelf for
              the group. Mark something finished, then argue about the ending in the same place.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-electric" />
                Books, movies and shows, shelved for you, for us, or for me
              </li>
              <li className="flex items-start gap-2.5">
                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-bubblegum" />
                A personal note with every suggestion
              </li>
              <li className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sunshine" />
                Suggestions and finished shelves, with ratings when you get there
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: BookOpen,
                tone: "bg-electric",
                title: "The Left Hand of Darkness",
                note: ""Read it before Sunday — chapter three is your whole argument about borders."",
                tag: "Suggestion · For you",
              },
              {
                icon: Clapperboard,
                tone: "bg-bubblegum",
                title: "Pushing Daisies",
                note: ""We said we'd finish this one. You said that. I'm holding you to it."",
                tag: "Suggestion · For us",
              },
              {
                icon: MonitorPlay,
                tone: "bg-mint",
                title: "Chef's Table, S3",
                note: ""Finished. Four stars. The dumpling episode is the one you'll cry at."",
                tag: "Finished · For me",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-3xl bg-secondary p-4"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone} text-primary-foreground`}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {item.tag}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              How a room gets started
            </h2>
            <p className="mt-3 max-w-md text-base text-muted-foreground">
              About a minute, and nobody needs an account to try it.
            </p>
          </div>
          <ol className="grid gap-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="flex gap-4 rounded-3xl border border-border bg-card p-5"
              >
                <span className="font-display text-2xl font-semibold text-joy">{step.n}</span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold">{step.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
        <div className="rounded-[2.5rem] bg-joy px-6 py-12 text-center text-primary-foreground shadow-playful sm:px-12 sm:py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your people are one click away
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base opacity-90">
            Open a room, send the code, and see their faces tonight.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-7 text-base"
              onClick={createRoom}
            >
              <Clapperboard className="mr-1 h-5 w-5" /> Create a Room
            </Button>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/40 px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
            >
              Sign in to your rooms <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
