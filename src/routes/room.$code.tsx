import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  LayoutGrid,
  Maximize2,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PictureInPicture2,
  Popcorn,
  Radio,
  ScreenShare,
  Video as VideoIcon,
  VideoOff,
  Wifi,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VideoTile } from "@/components/VideoTile";
import { useCall } from "@/hooks/useCall";
import { useActiveSpeaker } from "@/hooks/useActiveSpeaker";
import { useSync } from "@/hooks/useSync";
import { DeviceLobby, type CallEntry } from "@/components/DeviceLobby";
import { CallDiagnostics } from "@/components/CallDiagnostics";
import { useProfile } from "@/lib/data";
import { STREAMING_SERVICES, type RoomKind } from "@/lib/room";

export const Route = createFileRoute("/room/$code")({
  validateSearch: (search: Record<string, unknown>): { kind: RoomKind } => ({
    kind: search["kind"] === "date" ? "date" : "friendship",
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Room,
});

const HUES = ["var(--bubblegum)", "var(--electric)", "var(--mint)", "var(--sunbeam)"];

function Room() {
  const { code } = Route.useParams();
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [entry, setEntry] = useState<CallEntry | null>(null);

  /* Dim the lights as soon as we reach the room. */
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  if (!entry) {
    return (
      <DeviceLobby
        roomLabel={kind === "date" ? "the Date Room" : "the Friendship Room"}
        code={code}
        displayName={profile?.display_name ?? "You"}
        onJoin={setEntry}
        onCancel={() => navigate({ to: "/" })}
      />
    );
  }

  return <Theater entry={entry} />;
}

function Theater({ entry }: { entry: CallEntry }) {
  const { code } = Route.useParams();
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const stageScreenRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [dimming, setDimming] = useState(true);
  const [manualService, setManualService] = useState<string | null>(null);
  const [layout, setLayout] = useState<"speaker" | "grid">("speaker");
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const {
    localStream,
    screenStream,
    peers,
    joined,
    mediaError,
    muted,
    cameraOff,
    toggleMic,
    toggleCamera,
    startShare,
    stopShare,
    usingRelay,
    relayAvailable,
  } = useCall(`${code}:${kind}`, profile?.display_name ?? "Guest", entry);

  const {
    extensionInstalled,
    service: detectedService,
    lastEvent,
    syncActive,
  } = useSync(`${code}:${kind}`, code);
  const service = detectedService ?? manualService;

  const remoteScreen = peers.find((p) => p.screen)?.screen ?? null;
  const remoteSharer = peers.find((p) => p.screen)?.name ?? null;
  const stageStream = screenStream ?? remoteScreen;

  /* Everyone on the call, self first, for the grid / speaker layouts. */
  const participants = useMemo(
    () => [
      {
        id: "self",
        name: profile?.display_name ?? "You",
        isSelf: true,
        hue: "var(--electric)",
        stream: localStream,
        muted,
        cameraOff,
        connected: true,
      },
      ...peers.map((peer, i) => ({
        id: peer.id,
        name: peer.name,
        isSelf: false,
        hue: HUES[i % HUES.length] ?? "var(--electric)",
        stream: peer.camera,
        muted: peer.muted,
        cameraOff: peer.cameraOff || !peer.camera,
        connected: peer.connected,
      })),
    ],
    [peers, localStream, muted, cameraOff, profile?.display_name],
  );

  const speakerSources = useMemo(
    () => participants.map((p) => ({ id: p.id, stream: p.stream, muted: p.muted })),
    [participants],
  );
  const activeSpeakerId = useActiveSpeaker(speakerSources);

  /* Drop a pin if that person leaves the room. */
  useEffect(() => {
    if (pinnedId && !participants.some((p) => p.id === pinnedId)) setPinnedId(null);
  }, [participants, pinnedId]);

  const featured =
    participants.find((p) => p.id === pinnedId) ??
    participants.find((p) => p.id === activeSpeakerId) ??
    participants.find((p) => !p.isSelf) ??
    participants[0];
  const others = participants.filter((p) => p.id !== featured?.id);
  const togglePin = (id: string) => setPinnedId((cur) => (cur === id ? null : id));
  const showPeopleOnStage = !!pinnedId || (!stageStream && participants.length > 1);

  /* Dim the lights: switch the whole app to theater mode. */
  useEffect(() => {
    document.documentElement.classList.add("dark");
    const t = setTimeout(() => setDimming(false), 1400);
    return () => {
      document.documentElement.classList.remove("dark");
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (mediaError) toast(`${mediaError} You'll still see everyone else.`);
  }, [mediaError]);

  useEffect(() => {
    if (stageScreenRef.current) stageScreenRef.current.srcObject = stageStream;
  }, [stageStream]);

  useEffect(() => {
    if (screenVideoRef.current) screenVideoRef.current.srcObject = screenStream;
  }, [screenStream]);

  const toggleShare = async () => {
    if (screenStream) {
      stopShare();
      toast("You stopped sharing your screen.");
      return;
    }
    try {
      await startShare();
      toast.success("You're sharing your screen — your camera stays on too.");
    } catch {
      toast.error("Screen sharing was cancelled.");
    }
  };

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

      <header className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-8 sm:py-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            icon={<Wifi className="h-3.5 w-3.5" />}
            label={
              !joined
                ? "Connecting…"
                : usingRelay && peers.length > 0
                  ? `${peers.length} friend${peers.length > 1 ? "s" : ""} · relayed`
                  : peers.length === 0
                    ? "Waiting for friends…"
                    : `${peers.length} friend${peers.length > 1 ? "s" : ""} in the room`
            }
            active={peers.length > 0}
          />
          <StatusPill
            icon={<Radio className="h-3.5 w-3.5" />}
            label={
              syncActive
                ? `Sync active · ${service}`
                : extensionInstalled
                  ? "Extension ready — open a show"
                  : "Sync standby"
            }
            active={syncActive}
          />
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
            <button
              type="button"
              onClick={() => setLayout("speaker")}
              aria-pressed={layout === "speaker"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                layout === "speaker" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" /> Speaker
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              aria-pressed={layout === "grid"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                layout === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </button>
          </div>
          {pinnedId && (
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => setPinnedId(null)}
            >
              Unpin
            </Button>
          )}
          <CallDiagnostics
            peers={peers}
            joined={joined}
            mediaError={mediaError}
            relayAvailable={relayAvailable}
            usingRelay={usingRelay}
            extensionInstalled={extensionInstalled}
            localStream={localStream}
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

      <section className="mx-auto grid w-full max-w-[110rem] gap-6 px-4 pb-10 sm:px-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-3xl border border-border bg-card/60 lg:min-h-[34rem]">
          <div className="flex flex-1 items-center justify-center p-4 sm:p-10">
            {showPeopleOnStage ? (
              <div className="w-full">
                {layout === "grid" ? (
                  <div
                    className={`grid gap-4 ${participants.length > 4 ? "grid-cols-3" : participants.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    {participants.map((p) => (
                      <VideoTile
                        key={p.id}
                        name={p.name}
                        isSelf={p.isSelf}
                        hue={p.hue}
                        muted={p.muted}
                        cameraOff={p.cameraOff}
                        stream={p.stream}
                        speaking={!p.muted && activeSpeakerId === p.id}
                        pinned={pinnedId === p.id}
                        onTogglePin={() => togglePin(p.id)}
                        className={p.connected ? "opacity-100" : "opacity-60"}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {featured && (
                      <VideoTile
                        key={featured.id}
                        name={featured.name}
                        isSelf={featured.isSelf}
                        hue={featured.hue}
                        muted={featured.muted}
                        cameraOff={featured.cameraOff}
                        stream={featured.stream}
                        speaking={!featured.muted && activeSpeakerId === featured.id}
                        pinned={pinnedId === featured.id}
                        onTogglePin={() => togglePin(featured.id)}
                      />
                    )}
                    {others.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {others.map((p) => (
                          <VideoTile
                            key={p.id}
                            name={p.name}
                            isSelf={p.isSelf}
                            hue={p.hue}
                            muted={p.muted}
                            cameraOff={p.cameraOff}
                            stream={p.stream}
                            speaking={!p.muted && activeSpeakerId === p.id}
                            pinned={pinnedId === p.id}
                            onTogglePin={() => togglePin(p.id)}
                            className="w-48 shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {pinnedId
                    ? `Pinned ${featured?.name}${stageStream ? " — unpin to go back to the shared screen." : "."}`
                    : layout === "grid"
                      ? "Everyone at equal size."
                      : "Whoever is talking takes the big frame."}
                </p>
              </div>
            ) : stageStream ? (
              <div className="w-full">
                <video
                  ref={stageScreenRef}
                  autoPlay
                  playsInline
                  muted={!!screenStream}
                  className="w-full rounded-2xl border border-primary/30 bg-black shadow-neon"
                />
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {screenStream
                    ? "You're sharing your screen with the room."
                    : `${remoteSharer ?? "A friend"} is sharing their screen.`}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto h-1.5 w-40 animate-pulse rounded-full bg-primary/40" />
                <h2 className="mt-6 font-display text-3xl font-semibold">
                  {syncActive
                    ? `Playing in sync on ${service}`
                    : extensionInstalled
                      ? "Waiting for a show…"
                      : "Add the Onsemble extension to sync"}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {syncActive
                    ? lastEvent
                      ? `Last move: ${lastEvent.action} at ${formatTime(lastEvent.currentTime)}. Keep this tab open — play, pause and seek stay matched for everyone.`
                      : "Keep this tab open — play, pause and seek stay matched for everyone."
                    : extensionInstalled
                      ? "Open YouTube, Netflix, Disney+, Apple TV+ or Prime Video in another tab and press play — everyone here follows along."
                      : "Install the extension and keep this tab open, then play something in another tab and the whole room stays in step. You can also just share your screen."}
                </p>
                {!extensionInstalled && (
                  <Link
                    to="/extension"
                    className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Get the extension
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              {STREAMING_SERVICES.map((s) => (
                <button
                  key={s}
                  onClick={() => setManualService((cur) => (cur === s ? null : s))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    service === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
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
            name={profile?.display_name ?? "You"}
            isSelf
            muted={muted}
            cameraOff={cameraOff}
            stream={localStream}
            speaking={!muted && activeSpeakerId === "self"}
            pinned={pinnedId === "self"}
            onTogglePin={() => togglePin("self")}
          />

          {screenStream && (
            <div className="overflow-hidden rounded-2xl border border-primary/40 bg-black">
              <video ref={screenVideoRef} autoPlay playsInline muted className="w-full" />
              <p className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary">
                <ScreenShare className="h-3.5 w-3.5" /> Your screen
              </p>
            </div>
          )}

          {peers.map((peer, i) => (
            <div key={peer.id} className="space-y-3">
              <VideoTile
                name={peer.name}
                hue={HUES[i % HUES.length] ?? "var(--electric)"}
                muted={peer.muted}
                cameraOff={peer.cameraOff || !peer.camera}
                stream={peer.camera}
                speaking={!peer.muted && activeSpeakerId === peer.id}
                pinned={pinnedId === peer.id}
                onTogglePin={() => togglePin(peer.id)}
                className={peer.connected ? "opacity-100" : "opacity-60"}
              />
              {peer.screen && <PeerScreen stream={peer.screen} name={peer.name} />}
            </div>
          ))}

          {peers.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Share the room link — friends appear here the moment they join.
            </p>
          )}

          <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
            <Button
              variant={muted ? "destructive" : "secondary"}
              className="rounded-full"
              onClick={toggleMic}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button
              variant={cameraOff ? "destructive" : "secondary"}
              className="rounded-full"
              onClick={toggleCamera}
            >
              {cameraOff ? <VideoOff className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
              {cameraOff ? "Start" : "Stop"}
            </Button>
          </div>

          <Button
            variant={screenStream ? "destructive" : "secondary"}
            className="rounded-full"
            onClick={toggleShare}
          >
            {screenStream ? (
              <MonitorX className="mr-1 h-4 w-4" />
            ) : (
              <MonitorUp className="mr-1 h-4 w-4" />
            )}
            {screenStream ? "Stop sharing" : "Share screen"}
          </Button>

          <Button className="rounded-full shadow-neon" onClick={popOut}>
            <PictureInPicture2 className="mr-1 h-4 w-4" /> Pop-Out Video
          </Button>
        </aside>
      </section>
    </main>
  );
}

function PeerScreen({ stream, name }: { stream: MediaStream; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/40 bg-black">
      <video ref={ref} autoPlay playsInline className="w-full" />
      <p className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary">
        <ScreenShare className="h-3.5 w-3.5" /> {name}'s screen
      </p>
    </div>
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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
