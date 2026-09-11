import { AlertTriangle, CheckCircle2, CircleDashed, Stethoscope, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CallPeer } from "@/hooks/useCall";

type Props = {
  peers: CallPeer[];
  joined: boolean;
  mediaError: string | null;
  relayAvailable: boolean;
  usingRelay: boolean;
  extensionInstalled: boolean;
  localStream: MediaStream | null;
};

type Tone = "ok" | "warn" | "bad" | "idle";

type Check = {
  label: string;
  tone: Tone;
  detail: string;
  fix?: string;
};

const ICONS: Record<Tone, React.ReactNode> = {
  ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />,
  warn: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />,
  bad: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />,
  idle: <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />,
};

function buildChecks({
  peers,
  joined,
  mediaError,
  relayAvailable,
  usingRelay,
  extensionInstalled,
  localStream,
}: Props): Check[] {
  const checks: Check[] = [];

  /* 1. Camera and microphone */
  const hasVideo = !!localStream?.getVideoTracks().length;
  const hasAudio = !!localStream?.getAudioTracks().length;
  checks.push(
    mediaError
      ? {
          label: "Camera and microphone",
          tone: "bad",
          detail: mediaError,
          fix: "Click the camera icon in your browser's address bar and allow access, then reload this page. If another app (Zoom, Teams, Photo Booth) has the camera open, close it first.",
        }
      : hasVideo && hasAudio
        ? { label: "Camera and microphone", tone: "ok", detail: "Both are working." }
        : {
            label: "Camera and microphone",
            tone: "warn",
            detail: `${hasVideo ? "Camera" : "Microphone"} only — the other device isn't sending anything.`,
            fix: "Leave and rejoin the room to pick a different device on the setup screen.",
          },
  );

  /* 2. Room connection */
  checks.push(
    joined
      ? { label: "Room connection", tone: "ok", detail: "Connected to the room's signalling channel." }
      : {
          label: "Room connection",
          tone: "bad",
          detail: "Not connected to the room yet.",
          fix: "Check your internet connection and reload the page. On a work network, WebSockets may be blocked by a firewall.",
        },
  );

  /* 3. Per-friend connections */
  if (peers.length === 0) {
    checks.push({
      label: "Friends",
      tone: "idle",
      detail: "Nobody else is in the room yet.",
      fix: "Send them the invite link from the header.",
    });
  }

  for (const peer of peers) {
    if (peer.connectionState === "connected") {
      checks.push({
        label: peer.name,
        tone: peer.hasVideo ? "ok" : "warn",
        detail: peer.hasVideo
          ? `Connected ${peer.route === "relayed" ? "through a relay server" : "directly"}.`
          : `Connected ${peer.route === "relayed" ? "through a relay" : "directly"}, but no video is arriving${peer.cameraOff ? " — their camera is off." : "."}`,
        ...(peer.hasVideo
          ? {}
          : { fix: "Ask them to turn their camera on, or to leave and rejoin the room." }),
      });
    } else if (peer.connectionState === "failed") {
      checks.push({
        label: peer.name,
        tone: "bad",
        detail: relayAvailable
          ? peer.relayRetried
            ? "Connection failed even through the relay server."
            : "Direct connection failed — retrying through the relay server."
          : "Direct connection failed and no relay server is configured.",
        fix: relayAvailable
          ? "Both of you should try a different network (a phone hotspot is a good test). If it keeps failing, a firewall is blocking media traffic on both ends."
          : "This network blocks direct connections between browsers. A relay (TURN) server needs to be added to Onsemble — until then, try a home network or a phone hotspot.",
      });
    } else if (peer.connectionState === "disconnected") {
      checks.push({
        label: peer.name,
        tone: "warn",
        detail: "The connection dropped and is trying to recover.",
        fix: "Usually a brief network blip. If it doesn't come back in about 15 seconds, one of you should rejoin.",
      });
    } else {
      checks.push({
        label: peer.name,
        tone: "idle",
        detail: `Still connecting (${peer.iceState}).`,
        fix: "This normally takes a few seconds. Longer than 30 seconds usually means a firewall is blocking the connection.",
      });
    }
  }

  /* 4. Relay availability */
  checks.push(
    relayAvailable
      ? {
          label: "Relay fallback",
          tone: usingRelay ? "warn" : "ok",
          detail: usingRelay
            ? "In use — your video is going through a relay server, which can add a little delay."
            : "Available if a direct connection fails.",
        }
      : {
          label: "Relay fallback",
          tone: "warn",
          detail: "No relay server is configured.",
          fix: "Calls will fail on strict corporate, hotel and some mobile networks. Adding a relay (TURN) service fixes that for everyone.",
        },
  );

  /* 5. Playback sync extension */
  checks.push(
    extensionInstalled
      ? { label: "Sync extension", tone: "ok", detail: "Installed and talking to this tab." }
      : {
          label: "Sync extension",
          tone: "idle",
          detail: "Not detected — playback won't stay in sync.",
          fix: "Install the Onsemble extension from the Get the extension page, then reload this tab.",
        },
  );

  return checks;
}

export function CallDiagnostics(props: Props) {
  const checks = buildChecks(props);
  const problems = checks.filter((c) => c.tone === "bad").length;
  const warnings = checks.filter((c) => c.tone === "warn").length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={problems > 0 ? "destructive" : "ghost"}
          className="rounded-full text-xs text-muted-foreground"
        >
          <Stethoscope className="mr-1 h-4 w-4" />
          {problems > 0
            ? `${problems} problem${problems > 1 ? "s" : ""}`
            : warnings > 0
              ? "Check connection"
              : "Connection health"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connection health</DialogTitle>
          <DialogDescription>
            {problems > 0
              ? "Something is stopping the call from working. Here's what we found."
              : warnings > 0
                ? "The call is working, but a few things could be better."
                : "Everything looks healthy."}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          {checks.map((check, i) => (
            <li
              key={`${check.label}-${i}`}
              className="flex gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3"
            >
              {ICONS[check.tone]}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{check.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
                {check.fix && <p className="mt-1.5 text-xs text-primary">{check.fix}</p>}
              </div>
            </li>
          ))}
        </ul>

        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => window.location.reload()}
        >
          Reload and reconnect
        </Button>
      </DialogContent>
    </Dialog>
  );
}
