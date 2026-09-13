import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  itemId: z.string().uuid(),
  origin: z.string().url().max(300),
});

/**
 * Emails the other members of a room when someone shelves an item meant for
 * them ("for you") or for the group ("for us"). Items kept "for me" notify
 * nobody.
 */
export const notifyShelfItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: item } = await context.supabase
      .from("shelf_items")
      .select("id, room_id, title, kind, note, intended_for, added_by")
      .eq("id", data.itemId)
      .maybeSingle();

    if (!item || item.added_by !== context.userId) return { notified: 0 };
    if (item.intended_for !== "us" && item.intended_for !== "you") return { notified: 0 };

    const { data: room } = await context.supabase
      .from("rooms")
      .select("id, name")
      .eq("id", item.room_id)
      .maybeSingle();
    if (!room) return { notified: 0 };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: members } = await context.supabase
      .from("room_members")
      .select("user_id")
      .eq("room_id", item.room_id);

    const recipients = (members ?? [])
      .map((m) => m.user_id)
      .filter((id) => id !== context.userId);
    if (recipients.length === 0) return { notified: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    const roomUrl = `${data.origin.replace(/\/$/, "")}/rooms/${room.id}`;
    let notified = 0;

    for (const userId of recipients) {
      try {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = user?.user?.email;
        if (!email) continue;

        const result = await sendTemplateEmail("shelf-item-added", email, {
          templateData: {
            adderName: profile?.display_name ?? "Someone",
            roomName: room.name,
            title: item.title,
            kind: item.kind,
            note: item.note ?? "",
            forYou: item.intended_for === "you",
            roomUrl,
          },
          idempotencyKey: `shelf-item-${item.id}-${userId}`,
        });
        if (result.sent) notified += 1;
      } catch (error) {
        console.error("[shelf-notify] email send failed", error);
      }
    }

    return { notified };
  });
