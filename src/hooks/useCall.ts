import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getIceServers } from "@/lib/ice.functions";

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export type CallPeer = {
  id: string;
  name: string;
  muted: boolean;
  cameraOff: boolean;
  camera: MediaStream | null;
  screen: MediaStream | null;
  connected: boolean;
};

type Meta = { name: string; muted: boolean; cameraOff: boolean; screenId: string | null };

type PeerConn = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  streams: Map<string, MediaStream>;
  connected: boolean;
};

type SignalPayload = {
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export type CallDevices = {
  videoDeviceId?: string | null;
  audioDeviceId?: string | null;
  startMuted?: boolean;
  startCameraOff?: boolean;
};

export function useCall(roomKey: string, displayName: string, devices: CallDevices = {}) {
  const devicesRef = useRef(devices);
  const idRef = useRef<string>("");
  if (!idRef.current) idRef.current = newId();
  const myId = idRef.current;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef(new Map<string, PeerConn>());
  const metaRef = useRef(new Map<string, Meta>());
  const localRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const selfMetaRef = useRef<Meta>({
    name: displayName,
    muted: !!devices.startMuted,
    cameraOff: !!devices.startCameraOff,
    screenId: null,
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [joined, setJoined] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [muted, setMuted] = useState(!!devices.startMuted);
  const [cameraOff, setCameraOff] = useState(!!devices.startCameraOff);
  const [relayAvailable, setRelayAvailable] = useState(false);
  const [usingRelay, setUsingRelay] = useState(false);

  const iceRef = useRef<RTCConfiguration>(DEFAULT_ICE);
  const relayOnlyRef = useRef(new Set<string>());

  const syncPeers = useCallback(() => {
    const list: CallPeer[] = [];
    for (const [id, meta] of metaRef.current) {
      if (id === myId) continue;
      const conn = peersRef.current.get(id);
      const streams = conn ? [...conn.streams.values()] : [];
      const screen = meta.screenId ? (streams.find((s) => s.id === meta.screenId) ?? null) : null;
      const camera = streams.find((s) => s.id !== meta.screenId) ?? null;
      list.push({
        id,
        name: meta.name,
        muted: meta.muted,
        cameraOff: meta.cameraOff,
        camera,
        screen,
        connected: conn?.connected ?? false,
      });
    }
    setPeers(list);
  }, [myId]);

  const signal = useCallback((payload: SignalPayload) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const pushMeta = useCallback(() => {
    channelRef.current?.track({ id: myId, ...selfMetaRef.current });
  }, [myId]);

  const ensurePeer = useCallback(
    (remoteId: string): PeerConn => {
      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;

      // Peers that already failed a direct connection are retried through the relay only.
      const relayOnly = relayOnlyRef.current.has(remoteId);
      const pc = new RTCPeerConnection(
        relayOnly ? { ...iceRef.current, iceTransportPolicy: "relay" } : iceRef.current,
      );
      const entry: PeerConn = {
        pc,
        polite: myId > remoteId,
        makingOffer: false,
        ignoreOffer: false,
        streams: new Map(),
        connected: false,
      };
      peersRef.current.set(remoteId, entry);

      for (const track of localRef.current?.getTracks() ?? [])
        pc.addTrack(track, localRef.current!);
      for (const track of screenRef.current?.getTracks() ?? [])
        pc.addTrack(track, screenRef.current!);

      pc.onicecandidate = (e) => {
        if (e.candidate) signal({ from: myId, to: remoteId, candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        entry.streams.set(stream.id, stream);
        syncPeers();
      };
      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription)
            signal({ from: myId, to: remoteId, description: pc.localDescription.toJSON() });
        } catch {
          /* renegotiation retried on next change */
        } finally {
          entry.makingOffer = false;
        }
      };
      pc.onconnectionstatechange = () => {
        entry.connected = pc.connectionState === "connected";
        if (entry.connected && relayOnly) setUsingRelay(true);

        if (pc.connectionState === "failed") {
          const canRelay = relayAvailableRef.current && !relayOnlyRef.current.has(remoteId);
          if (canRelay) {
            // Direct peer-to-peer is blocked on this network — rebuild through TURN.
            relayOnlyRef.current.add(remoteId);
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.onnegotiationneeded = null;
            pc.onconnectionstatechange = null;
            pc.close();
            peersRef.current.delete(remoteId);
            setTimeout(() => {
              if (metaRef.current.has(remoteId)) ensurePeerRef.current?.(remoteId);
            }, 400);
          } else {
            pc.restartIce();
          }
        }
        syncPeers();
      };
      return entry;
    },
    [myId, signal, syncPeers],
  );

  const ensurePeerRef = useRef<((remoteId: string) => PeerConn) | null>(null);
  ensurePeerRef.current = ensurePeer;

  const dropPeer = useCallback(
    (remoteId: string) => {
      const entry = peersRef.current.get(remoteId);
      if (entry) {
        entry.pc.onicecandidate = null;
        entry.pc.ontrack = null;
        entry.pc.onnegotiationneeded = null;
        entry.pc.onconnectionstatechange = null;
        entry.pc.close();
        peersRef.current.delete(remoteId);
      }
      metaRef.current.delete(remoteId);
      syncPeers();
    },
    [syncPeers],
  );

  /* Get the camera + mic, then join the signalling channel. */
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const chosen = devicesRef.current;
        const media = await navigator.mediaDevices.getUserMedia({
          video: chosen.videoDeviceId ? { deviceId: { exact: chosen.videoDeviceId } } : true,
          audio: chosen.audioDeviceId ? { deviceId: { exact: chosen.audioDeviceId } } : true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        // Honour the choices made in the lobby.
        media.getAudioTracks().forEach((t) => (t.enabled = !chosen.startMuted));
        media.getVideoTracks().forEach((t) => (t.enabled = !chosen.startCameraOff));
        localRef.current = media;
        setLocalStream(media);
      } catch {
        if (!cancelled) setMediaError("We couldn't reach your camera or microphone.");
      }
      if (cancelled) return;

      const channel = supabase.channel(`call:${roomKey}`, {
        config: { presence: { key: myId }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Meta & { id: string }>();
        const present = new Set(Object.keys(state));
        for (const [id, entries] of Object.entries(state)) {
          const meta = entries[0];
          if (!meta) continue;
          metaRef.current.set(id, {
            name: meta.name,
            muted: meta.muted,
            cameraOff: meta.cameraOff,
            screenId: meta.screenId ?? null,
          });
          // The peer with the lower id makes the first offer.
          if (id !== myId && myId < id) ensurePeer(id);
        }
        for (const id of [...metaRef.current.keys()]) if (!present.has(id)) dropPeer(id);
        syncPeers();
      });

      channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const msg = payload as SignalPayload;
        if (msg.to !== myId || msg.from === myId) return;
        const entry = ensurePeer(msg.from);
        const { pc } = entry;
        try {
          if (msg.description) {
            const collision =
              msg.description.type === "offer" &&
              (entry.makingOffer || pc.signalingState !== "stable");
            entry.ignoreOffer = !entry.polite && collision;
            if (entry.ignoreOffer) return;
            await pc.setRemoteDescription(msg.description);
            if (msg.description.type === "offer") {
              await pc.setLocalDescription();
              if (pc.localDescription)
                signal({ from: myId, to: msg.from, description: pc.localDescription.toJSON() });
            }
          } else if (msg.candidate) {
            await pc.addIceCandidate(msg.candidate);
          }
        } catch {
          /* ignore out-of-order signalling errors */
        }
      });

      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        setJoined(true);
        await channel.track({ id: myId, ...selfMetaRef.current });
      });
    };

    void start();

    return () => {
      cancelled = true;
      for (const id of [...peersRef.current.keys()]) dropPeer(id);
      metaRef.current.clear();
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      screenRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current = null;
      setJoined(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey]);

  /* Keep the name we advertise in sync. */
  useEffect(() => {
    selfMetaRef.current = { ...selfMetaRef.current, name: displayName };
    if (joined) pushMeta();
  }, [displayName, joined, pushMeta]);

  const toggleMic = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      selfMetaRef.current = { ...selfMetaRef.current, muted: next };
      pushMeta();
      return next;
    });
  }, [pushMeta]);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      selfMetaRef.current = { ...selfMetaRef.current, cameraOff: next };
      pushMeta();
      return next;
    });
  }, [pushMeta]);

  const stopShare = useCallback(() => {
    const stream = screenRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.stop();
      for (const { pc } of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track === track);
        if (sender) pc.removeTrack(sender);
      }
    }
    screenRef.current = null;
    setScreenStream(null);
    selfMetaRef.current = { ...selfMetaRef.current, screenId: null };
    pushMeta();
  }, [pushMeta]);

  const startShare = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    screenRef.current = stream;
    setScreenStream(stream);
    for (const track of stream.getTracks())
      for (const { pc } of peersRef.current.values()) pc.addTrack(track, stream);
    stream.getVideoTracks()[0]?.addEventListener("ended", () => stopShare());
    selfMetaRef.current = { ...selfMetaRef.current, screenId: stream.id };
    pushMeta();
  }, [pushMeta, stopShare]);

  return {
    myId,
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
  };
}
