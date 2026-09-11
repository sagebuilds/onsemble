import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Onsemble — Your shared rooms" },
      {
        name: "description",
        content:
          "Create an Onsemble account to keep shared rooms, bookshelves, photo albums and watch history with the people you love.",
      },
      { property: "og:title", content: "Sign in to Onsemble" },
      {
        property: "og:description",
        content: "Keep your rooms, shelves and photo albums saved between movie nights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !ageConfirmed) {
      toast.error("Please confirm you are at least 18 to continue.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to Onsemble!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/home" });
      else toast("Check your inbox to confirm your email, then sign in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (mode === "signup" && !ageConfirmed) {
      toast.error("Please confirm you are at least 18 to continue.");
      return;
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't work. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-8">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-sunshine/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-bubblegum/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-playful">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-joy shadow-playful">
            <Popcorn className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
        </Link>

        <h1 className="font-display text-3xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Make your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved rooms keep your bookshelf, photos and watch history in one place.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sage"
                className="rounded-xl"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          {mode === "signup" && (
            <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <Checkbox
                checked={ageConfirmed}
                onCheckedChange={(v) => setAgeConfirmed(v === true)}
                className="mt-0.5"
                aria-label="I confirm I am at least 18"
              />
              <span className="leading-snug">I confirm I am at least 18</span>
            </label>
          )}
          <Button type="submit" disabled={busy || (mode === "signup" && !ageConfirmed)} className="w-full rounded-full" size="lg">
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="secondary"
          className="w-full rounded-full"
          disabled={mode === "signup" && !ageConfirmed}
          onClick={google}
        >
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={() => {
            setAgeConfirmed(false);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-6 w-full text-sm font-semibold text-primary hover:underline"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="font-semibold hover:text-foreground hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
