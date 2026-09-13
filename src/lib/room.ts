export type RoomKind = "friendship" | "date";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const ROOM_KINDS: { id: RoomKind; label: string; blurb: string; emoji: string }[] = [
  {
    id: "friendship",
    label: "Friendship Room",
    blurb: "Up to 6 friends, chaotic group commentary encouraged.",
    emoji: "🍿",
  },
  {
    id: "date",
    label: "Date Room",
    blurb: "Just the two of you, extra cozy lighting.",
    emoji: "💞",
  },
];

/** Emoji shown for a room: the custom one if set, otherwise the kind default. */
export function roomEmoji(room: { kind?: string | null; emoji?: string | null } | null | undefined) {
  if (room?.emoji) return room.emoji;
  return room?.kind === "date" ? "💞" : "🍿";
}

export const EMOJI_CHOICES = [
  "🍿","💞","🎬","📺","🎧","📚","🌙","☀️","🔥","🌈","✨","🎉","🧸","🍕","☕","🍷",
  "🐱","🐶","🦄","🌸","🌊","🏡","🛋️","🎮","⚽","🎨","🧩","🚀","🗺️","👯","💌","💫",
  "🦐",
] as const;

export const STREAMING_SERVICES = [
  "YouTube",
  "Netflix",
  "Disney+",
  "Apple TV+",
  "Prime Video",
] as const;
