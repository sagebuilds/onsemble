import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, useProfile } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — Onsemble" },
      {
        name: "description",
        content: "Update the name and photo your friends see in your Onsemble rooms.",
      },
      { property: "og:title", content: "Your Onsemble account" },
      { property: "og:description", content: "Manage your display name and avatar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

function Account() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [profile]);

  const save = async () => {
    setBusy(true);
    try {
      const uid = await currentUserId();
      if (!uid) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: uid, display_name: displayName || "Friend", avatar_url: avatarUrl || null });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-electric/30 blur-3xl" />
      <AppHeader />

      <section className="relative mx-auto w-full max-w-2xl px-4 pb-24 sm:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your account</h1>

        <div className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-playful">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} alt="" />
              <AvatarFallback className="bg-bubblegum text-lg text-background">
                {(displayName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-xl font-semibold">{displayName || "Friend"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="av">Photo link</Label>
              <Input
                id="av"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-xl"
              />
            </div>
            <Button className="rounded-full" disabled={busy} onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
