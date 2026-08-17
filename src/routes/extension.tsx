import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Puzzle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Onsemble Chrome Extension — Sync any streaming tab" },
      {
        name: "description",
        content:
          "Install the Onsemble Chrome extension to sync play, pause and seek across YouTube, Netflix, Disney+, Apple TV+ and Prime Video.",
      },
      { property: "og:title", content: "Onsemble Chrome Extension" },
      {
        property: "og:description",
        content: "Manifest V3 extension that keeps your streaming tab in sync with your room.",
      },
    ],
  }),
  component: ExtensionPage,
});

const STEPS = [
  "Download and unzip the Onsemble extension.",
  "Open chrome://extensions in Chrome, Edge, Brave or Arc.",
  "Enable Developer mode in the top-right corner.",
  "Click Load unpacked and pick the unzipped folder.",
  "Open your room, then open your streaming tab — sync starts automatically.",
];

function ExtensionPage() {
  const download = () => {
    fetch("/onsemble-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "onsemble-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-sunshine/40 blur-3xl" />
      <div className="mx-auto w-full max-w-3xl px-8 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Onsemble
        </Link>

        <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-joy shadow-playful">
          <Puzzle className="h-6 w-6 text-primary-foreground" />
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">
          The Onsemble Chrome extension
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          A Manifest V3 extension that finds the native video player on your streaming tab and
          relays every play, pause and seek to your room in real time.
        </p>

        <Button size="lg" className="mt-7 rounded-full px-7" onClick={download}>
          <Download className="mr-1 h-5 w-5" /> Download extension
        </Button>

        <ol className="mt-10 space-y-3">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                {i + 1}
              </span>
              <span className="text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
