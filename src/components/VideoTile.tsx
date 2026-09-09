import { Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  isSelf?: boolean;
  muted?: boolean;
  cameraOff?: boolean;
  hue?: string;
  speaking?: boolean;
  stream?: MediaStream | null;
  className?: string;
};

export const VideoTile = forwardRef<HTMLVideoElement, Props>(function VideoTile(
  { name, isSelf, muted, cameraOff, hue = "var(--electric)", speaking, stream, className },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream ?? null)) el.srcObject = stream ?? null;
  }, [stream]);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-card transition-shadow",
        speaking && "shadow-neon",
        className,
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          cameraOff || !stream ? "opacity-0" : "opacity-100",
        )}
      />
      {(cameraOff || !stream) && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `radial-gradient(80% 80% at 50% 30%, color-mix(in oklab, ${hue} 45%, transparent), transparent)`,
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-background"
            style={{ backgroundColor: hue }}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2.5">
        <span className="text-xs font-semibold text-white">
          {name}
          {isSelf ? " (you)" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-white/80">
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {cameraOff ? (
            <VideoOff className="h-3.5 w-3.5" />
          ) : (
            <VideoIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </div>
  );
});
