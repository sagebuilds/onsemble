import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Popcorn, RefreshCw, Video as VideoIcon, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CallEntry = {
  videoDeviceId: string | null;
  audioDeviceId: string | null;
  startMuted: boolean;
  startCameraOff: boolean;
};

type Props = {
  roomLabel: string;
  code: string;
  displayName: string;
  onJoin: (entry: CallEntry) => void;
  onCancel: () => void;
};

type Status = "requesting" | "ready" | "denied" | "missing";

const STORE_KEY = "onsemble.devicePrefs";

type StoredPrefs = { videoDeviceId?: string; audioDeviceId?: string };

function readPrefs(): StoredPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}

function writePrefs(prefs: StoredPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — remembering devices is best effort */
  }
}

export function DeviceLobby({ roomLabel, code, displayName, onJoin, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>("requesting");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState<string>("");
  const [audioDeviceId, setAudioDeviceId] = useState<string>("");
  const [startMuted, setStartMuted] = useState(false);
  const [startCameraOff, setStartCameraOff] = useState(false);
  const [level, setLevel] = useState(0);

  const openPreviewRef = useRef<(video: string, audio: string) => Promise<void>>(
    async () => undefined,
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openPreview = useCallback(
    async (video: string, audio: string) => {
      setStatus((prev) => (prev === "ready" ? prev : "requesting"));
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? { deviceId: { exact: video } } : true,
          audio: audio ? { deviceId: { exact: audio } } : true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("ready");
        setErrorDetail(null);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setCameras(cams);
        setMics(inputs);

        const activeVideo = stream.getVideoTracks()[0]?.getSettings().deviceId;
        const activeAudio = stream.getAudioTracks()[0]?.getSettings().deviceId;
        if (activeVideo) setVideoDeviceId(activeVideo);
        if (activeAudio) setAudioDeviceId(activeAudio);
        writePrefs({ videoDeviceId: activeVideo ?? "", audioDeviceId: activeAudio ?? "" });
        return;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotFoundError" || name === "OverconstrainedError") {
          /* A remembered device is gone — fall back to the system defaults. */
          if (video || audio) {
            setVideoDeviceId("");
            setAudioDeviceId("");
            await openPreviewRef.current("", "");
            return;
          }
          setStatus("missing");
          setErrorDetail("We couldn't find that camera or microphone.");
        } else if (name === "NotReadableError") {
          setStatus("denied");
          setErrorDetail("Another app is already using your camera. Close it and try again.");
        } else {
          setStatus("denied");
          setErrorDetail("Your browser blocked access to the camera and microphone.");
        }
      }
    },
    [stop],
  );

  openPreviewRef.current = openPreview;

  useEffect(() => {
    const saved = readPrefs();
    void openPreview(saved.videoDeviceId ?? "", saved.audioDeviceId ?? "");
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Live microphone level so people can check they're being heard. */
  useEffect(() => {
    if (status !== "ready" || !streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (!track) return;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(startMuted ? 0 : Math.min(1, peak / 60));
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void ctx.close();
    };
  }, [status, videoDeviceId, audioDeviceId, startMuted]);

  /* Preview the camera on/off toggle. */
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !startCameraOff));
  }, [startCameraOff]);

  const join = () => {
    writePrefs({ videoDeviceId, audioDeviceId });
    stop();
    onJoin({
      videoDeviceId: videoDeviceId || null,
      audioDeviceId: audioDeviceId || null,
      startMuted,
      startCameraOff,
    });
  };

  const label = (device: MediaDeviceInfo, fallback: string, index: number) =>
    device.label || `${fallback} ${index + 1}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-theater px-6 py-12">
      <div className="w-full max-w-4xl rounded-3xl border border-border bg-card/60 p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Popcorn className="h-4.5 w-4.5 text-primary" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold leading-none">
              Ready to join {roomLabel}?
            </h1>
            <p className="mt-1 text-xs tracking-[0.3em] text-muted-foreground">{code}</p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-[1.3fr_1fr] gap-7">
          <div>
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${startCameraOff ? "opacity-0" : ""}`}
              />
              {(startCameraOff || status !== "ready") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  {status === "requesting" ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Asking for camera and microphone access…
                    </>
                  ) : status === "ready" ? (
                    <>
                      <VideoOff className="h-5 w-5" />
                      Your camera is off
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-5 w-5" />
                      No camera preview
                    </>
                  )}
                </div>
              )}
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                {displayName}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-100"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">Mic level</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {errorDetail && (
              <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive-foreground">
                {errorDetail} You can still join and watch — turn your camera on later from the
                browser's address bar.
              </p>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Camera
              </p>
              <Select
                value={videoDeviceId}
                onValueChange={(value) => {
                  setVideoDeviceId(value);
                  void openPreview(value, audioDeviceId);
                }}
                disabled={cameras.length === 0}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="No camera found" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((d, i) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {label(d, "Camera", i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Microphone
              </p>
              <Select
                value={audioDeviceId}
                onValueChange={(value) => {
                  setAudioDeviceId(value);
                  void openPreview(videoDeviceId, value);
                }}
                disabled={mics.length === 0}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="No microphone found" />
                </SelectTrigger>
                <SelectContent>
                  {mics.map((d, i) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {label(d, "Microphone", i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={startMuted ? "destructive" : "secondary"}
                className="rounded-full"
                onClick={() => setStartMuted((v) => !v)}
              >
                {startMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {startMuted ? "Muted" : "Mic on"}
              </Button>
              <Button
                variant={startCameraOff ? "destructive" : "secondary"}
                className="rounded-full"
                onClick={() => setStartCameraOff((v) => !v)}
              >
                {startCameraOff ? (
                  <VideoOff className="h-4 w-4" />
                ) : (
                  <VideoIcon className="h-4 w-4" />
                )}
                {startCameraOff ? "Camera off" : "Camera on"}
              </Button>
            </div>

            <div className="mt-auto space-y-2">
              <Button className="w-full rounded-full shadow-neon" onClick={join}>
                Join room
              </Button>
              {status !== "ready" && (
                <Button
                  variant="secondary"
                  className="w-full rounded-full"
                  onClick={() => void openPreview(videoDeviceId, audioDeviceId)}
                >
                  <RefreshCw className="mr-1 h-4 w-4" /> Try again
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full rounded-full text-muted-foreground"
                onClick={() => {
                  stop();
                  onCancel();
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
