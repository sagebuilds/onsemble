import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import { useAllMyPhotos } from "@/lib/data";

/**
 * Ambient, auto-cycling carousel of photos from every room the user is in.
 * Renders nothing until there is at least one photo.
 */
export function PhotoCarousel() {
  const { data: photos } = useAllMyPhotos(24);
  const items = (photos ?? []).filter((p) => p.url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-playful">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <Images className="h-5 w-5 text-primary" /> Moments from your rooms
        </p>
        <span className="text-xs font-semibold text-muted-foreground">
          {index + 1} / {items.length}
        </span>
      </div>

      <div className="relative mt-4 h-64 w-full sm:h-80">
        {items.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.url ?? ""}
            alt={photo.caption ?? `Photo from ${photo.roomName}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-sm font-semibold text-white">
            {items[index]?.caption ?? items[index]?.roomName}
          </p>
          {items[index]?.caption ? (
            <p className="text-xs text-white/80">{items[index]?.roomName}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-5 py-4">
        {items.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`Show photo ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-2.5 bg-muted"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
