import { useEffect, useMemo, useRef, useState } from "react";

type Source = { id: string; stream: MediaStream | null; muted?: boolean };

/**
 * Watches the audio of everyone in the call and reports whoever is talking.
 * Levels are smoothed so the focus doesn't flicker between people.
 */
export function useActiveSpeaker(sources: Source[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const levelsRef = useRef(new Map<string, number>());

  const key = useMemo(
    () => sources.map((s) => `${s.id}:${s.stream?.id ?? "none"}:${s.muted ? "m" : ""}`).join("|"),
    [sources],
  );

  useEffect(() => {
    const AudioCtx =
      typeof window !== "undefined"
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analysers: { id: string; analyser: AnalyserNode; data: Uint8Array }[] = [];
    const nodes: MediaStreamAudioSourceNode[] = [];

    for (const source of sources) {
      const track = source.stream?.getAudioTracks()[0];
      if (!track || source.muted) continue;
      try {
        const node = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        node.connect(analyser);
        nodes.push(node);
        analysers.push({ id: source.id, analyser, data: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)) });
      } catch {
        /* a track can disappear mid-setup */
      }
    }

    if (analysers.length === 0) {
      setActiveId(null);
      void ctx.close();
      return;
    }

    const timer = setInterval(() => {
      let bestId: string | null = null;
      let bestLevel = 0;

      for (const { id, analyser, data } of analysers) {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        const smoothed = (levelsRef.current.get(id) ?? 0) * 0.6 + (peak / 128) * 0.4;
        levelsRef.current.set(id, smoothed);
        if (smoothed > bestLevel) {
          bestLevel = smoothed;
          bestId = id;
        }
      }

      // Only switch focus for someone clearly speaking.
      if (bestLevel > 0.045) setActiveId(bestId);
    }, 400);

    return () => {
      clearInterval(timer);
      nodes.forEach((n) => n.disconnect());
      void ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}
