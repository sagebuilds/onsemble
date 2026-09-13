import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EMOJI_CHOICES } from "@/lib/room";

type Props = {
  value: string;
  onSelect: (emoji: string | null) => void | Promise<void>;
  className?: string;
};

/** Click the room emoji to swap it for any other emoji. */
export function RoomEmojiPicker({ value, onSelect, className }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const pick = async (emoji: string | null) => {
    setOpen(false);
    setCustom("");
    await onSelect(emoji);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Change the room emoji"
          aria-label="Change the room emoji"
          className={`rounded-2xl px-2 py-1 leading-none transition-colors hover:bg-secondary ${className ?? ""}`}
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Room emoji
        </p>
        <div className="mt-3 grid grid-cols-8 gap-1">
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className={`rounded-lg p-1 text-xl transition-colors hover:bg-secondary ${
                emoji === value ? "bg-secondary" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom([...e.target.value].slice(-2).join(""))}
            placeholder="Paste any emoji"
            className="h-9 rounded-xl"
          />
          <Button
            size="sm"
            className="rounded-full"
            disabled={!custom.trim()}
            onClick={() => pick(custom.trim())}
          >
            Use
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full rounded-full text-xs"
          onClick={() => pick(null)}
        >
          Reset to default
        </Button>
      </PopoverContent>
    </Popover>
  );
}
