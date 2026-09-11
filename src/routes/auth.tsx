import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
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

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like a valid email address.")
  .max(255, "That email is too long.");

const passwordSchema = z
  .string()
  .min(6, "Passwords need at least 6 characters.")
  .max(72, "Passwords can be at most 72 characters.");

const nameSchema = z.string().trim().max(60, "Please use 60 characters or fewer.");

/** Turns backend auth errors into something a person can act on. */
function friendlyAuthError(message: string, mode: "signin" | "signup") {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link we sent.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "There's already an account with that email. Try signing in instead.";
  if (m.includes("password") && m.includes("should be"))
    return "Please choose a longer, stronger password.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "That password has shown up in a data breach. Please pick a different one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts just now. Wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "We couldn't reach Onsemble. Check your connection and try again.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "New sign-ups are turned off right now.";
  return mode === "signup"
    ? "We couldn't create your account. Please try again."
    : "We couldn't sign you in. Please try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string | undefined;
    password?: string | undefined;
    name?: string | undefined;
    age?: string | undefined;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
    if (typeof window !== "undefined" && sessionStorage.getItem("onsemble.sessionExpired")) {
      sessionStorage.removeItem("onsemble.sessionExpired");
      setNotice("Your session ended, so we signed you out. Sign in again to pick up where you left off.");
    }
  }, [navigate]);

  const validate = () => {
    const next: typeof errors = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) next.email = emailResult.error.issues[0]?.message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) next.password = passwordResult.error.issues[0]?.message;
    if (mode === "signup") {
      const nameResult = nameSchema.safeParse(displayName);
      if (!nameResult.success) next.name = nameResult.error.issues[0]?.message;
      if (!ageConfirmed) next.age = "Please confirm you are at least 18 to continue.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { display_name: displayName.trim() || email.trim().split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to Onsemble!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/home" });
      else {
        setNotice("Check your inbox to confirm your email, then sign in.");
        toast("Check your inbox to confirm your email, then sign in.");
      }
    } catch (err) {
      const friendly = friendlyAuthError(err instanceof Error ? err.message : "", mode);
      setFormError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (mode === "signup" && !ageConfirmed) {
      setErrors((prev) => ({ ...prev, age: "Please confirm you are at least 18 to continue." }));
      return;
    }
    setFormError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setFormError("Google sign-in didn't work. Try again, or use your email and password.");
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

        {notice && (
          <div className="mt-5 rounded-xl border border-border bg-muted/50 p-3 text-sm text-foreground">
            {notice}
          </div>
        )}
        {formError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sage"
                aria-invalid={!!errors.name}
                className="rounded-xl"
              />
              {errors.name && <p className="text-xs font-medium text-destructive">{errors.name}</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onBlur={() => {
                const r = emailSchema.safeParse(email);
                setErrors((prev) => ({
                  ...prev,
                  email: email ? (r.success ? undefined : r.error.issues[0]?.message) : prev.email,
                }));
              }}
              aria-invalid={!!errors.email}
              className="rounded-xl"
            />
            {errors.email && <p className="text-xs font-medium text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={!!errors.password}
              className="rounded-xl"
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">{errors.password}</p>
            )}
            {mode === "signup" && !errors.password && (
              <p className="text-xs text-muted-foreground">At least 6 characters.</p>
            )}
          </div>
          {mode === "signup" && (
            <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <Checkbox
                checked={ageConfirmed}
                onCheckedChange={(v) => {
                  setAgeConfirmed(v === true);
                  if (v === true) setErrors((prev) => ({ ...prev, age: undefined }));
                }}
                className="mt-0.5"
                aria-label="I confirm I am at least 18"
              />
              <span className="leading-snug">
                I confirm I am at least 18
                {errors.age && (
                  <span className="mt-1 block text-xs font-medium text-destructive">
                    {errors.age}
                  </span>
                )}
              </span>
            </label>
          )}
          <Button type="submit" disabled={busy || (mode === "signup" && !ageConfirmed)} className="w-full rounded-full" size="lg">
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
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
            setErrors({});
            setFormError(null);
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
