import { NURSERY_LIBRARY_DATA } from "./data";
import type {
  NurseryCategory,
  NurseryFilterOptions,
  NurseryLibraryItem,
  Playlist,
  SerializedPlaylistsPayload,
} from "./types";

export const MAX_PLAYLISTS = 10;
export const MAX_ITEMS_PER_PLAYLIST = 50;
export const MAX_PLAYLIST_NAME_LENGTH = 40;
export const PLAYLIST_PAYLOAD_VERSION = 1;

/**
 * Validates a YouTube 11-character video ID.
 * Accepts ONLY /^[A-Za-z0-9_-]{11}$/.
 */
export function isValidYoutubeId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

/**
 * Builds the youtube-nocookie embed URL with rel=0.
 * Returns null if the ID is invalid.
 */
export function buildEmbedUrl(id: string | null | undefined): string | null {
  if (!isValidYoutubeId(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

/**
 * Sanitizes and encodes a YouTube search query.
 * Strips ASCII control characters, trims, caps at 120 characters, and percent-encodes.
 */
export function buildSearchUrl(searchQuery: string | null | undefined): string {
  const raw = searchQuery ?? "";
  const sanitized = raw.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 120);
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(sanitized)}`;
}

/**
 * Sanitizes user-inputted playlist names: strips control chars, trims, caps length.
 */
export function sanitizePlaylistName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";
  return name.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, MAX_PLAYLIST_NAME_LENGTH);
}

/**
 * Filters library items based on search query, category, language, age, type, and favorites.
 */
export function filterItems(
  items: NurseryLibraryItem[],
  filters: NurseryFilterOptions,
  categories: NurseryCategory[] = NURSERY_LIBRARY_DATA.categories
): NurseryLibraryItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
  const normalizedQuery = filters.query?.trim().toLowerCase();
  const favoriteSet =
    filters.favoriteIds instanceof Set
      ? filters.favoriteIds
      : new Set(filters.favoriteIds ?? []);

  return items.filter((item) => {
    if (filters.onlyFavorites && !favoriteSet.has(item.id)) {
      return false;
    }
    if (filters.categoryId && filters.categoryId !== "all" && item.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.language && filters.language !== "all" && item.language !== filters.language) {
      return false;
    }
    if (filters.ageRange && filters.ageRange !== "all" && item.ageRange !== filters.ageRange) {
      return false;
    }
    if (filters.type && filters.type !== "all" && item.type !== filters.type) {
      return false;
    }

    if (normalizedQuery) {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
      const categoryName = categoryMap.get(item.categoryId) ?? "";
      const categoryMatch = categoryName.includes(normalizedQuery);
      const focusMatch = item.learningFocus.some((f) =>
        f.toLowerCase().includes(normalizedQuery)
      );

      if (!titleMatch && !categoryMatch && !focusMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Creates a new playlist if under the maximum cap of 10.
 */
export function createPlaylist(
  name: string,
  existingPlaylists: Playlist[]
): { ok: true; playlist: Playlist } | { ok: false; error: string } {
  if (existingPlaylists.length >= MAX_PLAYLISTS) {
    return {
      ok: false,
      error: `Maximum limit of ${MAX_PLAYLISTS} playlists reached.`,
    };
  }

  const cleanName = sanitizePlaylistName(name);
  if (!cleanName) {
    return {
      ok: false,
      error: "Playlist name cannot be empty.",
    };
  }

  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    itemIds: [],
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, playlist };
}

/**
 * Renames an existing playlist.
 */
export function renamePlaylist(
  playlistId: string,
  newName: string,
  playlists: Playlist[]
): Playlist[] {
  const cleanName = sanitizePlaylistName(newName);
  if (!cleanName) return playlists;

  return playlists.map((p) =>
    p.id === playlistId
      ? { ...p, name: cleanName, updatedAt: new Date().toISOString() }
      : p
  );
}

/**
 * Adds an item to a playlist (capped at 50 items, avoids duplicates).
 */
export function addToPlaylist(
  playlistId: string,
  itemId: string,
  playlists: Playlist[]
): Playlist[] {
  return playlists.map((p) => {
    if (p.id !== playlistId) return p;
    if (p.itemIds.includes(itemId)) return p;
    if (p.itemIds.length >= MAX_ITEMS_PER_PLAYLIST) return p;

    return {
      ...p,
      itemIds: [...p.itemIds, itemId],
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Removes an item from a playlist.
 */
export function removeFromPlaylist(
  playlistId: string,
  itemId: string,
  playlists: Playlist[]
): Playlist[] {
  return playlists.map((p) => {
    if (p.id !== playlistId) return p;
    return {
      ...p,
      itemIds: p.itemIds.filter((id) => id !== itemId),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Moves an item up or down in a playlist's order.
 */
export function moveInPlaylist(
  playlistId: string,
  itemId: string,
  direction: "up" | "down",
  playlists: Playlist[]
): Playlist[] {
  return playlists.map((p) => {
    if (p.id !== playlistId) return p;
    const index = p.itemIds.indexOf(itemId);
    if (index === -1) return p;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= p.itemIds.length) return p;

    const newItemIds = [...p.itemIds];
    const [moved] = newItemIds.splice(index, 1);
    newItemIds.splice(targetIndex, 0, moved);

    return {
      ...p,
      itemIds: newItemIds,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Deletes a playlist.
 */
export function deletePlaylist(
  playlistId: string,
  playlists: Playlist[]
): Playlist[] {
  return playlists.filter((p) => p.id !== playlistId);
}

/**
 * Serializes playlists into a versioned JSON string.
 */
export function serializePlaylists(playlists: Playlist[]): string {
  const payload: SerializedPlaylistsPayload = {
    version: PLAYLIST_PAYLOAD_VERSION,
    playlists,
  };
  return JSON.stringify(payload);
}

/**
 * Deserializes playlists from JSON.
 * Ignores unknown versions and strips invalid item IDs.
 */
export function deserializePlaylists(
  rawJson: string | null | undefined,
  validItemIds: Set<string> | string[]
): Playlist[] {
  if (!rawJson || typeof rawJson !== "string") return [];
  const validSet =
    validItemIds instanceof Set ? validItemIds : new Set(validItemIds);

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") return [];
    if (parsed.version !== PLAYLIST_PAYLOAD_VERSION) return [];
    if (!Array.isArray(parsed.playlists)) return [];

    return parsed.playlists
      .filter((p: unknown): p is Playlist => {
        if (!p || typeof p !== "object") return false;
        const candidate = p as Record<string, unknown>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.name === "string" &&
          Array.isArray(candidate.itemIds)
        );
      })
      .map((p: Playlist) => ({
        id: p.id,
        name: sanitizePlaylistName(p.name),
        itemIds: p.itemIds.filter((itemId) => typeof itemId === "string" && validSet.has(itemId)),
        createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

