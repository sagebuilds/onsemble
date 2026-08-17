import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Copy,
  LogOut,
  Mic,
  MicOff,
  PictureInPicture2,
  Popcorn,
  Radio,
  Video as VideoIcon,
  VideoOff,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VideoTile } from "@/components/VideoTile";
import { STREAMING_SERVICES, type RoomKind } from "@/lib/room";

export const Route = createFileRoute("/room/$code")({
  validateSearch: (search: Record<string, unknown>): { kind: RoomKind } => ({
    kind: search.kind === "date" ? "date" : "friendship",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Onsemble Theater` },
      {
        name: "description",
        content:
          "You're in an Onsemble theater room: dimmed lights, live video chat and synced streaming playback.",
      },
      { property: "og:title", content: `Onsemble Room ${params.code}` },
      {
        property: "og:description",
        content: "Join the room, turn on your camera and watch in perfect sync.",
      },
    ],
  }),
  component: Room,
});

const FRIENDS = [
  { name: "Mia", hue: "var(--bubblegum)" },
  { name: "Theo", hue: "var(--electric)" },
  { name: "Ava", hue: "var(--mint)" },
];

function Room() {
  const { code } = Route.useParams();
  const { kind } = Route.useSearch();
  const navigate = useNavigate();

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [dimming, setDimming] = useState(true);
  const [friendsJoined, setFriendsJoined] = useState(0);
  const [service, setService] = useState<string | null>(null);
  const [syncActive, setSyncActive] = useState(false);

  const peers = kind === "date" ? FRIENDS.slice(0, 1) : FRIENDS;

  /* Dim the lights: switch the whole app to theater mode. */
  useEffect(() => {
    document.documentElement.classList.add("dark");
    const t = setTimeout(() => setDimming(false), 1400);
    return () => {
      document.documentElement.classList.remove("dark");
      clearTimeout(t);
    };
  }, []);

  /* Local camera feed (mock WebRTC leg). */
  useEffect(() => {
    let active = true;
    let local: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        local = s;
        setStream(s);
        if (selfVideoRef.current) selfVideoRef.current.srcObject = s;
      })
      .catch(() => toast("Camera unavailable — showing your avatar instead."));
    return () => {
      active = false;
      local?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (selfVideoRef.current && stream) selfVideoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOff));
  }, [cameraOff, stream]);

  /* Simulated presence + extension detection. */
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setFriendsJoined(1);
        toast.success(`${peers[0].name} connected`);
      }, 2600),
      setTimeout(() => {
        if (peers.length > 1) setFriendsJoined(peers.length);
      }, 4800),
      setTimeout(() => {
        const picked = STREAMING_SERVICES[Math.floor(Math.random() * STREAMING_SERVICES.length)];
        setService(picked);
        setSyncActive(true);
        toast.success(`${picked} detected — sync active`);
      }, 6400),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popOut = async () => {
    const el = selfVideoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
        toast.success("Video chat is floating — go open Netflix in a new tab.");
      }
    } catch {
      toast.error("Picture-in-Picture needs an active camera feed.");
    }
  };

  const copyLink = () => {
    navigator.clipboard
      ?.writeText(`${window.location.origin}/room/${code}?kind=${kind}`)
      .then(() => toast.success("Room link copied!"))
      .catch(() => toast.error("Couldn't copy the link."));
  };

  return (
    <main className="relative min-h-screen bg-theater">
      {dimming && <div className="dim-overlay" />}

      <header className="mx-auto flex w-full max-w-[110rem] items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Popcorn className="h-4.5 w-4.5 text-primary" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold leading-none">
              {kind === "date" ? "Date Room" : "Friendship Room"}
            </p>
            <p className="mt-1 text-xs tracking-[0.3em] text-muted-foreground">{code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill
            icon={<Wifi className="h-3.5 w-3.5" />}
            label={
              friendsJoined === 0
                ? "Waiting for friends…"
                : `${friendsJoined} friend${friendsJoined > 1 ? "s" : ""} connected`
            }
            active={friendsJoined > 0}
          />
          <StatusPill
            icon={<Radio className="h-3.5 w-3.5" />}
            label={syncActive ? `Sync active · ${service}` : "Sync standby"}
            active={syncActive}
          />
          <Button variant="secondary" className="rounded-full" onClick={copyLink}>
            <Copy className="mr-1 h-4 w-4" /> Invite
          </Button>
          <Button
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={() => navigate({ to: "/" })}
          >
            <LogOut className="mr-1 h-4 w-4" /> Leave
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[110rem] grid-cols-[1fr_20rem] gap-6 px-8 pb-10">
        <div className="flex min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-border bg-card/60">
          <div className="flex flex-1 items-center justify-center p-10">
            {syncActive ? (
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 shadow-neon">
                  <Radio className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mt-6 font-display text-3xl font-semibold">{service}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Playback is mirrored for everyone in the room. Keep this tab open and control the
                  movie from your streaming tab — the Onsemble extension relays every play, pause
                  and seek.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto h-1.5 w-40 animate-pulse rounded-full bg-primary/40" />
                <h2 className="mt-6 font-display text-3xl font-semibold">
                  Waiting for stream sync…
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Open YouTube, Netflix, Disney+, Apple TV+ or Prime Video in another tab. The
                  Onsemble extension will detect the player and lock everyone to the same timecode.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <div className="flex items-center gap-2">
              {STREAMING_SERVICES.map((s) => (
                <span
                  key={s}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    service === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
            <Link to="/extension" className="text-xs font-semibold text-primary hover:underline">
              Get the extension →
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-3xl border border-border bg-card/60 p-4">
          <p className="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Video chat
          </p>

          <VideoTile
            ref={selfVideoRef}
            name="You"
            isSelf
            muted={muted}
            cameraOff={cameraOff}
            stream={stream}
            speaking={!muted}
          />

          {peers.map((p, i) => (
            <VideoTile
              key={p.name}
              name={p.name}
              hue={p.hue}
              cameraOff
              muted={i >= friendsJoined}
              className={i < friendsJoined ? "opacity-100" : "opacity-40"}
            />
          ))}

          <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
            <Button
              variant={muted ? "destructive" : "secondary"}
              className="rounded-full"
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button
              variant={cameraOff ? "destructive" : "secondary"}
              className="rounded-full"
              onClick={() => setCameraOff((c) => !c)}
            >
              {cameraOff ? <VideoOff className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
              {cameraOff ? "Start" : "Stop"}
            </Button>
          </div>

          <Button className="rounded-full shadow-neon" onClick={popOut}>
            <PictureInPicture2 className="mr-1 h-4 w-4" /> Pop-Out Video
          </Button>
        </aside>
      </section>
    </main>
  );
}

function StatusPill({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
