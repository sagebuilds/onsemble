import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";

export const Route = createFileRoute("/join")({
  staticData: { sitemap: false },
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
      const { data: roomId, error: joinError } = await supabase.rpc("join_room_by_code", {
        _code: code,
      });
      if (cancelled) return;
      if (joinError) {
        setStatus("error");
        setMessage("We couldn't add you to that room. Please try again.");
        return;
      }
      if (!roomId) {
        setStatus("error");
        setMessage("We couldn't find that room. Ask your friend to resend the invite.");
        return;
      }
      sessionStorage.removeItem("onsemble.pendingJoinCode");
      navigate({ to: "/rooms/$roomId", params: { roomId } });
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
