import type { NurseryAgeRange } from "./types";

export const ALLOWED_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
export const YOUTUBE_PLAYLIST_ID_REGEX = /^[A-Za-z0-9_-]{10,64}$/;

export const MAX_CUSTOM_VIDEOS = 100;
export const MAX_CUSTOM_VIDEO_TITLE_LENGTH = 80;
export const MAX_CUSTOM_VIDEO_NOTES_LENGTH = 200;
export const CUSTOM_VIDEOS_PAYLOAD_VERSION = 1;
export const ATTACHED_VIDEOS_PAYLOAD_VERSION = 1;

export const STORAGE_KEY_CUSTOM_VIDEOS = "cdm_beced_custom_videos_v1";
export const STORAGE_KEY_ATTACHED_VIDEOS = "cdm_beced_attached_videos_v1";

export type YouTubeParsed =
  | {
      kind: "video";
      videoId: string;
      startSeconds?: number;
      embedUrl: string;
      canonicalUrl: string;
    }
  | {
      kind: "playlist";
      playlistId: string;
      embedUrl: string;
      canonicalUrl: string;
    };

export interface CustomNurseryVideo {
  id: string; // e.g. custom-yt-<timestamp>-<rand>
  title: string;
  youtubeUrl: string;
  kind: "video" | "playlist";
  videoId: string | null;
  playlistId: string | null;
  startSeconds?: number;
  embedUrl: string;
  canonicalUrl: string;
  categoryId?: string;
  ageRange?: NurseryAgeRange;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedCustomVideosPayload {
  version: number;
  videos: CustomNurseryVideo[];
}

export interface AttachedVideoRecord {
  youtubeUrl: string;
  kind: "video" | "playlist";
  videoId: string | null;
  playlistId: string | null;
  embedUrl: string;
  canonicalUrl: string;
  updatedAt: string;
}

export interface SerializedAttachedVideosPayload {
  version: number;
  attached: Record<string, AttachedVideoRecord>;
}

function cleanId(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\/+$/, "").trim();
}

/**
 * Parses time param (e.g. 1h2m3s, 90s, 120) into positive integer seconds.
 */
export function parseStartSeconds(param: string | null | undefined): number | undefined {
  if (!param || typeof param !== "string") return undefined;
  const p = param.trim().toLowerCase();
  if (!p) return undefined;

  // Pure digits: e.g. "120" or "120s"
  if (/^\d+s?$/.test(p)) {
    const s = parseInt(p.replace("s", ""), 10);
    return isNaN(s) || s <= 0 ? undefined : s;
  }

  // Combined formats: e.g. 1h2m3s, 2m30s, 1h, 45s
  const match = p.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : undefined;
}

/**
 * Pure URL parser for YouTube videos and playlists.
 * Validates hosts against strict allowlist, extracts 11-char ID or playlist ID,
 * and generates safe youtube-nocookie embed URL.
 * Never returns or embeds raw user input.
 */
