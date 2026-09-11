import { Link } from "@tanstack/react-router";
import { Popcorn } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
};

export function LegalPage({ title, updated, intro, children }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-sunshine/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-32 h-[24rem] w-[24rem] rounded-full bg-bubblegum/30 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-8 sm:py-7">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-joy shadow-playful">
            <Popcorn className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Back home
        </Link>
      </header>

      <section className="relative mx-auto w-full max-w-3xl px-4 pb-20 sm:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <p className="mt-6 text-base leading-relaxed text-foreground/80">{intro}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
          {children}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm font-semibold">
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  );
}
