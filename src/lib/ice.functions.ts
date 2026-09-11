import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the ICE servers the browser should use for a call.
 *
 * STUN alone fails on symmetric NATs (many corporate, hotel and mobile
 * networks). When TURN credentials are configured we hand the browser a relay
 * it can fall back to, so the call still connects.
 *
 * Supported configurations, in order:
 *   1. Metered (METERED_API_KEY + METERED_DOMAIN) — short-lived credentials.
 *   2. Any standard TURN server (TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL).
 *   3. Nothing configured — public STUN only.
 */

const STUN: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export type IceConfig = {
  iceServers: RTCIceServer[];
  hasRelay: boolean;
};

export const getIceServers = createServerFn({ method: "GET" }).handler(
  async (): Promise<IceConfig> => {
    const meteredKey = process.env["METERED_API_KEY"];
    const meteredDomain = process.env["METERED_DOMAIN"];

    if (meteredKey && meteredDomain) {
      try {
        const res = await fetch(
          `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredKey)}`,
        );
        if (res.ok) {
          const servers = (await res.json()) as RTCIceServer[];
          if (Array.isArray(servers) && servers.length > 0) {
            return {
              iceServers: [...STUN, ...servers],
              hasRelay: servers.some((s) => JSON.stringify(s.urls).includes("turn")),
            };
          }
        }
        console.error("[ice] Metered credentials request failed", res.status);
      } catch (error) {
        console.error("[ice] Metered credentials request threw", error);
      }
    }

    const urls = process.env["TURN_URLS"];
    const username = process.env["TURN_USERNAME"];
    const credential = process.env["TURN_CREDENTIAL"];

    if (urls && username && credential) {
      return {
        iceServers: [
          ...STUN,
          {
            urls: urls
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean),
            username,
            credential,
          },
        ],
        hasRelay: true,
      };
    }

    return { iceServers: STUN, hasRelay: false };
  },
);
