import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, LogOut, Popcorn, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";

export function AppHeader() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await queryClient.cancelQueries();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onsemble.intentionalSignOut", "1");
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      toast.success("You're signed out. See you next movie night!");
      navigate({ to: "/", replace: true });
      setConfirmOpen(false);
    } catch (err) {
      setSignOutError(
        err instanceof Error ? err.message : "We couldn't sign you out. Check your connection.",
      );
      toast.error("Sign out didn't work. Try again.");
    } finally {
      setSigningOut(false);
    }
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
        <Button
          variant="ghost"
          className="rounded-full"
          disabled={signingOut}
          onClick={() => {
            setSignOutError(null);
            setConfirmOpen(true);
          }}
        >
          {signingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing out…
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" /> Sign out
            </>
          )}
        </Button>
      </nav>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (signingOut) return;
          setConfirmOpen(open);
          if (!open) setSignOutError(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Onsemble?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll leave any room you're in and need to sign in again to get back to your saved
              rooms, shelves and photos.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {signOutError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{signOutError}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut} className="rounded-full">
              Stay signed in
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void signOut();
              }}
            >
              {signingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing out…
                </>
              ) : signOutError ? (
                "Try again"
              ) : (
                "Sign out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
