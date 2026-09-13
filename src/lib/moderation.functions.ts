import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Moderation trust for live calls.
 *
 * Presence payloads are written by each participant's own browser, so a
 * `verified: true` flag in presence proves nothing. Instead, a signed-in
 * member asks the server for a short-lived token bound to their user id, the
 * room key and their connection id. Other participants hand that token back to
 * the server for verification before honouring any moderation action.
 */

const TTL_SECONDS = 60 * 60 * 6;

const issueInput = z.object({
  roomKey: z.string().min(1).max(200),
  peerId: z.string().min(1).max(64),
});

const verifyInput = z.object({
  token: z.string().min(1).max(2000),
  roomKey: z.string().min(1).max(200),
  peerId: z.string().min(1).max(64),
});

type TokenBody = {
  uid: string;
  room: string;
  peer: string;
  exp: number;
};

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const encodeBody = (body: TokenBody) =>
  b64url(new TextEncoder().encode(JSON.stringify(body)));

const decodeBody = (encoded: string): TokenBody | null => {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as TokenBody;
  } catch {
    return null;
  }
};

async function sign(payload: string): Promise<string> {
  const secret =
    process.env["MODERATION_TOKEN_SECRET"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  if (!secret) throw new Error("Moderation signing secret is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

/** A signed-in participant gets a token attesting their identity for this call. */
export const issueModerationToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => issueInput.parse(data))
  .handler(async ({ data, context }) => {
    const body: TokenBody = {
      uid: context.userId,
      room: data.roomKey,
      peer: data.peerId,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    };
    const encoded = encodeBody(body);
    return { token: `${encoded}.${await sign(encoded)}` };
  });

/** Anyone in the call can ask the server whether a moderation token is real. */
export const verifyModerationToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyInput.parse(data))
  .handler(async ({ data }) => {
    const [encoded, signature] = data.token.split(".");
    if (!encoded || !signature) return { valid: false as const, userId: null };

    const expected = await sign(encoded);
    if (expected !== signature) return { valid: false as const, userId: null };

    const body = decodeBody(encoded);
    if (!body) return { valid: false as const, userId: null };
    if (body.exp < Math.floor(Date.now() / 1000)) return { valid: false as const, userId: null };
    if (body.room !== data.roomKey || body.peer !== data.peerId)
      return { valid: false as const, userId: null };

    return { valid: true as const, userId: body.uid };
  });
