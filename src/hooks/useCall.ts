import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getIceServers } from "@/lib/ice.functions";
import { issueModerationToken, verifyModerationToken } from "@/lib/moderation.functions";

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export type CallPeer = {
  id: string;
  name: string;
  muted: boolean;
  cameraOff: boolean;
  camera: MediaStream | null;
  screen: MediaStream | null;
  connected: boolean;
  /* moderation */
  verified: boolean;
  userId: string | null;
  /* diagnostics */
  connectionState: RTCPeerConnectionState | "new";
  iceState: RTCIceConnectionState | "new";
  route: "direct" | "relayed" | null;
  relayRetried: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
};

type Meta = {
  name: string;
  muted: boolean;
  cameraOff: boolean;
  screenId: string | null;
  verified: boolean;
  userId: string | null;
  locked: boolean;
  /* Server-signed proof that this participant is a signed-in member. */
  modToken: string | null;
};

type ModerationPayload = {
  from: string;
  action: "remove";
  targetId: string;
  reason: "removed" | "locked";
  token: string | null;
};


type PeerConn = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  streams: Map<string, MediaStream>;
  connected: boolean;
  route: "direct" | "relayed" | null;
  /* Candidates that arrived before the remote description was applied. */
  pendingCandidates: RTCIceCandidateInit[];
  createdAt: number;
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

export type CallIdentity = { userId: string | null; verified: boolean };

