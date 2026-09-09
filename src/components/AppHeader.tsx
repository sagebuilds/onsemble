import { Link, useNavigate } from "@tanstack/react-router";
import { Popcorn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";

export function AppHeader() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-7">
      <Link to="/home" className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-joy shadow-playful">
          <Popcorn className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
      </Link>

      <nav className="flex items-center gap-5 text-sm font-semibold text-muted-foreground">
        <Link to="/home" className="transition-colors hover:text-foreground">
          My rooms
        </Link>
        <Link to="/extension" className="transition-colors hover:text-foreground">
          Chrome extension
        </Link>
        <Link to="/account" className="flex items-center gap-2 text-foreground">
          <Avatar className="h-8 w-8">
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
