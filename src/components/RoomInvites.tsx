import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, useRoomInvites } from "@/lib/data";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .email("That doesn't look like a valid email address.")
  .max(255, "That email is too long.");

export function inviteLink(code: string) {
  if (typeof window === "undefined") return `/join?code=${code}`;
  return `${window.location.origin}/join?code=${code}`;
}

export function RoomInvites({
  roomId,
  roomName,
  code,
}: {
  roomId: string;
  roomName: string;
  code: string;
}) {
  const qc = useQueryClient();
  const { data: invites } = useRoomInvites(roomId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const link = inviteLink(code);

  const mailtoFor = (address: string) => {
    const subject = encodeURIComponent(`Join me in ${roomName} on Onsemble`);
    const body = encodeURIComponent(
      `Hi!\n\nI made us a room on Onsemble called "${roomName}" — shared bookshelf, photos and synced movie nights.\n\nJoin here: ${link}\nOr use the room code: ${code}\n\nSee you there!`,
    );
    return `mailto:${encodeURIComponent(address)}?subject=${subject}&body=${body}`;
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    const address = parsed.data.toLowerCase();
    if ((invites ?? []).some((i) => i.email.toLowerCase() === address)) {
      setError("You've already invited that address.");
      return;
    }
    setBusy(true);
    try {
      const result = await invite({
        data: { roomId, email: address, origin: window.location.origin },
      });
      await qc.invalidateQueries({ queryKey: ["room-invites", roomId] });
      setEmail("");
      toast.success(
        result.sent
          ? `Invitation emailed to ${address}.`
          : `${address} is on the invite list — share the link with them directly.`,
      );
    } catch {
      toast.error("Couldn't send that invite. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (address: string) => {
    try {
      const result = await invite({
        data: { roomId, email: address, origin: window.location.origin },
      });
      toast.success(result.sent ? `Invitation resent to ${address}.` : "Couldn't email that one.");
    } catch {
      toast.error("Couldn't resend that invite.");
    }
  };

  const cancelInvite = async (id: string) => {
    const { error: deleteError } = await supabase.from("room_invites").delete().eq("id", id);
    if (deleteError) {
      toast.error("Couldn't cancel that invite.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["room-invites", roomId] });
    toast.success("Invite cancelled.");
  };

  const copyLink = () => {
    navigator.clipboard
      ?.writeText(link)
      .then(() => toast.success("Invite link copied!"))
      .catch(() => toast.error("Couldn't copy the link."));
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Invite friends
      </p>
      <form onSubmit={sendInvite} noValidate className="mt-3 flex flex-wrap gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="friend@example.com"
          aria-invalid={!!error}
          aria-label="Friend's email address"
          className="h-11 min-w-[14rem] flex-1 rounded-xl"
        />
        <Button type="submit" disabled={busy} className="h-11 rounded-full">
          <Send className="mr-1 h-4 w-4" /> {busy ? "Inviting…" : "Send invite"}
        </Button>
        <Button type="button" variant="secondary" className="h-11 rounded-full" onClick={copyLink}>
          <Copy className="mr-1 h-4 w-4" /> Copy link
        </Button>
      </form>
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        We'll open your email app with the invite ready to send, and keep the person on the pending
        list until they join.
      </p>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pending ({(invites ?? []).length})
        </p>
        {(invites ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No one is waiting to join right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(invites ?? []).map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border bg-background/50 px-4 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{invite.email}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Pending
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost" className="rounded-full">
                    <a href={mailtoFor(invite.email)}>Resend</a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => cancelInvite(invite.id)}
                    aria-label={`Cancel invite for ${invite.email}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