export function useCall(
  roomKey: string,
  displayName: string,
  devices: CallDevices = {},
  identity: CallIdentity = { userId: null, verified: false },
) {
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
    verified: identity.verified,
    userId: identity.userId,
    locked: false,
    modToken: null,
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
  const [locked, setLockedState] = useState(false);
  const [removedNotice, setRemovedNotice] = useState<"removed" | "locked" | null>(null);

  const iceRef = useRef<RTCConfiguration>(DEFAULT_ICE);
  const relayOnlyRef = useRef(new Set<string>());
  const relayAvailableRef = useRef(false);
  /* Moderation bookkeeping: who was already in the room when it was locked,
     and who a verified member has thrown out. */
  const admittedRef = useRef(new Set<string>());
  const removedIdsRef = useRef(new Set<string>());
  const removedUsersRef = useRef(new Set<string>());
  const lockedRef = useRef(false);
  const removedSelfRef = useRef(false);
  /* Our own server-signed moderation token, and cached verdicts for peers. */
  const modTokenRef = useRef<string | null>(null);
  const trustedRef = useRef(new Map<string, boolean>());

  /* A peer only counts as a member once the SERVER confirms their token:
     presence payloads are written by the peer's own browser and can lie. */
  const checkToken = useCallback(
    async (peerId: string, token: string | null | undefined): Promise<boolean> => {
      if (!token) return false;
      const cacheKey = `${peerId}|${token}`;
      const cached = trustedRef.current.get(cacheKey);
      if (cached !== undefined) return cached;
      try {
        const result = await verifyModerationToken({ data: { token, roomKey, peerId } });
        trustedRef.current.set(cacheKey, result.valid);
        return result.valid;
      } catch {
        return false;
      }
    },
    [roomKey],
  );
  const checkTokenRef = useRef(checkToken);
  checkTokenRef.current = checkToken;


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
        verified: meta.verified,
        userId: meta.userId,
        connectionState: conn?.pc.connectionState ?? "new",
        iceState: conn?.pc.iceConnectionState ?? "new",
        route: conn?.route ?? null,
        relayRetried: relayOnlyRef.current.has(id),
        hasAudio: !!camera?.getAudioTracks().length,
        hasVideo: !!camera?.getVideoTracks().length,
      });
    }
    setPeers(list);
  }, [myId]);


  const signal = useCallback((payload: SignalPayload) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const moderate = useCallback((payload: ModerationPayload) => {
    channelRef.current?.send({ type: "broadcast", event: "moderation", payload });
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
        route: null,
        pendingCandidates: [],
        createdAt: Date.now(),
      };
      peersRef.current.set(remoteId, entry);
      pc.oniceconnectionstatechange = () => syncPeers();

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
      // Pick up relay (TURN) credentials before any peer connection is created.
      try {
        const config = await getIceServers();
        if (!cancelled && config?.iceServers?.length) {
          iceRef.current = { iceServers: config.iceServers };
          relayAvailableRef.current = config.hasRelay;
          setRelayAvailable(config.hasRelay);
        }
      } catch {
        /* fall back to the default STUN-only configuration */
      }
      if (cancelled) return;

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

      const teardownSelf = (reason: "removed" | "locked") => {
        if (removedSelfRef.current) return;
        removedSelfRef.current = true;
        for (const id of [...peersRef.current.keys()]) dropPeer(id);
        metaRef.current.clear();
        const ch = channelRef.current;
        channelRef.current = null;
        if (ch) void supabase.removeChannel(ch);
        localRef.current?.getTracks().forEach((t) => t.stop());
        localRef.current = null;
        setLocalStream(null);
        screenRef.current?.getTracks().forEach((t) => t.stop());
        screenRef.current = null;
        setScreenStream(null);
        setJoined(false);
        setRemovedNotice(reason);
      };

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Meta & { id: string }>();
        const present = new Set(Object.keys(state));
        let anyoneLocked = false;
        for (const [id, entries] of Object.entries(state)) {
          const meta = entries[0];
          if (!meta) continue;
          // Trust the server's verdict on this peer's token, never their own flag.
          const token = meta.modToken ?? null;
          const cached = token ? trustedRef.current.get(`${id}|${token}`) : false;
          const trusted = id === myId ? selfMetaRef.current.verified : cached === true;
          if (token && cached === undefined) {
            void checkTokenRef.current(id, token).then((ok) => {
              const current = metaRef.current.get(id);
              if (current) metaRef.current.set(id, { ...current, verified: ok });
              syncPeers();
            });
          }
          if (trusted && meta.locked) anyoneLocked = true;
          metaRef.current.set(id, {
            name: meta.name,
            muted: meta.muted,
            cameraOff: meta.cameraOff,
            screenId: meta.screenId ?? null,
            verified: trusted,
            userId: trusted ? (meta.userId ?? null) : null,
            locked: !!meta.locked,
            modToken: token,
          });

          // Verified members police the room: kick anyone already removed, and
          // anyone arriving after the room was locked.
          if (id !== myId && selfMetaRef.current.verified) {
            const trustedUserId = trusted ? (meta.userId ?? null) : null;
            const banned =
              removedIdsRef.current.has(id) ||
              (trustedUserId ? removedUsersRef.current.has(trustedUserId) : false);
            const lateJoiner = lockedRef.current && !admittedRef.current.has(id);
            if (banned || lateJoiner) {
              moderate({
                from: myId,
                action: "remove",
                targetId: id,
                reason: banned ? "removed" : "locked",
                token: modTokenRef.current,
              });
              dropPeer(id);
              continue;
            }
            if (!lockedRef.current) admittedRef.current.add(id);
          }

          // The peer with the lower id makes the first offer.
          if (id !== myId && myId < id) ensurePeer(id);
        }
        if (anyoneLocked !== lockedRef.current && !selfMetaRef.current.verified) {
          lockedRef.current = anyoneLocked;
        }
        setLockedState(anyoneLocked || selfMetaRef.current.locked);
        for (const id of [...metaRef.current.keys()]) if (!present.has(id)) dropPeer(id);
        syncPeers();
      });

      channel.on("broadcast", { event: "moderation" }, ({ payload }) => {
        const msg = payload as ModerationPayload;
        if (msg.action !== "remove") return;
        void (async () => {
          // The server must confirm the sender's signed token before we act on
          // anything: a "verified" claim in the message itself proves nothing.
          const allowed = await checkTokenRef.current(msg.from, msg.token);
          if (!allowed) return;
          if (msg.targetId === myId) {
            teardownSelf(msg.reason);
            return;
          }
          removedIdsRef.current.add(msg.targetId);
          const targetMeta = metaRef.current.get(msg.targetId);
          if (targetMeta?.userId) removedUsersRef.current.add(targetMeta.userId);
          dropPeer(msg.targetId);
        })();
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
            // Candidates that raced ahead of the description can now be applied.
            const queued = entry.pendingCandidates.splice(0);
            for (const candidate of queued) {
              try {
                await pc.addIceCandidate(candidate);
              } catch {
                /* stale candidate */
              }
            }
            if (msg.description.type === "offer") {
              await pc.setLocalDescription();
              if (pc.localDescription)
                signal({ from: myId, to: msg.from, description: pc.localDescription.toJSON() });
            }
          } else if (msg.candidate) {
            if (!pc.remoteDescription) {
              entry.pendingCandidates.push(msg.candidate);
            } else {
              await pc.addIceCandidate(msg.candidate);
            }
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

  /* Work out whether each connection is direct or going through a relay. */
  useEffect(() => {
    const timer = setInterval(() => {
      void (async () => {
        let changed = false;
        for (const entry of peersRef.current.values()) {
          if (entry.pc.connectionState !== "connected") continue;
          try {
            const stats = await entry.pc.getStats();
            let route: "direct" | "relayed" | null = null;
            stats.forEach((report) => {
              if (report.type === "candidate-pair" && report["state"] === "succeeded") {
                const local = stats.get(report["localCandidateId"]);
                const remote = stats.get(report["remoteCandidateId"]);
                route =
                  local?.candidateType === "relay" || remote?.candidateType === "relay"
                    ? "relayed"
                    : "direct";
              }
            });
            if (route && route !== entry.route) {
              entry.route = route;
              changed = true;
              if (route === "relayed") setUsingRelay(true);
            }
          } catch {
            /* stats are best-effort */
          }
        }
        if (changed) syncPeers();
      })();
    }, 3000);
    return () => clearInterval(timer);
  }, [syncPeers]);

  /* Watchdog: if an offer or answer went missing, rebuild the connection. */
  useEffect(() => {
    const timer = setInterval(() => {
      for (const id of metaRef.current.keys()) {
        if (id === myId) continue;
        const entry = peersRef.current.get(id);
        if (!entry) {
          // We never started this connection (missed presence event).
          if (myId < id) ensurePeerRef.current?.(id);
          continue;
        }
        if (entry.connected) continue;
        const stale = Date.now() - entry.createdAt > 12000;
        const dead =
          entry.pc.connectionState === "failed" || entry.pc.iceConnectionState === "failed";
        if (!stale && !dead) continue;
        entry.pc.onicecandidate = null;
        entry.pc.ontrack = null;
        entry.pc.onnegotiationneeded = null;
        entry.pc.onconnectionstatechange = null;
        entry.pc.close();
        peersRef.current.delete(id);
        if (myId < id) ensurePeerRef.current?.(id);
      }
      syncPeers();
    }, 6000);
    return () => clearInterval(timer);
  }, [myId, syncPeers]);

  /* Keep the name we advertise in sync. */
  useEffect(() => {
    selfMetaRef.current = { ...selfMetaRef.current, name: displayName };
    if (joined) pushMeta();
  }, [displayName, joined, pushMeta]);

  /* Keep our signed-in status in sync (the profile may load after we join). */
  useEffect(() => {
    selfMetaRef.current = {
      ...selfMetaRef.current,
      verified: identity.verified,
      userId: identity.userId,
    };
    if (joined) pushMeta();
  }, [identity.verified, identity.userId, joined, pushMeta]);

  /* Ask the server for a signed token proving we really are a signed-in
     member; other participants check it before accepting our moderation. */
  useEffect(() => {
    if (!identity.verified) {
      modTokenRef.current = null;
      selfMetaRef.current = { ...selfMetaRef.current, modToken: null };
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { token } = await issueModerationToken({ data: { roomKey, peerId: myId } });
        if (cancelled) return;
        modTokenRef.current = token;
        selfMetaRef.current = { ...selfMetaRef.current, modToken: token };
        if (joined) pushMeta();
      } catch {
        /* without a token we simply cannot moderate */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity.verified, identity.userId, joined, myId, pushMeta, roomKey]);

  /* Signed-in members can throw a guest out of the room. */
  const removeParticipant = useCallback(
    (targetId: string) => {
      if (!selfMetaRef.current.verified || !modTokenRef.current) return;
      const targetMeta = metaRef.current.get(targetId);
      removedIdsRef.current.add(targetId);
      if (targetMeta?.userId) removedUsersRef.current.add(targetMeta.userId);
      moderate({
        from: myId,
        action: "remove",
        targetId,
        reason: "removed",
        token: modTokenRef.current,
      });
      dropPeer(targetId);
    },
    [dropPeer, moderate, myId],
  );

  /* Signed-in members can lock the room so nobody new can join. */
  const setRoomLocked = useCallback(
    (next: boolean) => {
      if (!selfMetaRef.current.verified) return;
      lockedRef.current = next;
      if (next) {
        admittedRef.current = new Set(metaRef.current.keys());
      }
      selfMetaRef.current = { ...selfMetaRef.current, locked: next };
      setLockedState(next);
      pushMeta();
    },
    [pushMeta],
  );


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
    relayAvailable,
    usingRelay,
    locked,
    setRoomLocked,
    removeParticipant,
    removedNotice,
    canModerate: identity.verified,
    iceServerCount: iceRef.current.iceServers?.length ?? 0,

  };
}
