import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteInput = z.object({
  roomId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  origin: z.string().url().max(300),
});

/**
 * Creates (or reuses) a pending room invite and emails the person.
 * Registered users get a "join the room" email; everyone else gets a short
 * intro to Onsemble plus a sign-up link.
 */
export const sendRoomInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteInput.parse(data))
  .handler(async ({ data, context }) => {
    const email = data.email.toLowerCase();

    // Must be a member of the room to invite anyone into it (RLS also enforces this).
    const { data: room, error: roomError } = await context.supabase
      .from("rooms")
      .select("id, name, code")
      .eq("id", data.roomId)
      .maybeSingle();
    if (roomError || !room) throw new Error("Room not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: existing } = await context.supabase
      .from("room_invites")
      .select("id")
      .eq("room_id", data.roomId)
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();

    let inviteId = existing?.id ?? null;
    if (!inviteId) {
      const { data: inserted, error: insertError } = await context.supabase
        .from("room_invites")
        .insert({ room_id: data.roomId, email, invited_by: context.userId })
        .select("id")
        .single();
      if (insertError) throw new Error("Could not create the invite");
      inviteId = inserted.id;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hasAccount } = await supabaseAdmin.rpc("email_has_account", { _email: email });

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const joinUrl = `${data.origin.replace(/\/$/, "")}/join?code=${encodeURIComponent(room.code)}`;
    const templateName = hasAccount ? "room-invite-member" : "room-invite-new-user";

    // The invite row is already saved; a failing email must not lose it.
    try {
      const result = await sendTemplateEmail(templateName, email, {
        templateData: {
          inviterName: profile?.display_name ?? "A friend",
          roomName: room.name,
          roomCode: room.code,
          joinUrl,
        },
        idempotencyKey: `${templateName}-${inviteId}`,
      });
      return { sent: result.sent, hasAccount: !!hasAccount, reason: null as string | null };
    } catch (error) {
      console.error("[room-invite] email send failed", error);
      const reason = error instanceof Error ? error.message : "Unknown email error";
      return { sent: false, hasAccount: !!hasAccount, reason };
    }
  });
