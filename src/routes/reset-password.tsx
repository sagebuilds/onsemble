import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — Onsemble" },
      {
        name: "description",
        content: "Set a new Onsemble password and get back to your shared rooms, shelves and albums.",
      },
      { property: "og:title", content: "Choose a new password — Onsemble" },
      {
        property: "og:description",
        content: "Set a new Onsemble password and get back to your shared rooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z
  .string()
  .min(6, "Passwords need at least 6 characters.")
  .max(72, "Passwords can be at most 72 characters.");

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("same as the old") || m.includes("should be different"))
    return "That's your current password. Please choose a different one.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "That password has shown up in a data breach. Please pick a different one.";
  if (m.includes("expired") || m.includes("invalid") || m.includes("token"))
    return "This reset link has expired. Request a new one from the sign-in page.";
  if (m.includes("session") || m.includes("auth"))
    return "This reset link is no longer valid. Request a new one from the sign-in page.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "We couldn't reach Onsemble. Check your connection and try again.";
  return "We couldn't update your password. Please try again.";
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    password?: string | undefined;
    confirm?: string | undefined;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setLinkValid(!!data.session);
      setReady(true);
    };
    // Supabase parses the recovery link before firing PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setLinkValid(true);
        setReady(true);
      }
    });
    const timer = setTimeout(check, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) next.password = parsed.error.issues[0]?.message;
    if (confirm !== password) next.confirm = "These passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated — you're signed in.");
      setTimeout(() => navigate({ to: "/home" }), 900);
    } catch (err) {
      const friendly = friendlyError(err instanceof Error ? err.message : "");
      setFormError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-semibold">
          <Popcorn className="h-5 w-5 text-primary" />
          Onsemble
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>

        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : !linkValid ? (
          <div className="mt-4 space-y-4">
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              This reset link has expired or was already used.
            </div>
            <Button asChild className="w-full rounded-full" size="lg">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : done ? (
          <p className="mt-4 text-sm text-muted-foreground">
            All set — taking you to your rooms…
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick something you'll remember. You'll stay signed in afterwards.
            </p>
            {formError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {formError}
              </div>
            )}
            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  className="rounded-xl"
                />
                {errors.password ? (
                  <p className="text-xs font-medium text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  aria-invalid={!!errors.confirm}
                  className="rounded-xl"
                />
                {errors.confirm && (
                  <p className="text-xs font-medium text-destructive">{errors.confirm}</p>
                )}
              </div>
              <Button type="submit" disabled={busy} className="w-full rounded-full" size="lg">
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
