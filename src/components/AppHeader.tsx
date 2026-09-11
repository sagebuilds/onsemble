import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Popcorn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";

export function AppHeader() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 sm:px-8 sm:py-7">
      <Link to="/home" className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-joy shadow-playful">
          <Popcorn className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-muted-foreground sm:gap-5">
        <Link to="/home" className="transition-colors hover:text-foreground">
          My rooms
        </Link>
        <Link to="/extension" className="transition-colors hover:text-foreground">
          Chrome extension
        </Link>
        <Link to="/account" className="flex min-w-0 items-center gap-2 text-foreground">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-electric text-xs text-background">
              {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {profile?.display_name ?? "Account"}
        </Link>
        <Button variant="ghost" className="rounded-full" onClick={signOut}>
          Sign out
        </Button>
      </nav>
    </header>
  );
}
