# Onsemble: accounts, saved rooms, bookshelf, photos, screen share

Turns Onsemble from a one-off watch-party demo into something couples and friend groups keep coming back to.

## What you get

**Accounts**
- Sign up / sign in with email + password, or with Google.
- A profile with a display name and avatar, editable from an account page.
- Header shows your avatar and a sign-out option once signed in.

**Saved rooms**
- A signed-in home page listing every room you belong to, plus "New room".
- A room has a name, a type (friendship or date), any number of members, and an invite code you can share; joining with the code adds you as a member permanently.
- Watch history: every synced session is logged (what was on, when, who was there) and shown in the room.
- Room preferences: default room type/vibe and which streaming services the group uses.
- The current instant code rooms stay for one-off nights with people who have no account.

**Bookshelf**
- Each room has a shelf of books, movies and shows.
- Add an item with title, type, optional link or cover, a note about why you added it, and who it's for ("for you", "for us", "for me").
- Two states: Suggestion, and Finished — with an optional rating and a short reaction when moved to finished.
- Filter by type, by state, and by who it was picked for.

**Photo album**
- Each room has a shared album; members upload photos with an optional caption.
- Grid view with a lightbox; uploader can delete their own photos.
- Private to room members only.

**Screen share on calls**
- A "Share screen" button in the room's video sidebar, with a clear "stop sharing" control.
- The shared screen appears as its own separate tile (and on the main stage), so the sharer's camera tile stays visible alongside it.

## How it works

- Turn on Lovable Cloud for accounts, data and photo storage.
- Tables: `profiles`, `rooms`, `room_members`, `shelf_items`, `watch_sessions`, `photos` — all with row-level security so only members of a room can read or write its data, enforced through a security-definer `is_room_member` helper to avoid recursive policies.
- Photos go in a private storage bucket keyed by room id, with member-only read and owner-only delete policies; the app reads them through signed URLs.
- Room data is read through authenticated server functions; the signed-in area lives under a protected route group, with the landing page and instant code rooms staying public.
- Screen share uses `getDisplayMedia` and replaces the outgoing track locally; it is presentation-level only and does not change the existing mock peer setup.

## Not included

- Real WebRTC peers, TURN servers and true cross-device sync — the video chat and playback sync stay simulated, as they are today. That is a separate piece of work.