export function parseYouTubeUrl(raw: string | null | undefined): YouTubeParsed | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject dangerous schemes immediately
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return null;
  }

  let url: URL;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const searchParams = url.searchParams;

  // Start time (t= or start=)
  const timeParam = searchParams.get("t") || searchParams.get("start");
  const startSeconds = parseStartSeconds(timeParam);

  // 1. youtu.be/<ID>
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = cleanId(pathname.slice(1).split("/")[0]);
    if (YOUTUBE_VIDEO_ID_REGEX.test(id)) {
      const startQuery = startSeconds ? `&start=${startSeconds}` : "";
      return {
        kind: "video",
        videoId: id,
        startSeconds,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${startQuery}&playsinline=1`,
        canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
    return null;
  }

  // 2. /watch?v=<ID> (or playlist-only on /watch?list=<ID>)
  if (pathname === "/watch") {
    const id = cleanId(searchParams.get("v"));
    if (id && YOUTUBE_VIDEO_ID_REGEX.test(id)) {
      const startQuery = startSeconds ? `&start=${startSeconds}` : "";
      return {
        kind: "video",
        videoId: id,
        startSeconds,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${startQuery}&playsinline=1`,
        canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
    const listId = cleanId(searchParams.get("list"));
    if (listId && YOUTUBE_PLAYLIST_ID_REGEX.test(listId)) {
      return {
        kind: "playlist",
        playlistId: listId,
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&rel=0&modestbranding=1&playsinline=1`,
        canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      };
    }
    return null;
  }

  // 3. /shorts/<ID> or /embed/<ID>
  const shortsOrEmbed = pathname.match(/^\/(shorts|embed)\/([^/?#]+)/);
  if (shortsOrEmbed) {
    const id = cleanId(shortsOrEmbed[2]);
    if (YOUTUBE_VIDEO_ID_REGEX.test(id)) {
      const startQuery = startSeconds ? `&start=${startSeconds}` : "";
      return {
        kind: "video",
        videoId: id,
        startSeconds,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${startQuery}&playsinline=1`,
        canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
    return null;
  }

  // 4. Playlist only: /playlist?list=<ID>
  if (pathname === "/playlist") {
    const listId = cleanId(searchParams.get("list"));
    if (listId && YOUTUBE_PLAYLIST_ID_REGEX.test(listId)) {
      return {
        kind: "playlist",
        playlistId: listId,
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&rel=0&modestbranding=1&playsinline=1`,
        canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      };
    }
    return null;
  }

  return null;
}

/**
 * Sanitizes user-inputted video title: strips control chars, trims, caps length.
 */
export function sanitizeCustomTitle(title: string | null | undefined): string {
  if (!title || typeof title !== "string") return "";
  return title.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, MAX_CUSTOM_VIDEO_TITLE_LENGTH);
}

/**
 * Sanitizes user-inputted video notes: strips control chars, trims, caps length.
 */
export function sanitizeCustomNotes(notes: string | null | undefined): string {
  if (!notes || typeof notes !== "string") return "";
  return notes.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, MAX_CUSTOM_VIDEO_NOTES_LENGTH);
}

/**
 * Serializes custom videos into a versioned JSON string.
 */
export function serializeCustomVideos(videos: CustomNurseryVideo[]): string {
  const payload: SerializedCustomVideosPayload = {
    version: CUSTOM_VIDEOS_PAYLOAD_VERSION,
    videos: videos.slice(0, MAX_CUSTOM_VIDEOS),
  };
  return JSON.stringify(payload);
}

/**
 * Deserializes custom videos from JSON.
 * Validates payload version and re-validates each video against the parser.
 */
export function deserializeCustomVideos(rawJson: string | null | undefined): CustomNurseryVideo[] {
  if (!rawJson || typeof rawJson !== "string") return [];

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") return [];
    if (parsed.version !== CUSTOM_VIDEOS_PAYLOAD_VERSION) return [];
    if (!Array.isArray(parsed.videos)) return [];

    const validVideos: CustomNurseryVideo[] = [];
    const seenIds = new Set<string>();

    for (const v of parsed.videos) {
      if (!v || typeof v !== "object") continue;
      const c = v as Record<string, unknown>;
      if (typeof c.id !== "string" || typeof c.title !== "string" || typeof c.youtubeUrl !== "string") {
        continue;
      }

      // Re-validate URL
      const reParsed = parseYouTubeUrl(c.youtubeUrl);
      if (!reParsed) continue;

      const dedupeKey = reParsed.kind === "video" ? reParsed.videoId : reParsed.playlistId;
      if (seenIds.has(dedupeKey)) continue;
      seenIds.add(dedupeKey);

      validVideos.push({
        id: c.id,
        title: sanitizeCustomTitle(c.title),
        youtubeUrl: c.youtubeUrl,
        kind: reParsed.kind,
        videoId: reParsed.kind === "video" ? reParsed.videoId : null,
        playlistId: reParsed.kind === "playlist" ? reParsed.playlistId : null,
        startSeconds: reParsed.kind === "video" ? reParsed.startSeconds : undefined,
        embedUrl: reParsed.embedUrl,
        canonicalUrl: reParsed.canonicalUrl,
        categoryId: typeof c.categoryId === "string" ? c.categoryId : undefined,
        ageRange: typeof c.ageRange === "string" ? (c.ageRange as NurseryAgeRange) : undefined,
        notes: typeof c.notes === "string" ? sanitizeCustomNotes(c.notes) : undefined,
        createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
        updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : new Date().toISOString(),
      });

      if (validVideos.length >= MAX_CUSTOM_VIDEOS) break;
    }

    return validVideos;
  } catch {
    return [];
  }
}

/**
 * Serializes attached video map for curated items.
 */
export function serializeAttachedVideos(map: Record<string, AttachedVideoRecord>): string {
  const payload: SerializedAttachedVideosPayload = {
    version: ATTACHED_VIDEOS_PAYLOAD_VERSION,
    attached: map,
  };
  return JSON.stringify(payload);
}

/**
 * Deserializes attached video map for curated items.
 * Drops records with invalid YouTube URLs.
 */
export function deserializeAttachedVideos(
  rawJson: string | null | undefined
): Record<string, AttachedVideoRecord> {
  if (!rawJson || typeof rawJson !== "string") return {};

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.version !== ATTACHED_VIDEOS_PAYLOAD_VERSION) return {};
    if (!parsed.attached || typeof parsed.attached !== "object") return {};

    const cleanMap: Record<string, AttachedVideoRecord> = {};
    for (const [itemId, record] of Object.entries(parsed.attached)) {
      if (!record || typeof record !== "object") continue;
      const r = record as Record<string, unknown>;
      if (typeof r.youtubeUrl !== "string") continue;

      const reParsed = parseYouTubeUrl(r.youtubeUrl);
      if (!reParsed) continue;

      cleanMap[itemId] = {
        youtubeUrl: r.youtubeUrl,
        kind: reParsed.kind,
        videoId: reParsed.kind === "video" ? reParsed.videoId : null,
        playlistId: reParsed.kind === "playlist" ? reParsed.playlistId : null,
        embedUrl: reParsed.embedUrl,
        canonicalUrl: reParsed.canonicalUrl,
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
      };
    }

    return cleanMap;
  } catch {
    return {};
  }
}

