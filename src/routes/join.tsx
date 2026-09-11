import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserEmail, currentUserId } from "@/lib/data";

export const Route = createFileRoute("/join")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Join a room — Onsemble" },
      {
        name: "description",
        content: "Accept an Onsemble invitation and join your friends' shared room.",
      },
      { property: "og:title", content: "Join a room on Onsemble" },
      {
        property: "og:description",
        content: "Accept an invitation to a shared room with bookshelf, photos and movie nights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "signed-out" | "error">("working");
  const [message, setMessage] = useState("Getting you into the room…");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const uid = await currentUserId();
      if (cancelled) return;
      if (!uid) {
        sessionStorage.setItem("onsemble.pendingJoinCode", code);
        setStatus("signed-out");
        return;
      }
      if (!code) {
        setStatus("error");
        setMessage("This invite link is missing its room code.");
        return;
      }
      const { data: room } = await supabase
        .from("rooms")
        .select("id, name, code")
        .ilike("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (!room) {
        setStatus("error");
        setMessage("We couldn't find that room. Ask your friend to resend the invite.");
        return;
      }
      const { error: joinError } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, user_id: uid });
      // A duplicate simply means they were already a member.
      if (joinError && !joinError.message.toLowerCase().includes("duplicate")) {
        setStatus("error");
        setMessage("We couldn't add you to that room. Please try again.");
        return;
      }
      const email = await currentUserEmail();
      if (email) {
        await supabase
          .from("room_invites")
          .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: uid })
          .eq("room_id", room.id)
          .eq("status", "pending")
          .ilike("email", email);
      }
      sessionStorage.removeItem("onsemble.pendingJoinCode");
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
        <Popcorn className="mx-auto h-8 w-8 text-primary" />
        {status === "working" && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
        {status === "signed-out" && (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">You've been invited!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in or make an account, then open your invite link again to join.
            </p>
            <Button asChild className="mt-6 w-full rounded-full" size="lg">
              <Link to="/auth">Sign in to join</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">Something's off</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="secondary" className="mt-6 w-full rounded-full" size="lg">
              <Link to="/home">Go to my rooms</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
