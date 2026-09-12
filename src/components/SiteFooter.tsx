import { Link } from "@tanstack/react-router";
import { Heart, Mail, Popcorn } from "lucide-react";

const CONTACT_EMAIL = "sage@sagefranch.com";

const STREAMING_SERVICES = [
  "YouTube",
  "Netflix",
  "Disney+",
  "Apple TV+",
  "Prime Video",
];

export function SiteFooter() {
  return (
    <footer className="relative mt-8 border-t border-border bg-card/70">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-joy shadow-playful">
              <Popcorn className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">Onsemble</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Onsemble is one shared room for the people you love: video chat, screen sharing,
            streaming in sync, a bookshelf you build together, and a private photo album.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-foreground"
          >
            <Mail className="h-4 w-4 text-bubblegum" />
            {CONTACT_EMAIL}
          </a>
        </div>

        <nav aria-label="Rooms" className="min-w-0">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Rooms
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm font-semibold text-muted-foreground">
            <li>
              <a href="/#create" className="transition-colors hover:text-foreground">
                Create a room
              </a>
            </li>
            <li>
              <Link to="/home" className="transition-colors hover:text-foreground">
                My rooms
              </Link>
            </li>
            <li>
              <Link to="/auth" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Streaming" className="min-w-0">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Streaming
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm font-semibold text-muted-foreground">
            {STREAMING_SERVICES.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal" className="min-w-0">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Legal
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm font-semibold text-muted-foreground">
            <li>
              <Link to="/terms" className="transition-colors hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/extension" className="transition-colors hover:text-foreground">
                Chrome extension
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border px-4 py-5 text-sm text-muted-foreground sm:px-8">
        <span>© {new Date().getFullYear()} Onsemble. All rights reserved.</span>
        <span className="flex items-center gap-1.5">
          Made for people in different time zones
          <Heart className="h-3.5 w-3.5 fill-bubblegum text-bubblegum" />
        </span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2 font-semibold">
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </span>
      </div>
    </footer>
  );
}
