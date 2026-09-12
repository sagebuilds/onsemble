import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShelfKind = "book" | "movie" | "show";
export type ShelfState = "suggestion" | "finished";
export type ShelfFor = "you" | "us" | "me";

export const SHELF_STATE_LABEL: Record<ShelfState, string> = {
  suggestion: "Suggestion",
  finished: "Finished",
};

export const SHELF_FOR_LABEL: Record<ShelfFor, string> = {
  you: "For you",
  us: "For us",
  me: "For me",
};

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyRooms() {
  return useQuery({
    queryKey: ["my-rooms"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data: memberships, error } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", uid);
      if (error) throw error;
      const ids = (memberships ?? []).map((m) => m.room_id);
      if (ids.length === 0) return [];
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name, kind, code, services, vibe, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (roomsError) throw roomsError;
      return rooms ?? [];
    },
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, kind, code, services, vibe, created_by, created_at")
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Resolve a persistent room from its invite code (members only, via RLS). */
export function useRoomByCode(code: string | null) {
  return useQuery({
    queryKey: ["room-by-code", code],
    enabled: !!code,
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, kind, code")
        .ilike("code", code)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
}

export function useRoomMembers(roomId: string) {
  return useQuery({
    queryKey: ["room-members", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_members")
        .select("user_id, joined_at")
        .eq("room_id", roomId)
        .order("joined_at");
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      return (data ?? []).map((m) => ({
        ...m,
        profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? null,
      }));
    },
  });
}

export function useShelf(roomId: string) {
  return useQuery({
    queryKey: ["shelf", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shelf_items")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWatchHistory(roomId: string) {
  return useQuery({
    queryKey: ["history", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_sessions")
        .select("*")
        .eq("room_id", roomId)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePhotoAlbums(roomId: string) {
  return useQuery({
    queryKey: ["photo-albums", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_albums")
        .select("id, name, created_by, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePhotos(roomId: string) {
  return useQuery({
    queryKey: ["photos", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("room_id", roomId)
        .order("position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: signed } = await supabase.storage
        .from("room-photos")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      return rows.map((row, i) => ({ ...row, url: signed?.[i]?.signedUrl ?? null }));
    },
  });
}

/** Recent photos across every room the signed-in person belongs to. */
export function useAllMyPhotos(limit = 24) {
  return useQuery({
    queryKey: ["my-photos", limit],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data: memberships, error: memberError } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", uid);
      if (memberError) throw memberError;
      const ids = (memberships ?? []).map((m) => m.room_id);
      if (ids.length === 0) return [];
      const { data: rooms } = await supabase.from("rooms").select("id, name").in("id", ids);
      const roomNames = new Map((rooms ?? []).map((r) => [r.id, r.name]));
      const { data, error } = await supabase
        .from("photos")
        .select("id, room_id, caption, storage_path, created_at")
        .in("room_id", ids)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: signed } = await supabase.storage
        .from("room-photos")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      return rows.map((row, i) => ({
        ...row,
        roomName: roomNames.get(row.room_id) ?? "A room",
        url: signed?.[i]?.signedUrl ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type RoomInvite = {
  id: string;
  room_id: string;
  email: string;
  invited_by: string;
  status: string;
  created_at: string;
};

export async function currentUserEmail() {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

/** Pending invites sent from a room. */
export function useRoomInvites(roomId: string) {
  return useQuery({
    queryKey: ["room-invites", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_invites")
        .select("id, room_id, email, invited_by, status, created_at")
        .eq("room_id", roomId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoomInvite[];
    },
  });
}

/** Invites addressed to the signed-in user's email address. */
export function useMyInvites() {
  return useQuery({
    queryKey: ["my-invites"],
    queryFn: async () => {
      const email = await currentUserEmail();
      if (!email) return [];
      const { data, error } = await supabase
        .from("room_invites")
        .select("id, room_id, email, invited_by, status, created_at")
        .eq("status", "pending")
        .ilike("email", email);
      if (error) throw error;
      const invites = (data ?? []) as RoomInvite[];
      if (invites.length === 0) return [];
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name, kind, code")
        .in(
          "id",
          invites.map((i) => i.room_id),
        );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in(
          "id",
          invites.map((i) => i.invited_by),
        );
      return invites.map((invite) => ({
        ...invite,
        room: (rooms ?? []).find((r) => r.id === invite.room_id) ?? null,
        inviter: (profiles ?? []).find((p) => p.id === invite.invited_by) ?? null,
      }));
    },
  });
}
