import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bridges the Onsemble Chrome extension with the room's realtime channel.
 *
 *   streaming tab -> extension -> this page -> realtime -> friends' pages
 *                                                       -> their extension -> their streaming tab
 */

const PAGE = "onsemble-app";
const EXT = "onsemble-extension";

export type PlaybackEvent = {
  type: "playback";
  action: "play" | "pause" | "seeked";
  currentTime: number;
  service?: string;
  at?: number;
};

type ExtMessage = {
  source?: string;
  type?: string;
  payload?: PlaybackEvent;
  service?: string | null;
  roomCode?: string | null;
  videoDetected?: boolean;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function useSync(roomKey: string, roomCode: string) {
  const idRef = useRef<string>("");
  if (!idRef.current) idRef.current = newId();
  const myId = idRef.current;

  const channelRef = useRef<RealtimeChannel | null>(null);

  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [service, setService] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<PlaybackEvent | null>(null);

  const toExtension = useCallback((message: Record<string, unknown>) => {
    window.postMessage({ source: PAGE, ...message }, window.location.origin);
  }, []);

  /* Listen to the extension bridge running on this page. */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as ExtMessage;
      if (!data || data.source !== EXT) return;

      if (data.type === "INSTALLED" || data.type === "STATUS") {
        setExtensionInstalled(true);
        if (data.service !== undefined) setService(data.service ?? null);
      }
      if (data.type === "VIDEO_DETECTED") {
        setExtensionInstalled(true);
        setService(data.service ?? null);
      }
      if (data.type === "VIDEO_LOST") setService(null);

      // Our own player moved — tell the room.
      if (data.type === "LOCAL_EVENT" && data.payload) {
        setLastEvent(data.payload);
        if (data.payload.service) setService(data.payload.service);
        channelRef.current?.send({
          type: "broadcast",
          event: "playback",
          payload: { ...data.payload, senderId: myId },
        });
      }
    };

    window.addEventListener("message", onMessage);
    toExtension({ type: "STATUS_REQUEST" });
    return () => window.removeEventListener("message", onMessage);
  }, [myId, toExtension]);

  /* Join the room's playback channel. */
  useEffect(() => {
    const channel = supabase.channel(`sync:${roomKey}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "playback" }, ({ payload }) => {
      const event = payload as PlaybackEvent & { senderId?: string };
      if (event.senderId === myId) return;
      setLastEvent(event);
      if (event.service) setService(event.service);
      // Push it into our own streaming tab through the extension.
      toExtension({ type: "REMOTE_EVENT", payload: event });
    });

    channel.subscribe();
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomKey, myId, toExtension]);

  /* Tell the extension which room this tab belongs to. */
  useEffect(() => {
    toExtension({ type: "JOIN", roomCode });
    return () => toExtension({ type: "LEAVE" });
  }, [roomCode, toExtension]);

  return { extensionInstalled, service, lastEvent, syncActive: !!service && extensionInstalled };
}
