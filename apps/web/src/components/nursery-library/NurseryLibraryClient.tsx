"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  Edit2,
  ExternalLink,
  Film,
  Filter,
  GraduationCap,
  Heart,
  Info,
  Link as LinkIcon,
  ListPlus,
  Moon,
  Music,
  Play,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Tv,
  Unlink,
  Volume2,
  X,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type {
  NurseryCategory,
  NurseryItemType,
  NurseryLibraryData,
  NurseryLibraryItem,
  Playlist,
  NurseryAgeRange,
} from "@/lib/nursery-library/types";
import {
  MAX_PLAYLISTS,
  addToPlaylist,
  buildEmbedUrl,
  buildSearchUrl,
  createPlaylist,
  deletePlaylist,
  deserializePlaylists,
  filterItems,
  isValidYoutubeId,
  moveInPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  serializePlaylists,
} from "@/lib/nursery-library/rules";
import {
  parseYouTubeUrl,
  sanitizeCustomTitle,
  sanitizeCustomNotes,
  serializeCustomVideos,
  deserializeCustomVideos,
  serializeAttachedVideos,
  deserializeAttachedVideos,
  STORAGE_KEY_CUSTOM_VIDEOS,
  STORAGE_KEY_ATTACHED_VIDEOS,
  MAX_CUSTOM_VIDEOS,
  MAX_CUSTOM_VIDEO_TITLE_LENGTH,
  MAX_CUSTOM_VIDEO_NOTES_LENGTH,
  type CustomNurseryVideo,
  type AttachedVideoRecord,
  type YouTubeParsed,
} from "@/lib/nursery-library/youtube";

interface NurseryLibraryClientProps {
  institute: string;
  studentName: string;
  programCode: string;
  programName?: string;
  initialData: NurseryLibraryData;
}

const STORAGE_KEY_FAVORITES = "cdm_beced_favorites_v1";
const STORAGE_KEY_PLAYLISTS = "cdm_beced_playlists_v1";

export default function NurseryLibraryClient({
  institute,
  studentName,
  programCode,
  programName,
  initialData,
}: NurseryLibraryClientProps) {
  const [activeTab, setActiveTab] = useState<"library" | "videos" | "playlists">("library");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedAgeRange, setSelectedAgeRange] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Active embedded players in curated cards (click-to-load)
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(new Set());

  // Playlist UI state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState("");

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Add to playlist dropdown popover (item id)
  const [popoverItemId, setPopoverItemId] = useState<string | null>(null);

  // Custom Videos state
  const [customVideos, setCustomVideos] = useState<CustomNurseryVideo[]>([]);
  // Attached Videos state (for curated items)
  const [attachedVideos, setAttachedVideos] = useState<Record<string, AttachedVideoRecord>>({});

  // Add / Edit Video Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "attach">("add");
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [attachingCuratedId, setAttachingCuratedId] = useState<string | null>(null);

  // Modal Form Inputs
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("all");
  const [formAgeRange, setFormAgeRange] = useState("all");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingCustomVideo, setDeletingCustomVideo] = useState<CustomNurseryVideo | null>(null);

  // Full-screen / Overlay Player Modal state
  const [playingMedia, setPlayingMedia] = useState<{
    title: string;
    embedUrl: string;
    canonicalUrl: string;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const playerModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const categorySelectId = useId();
  const languageSelectId = useId();
  const ageSelectId = useId();
  const typeSelectId = useId();
  const searchInputId = useId();

  // Valid item IDs include both curated items and custom saved videos
  const validItemIds = useMemo(() => {
    const ids = new Set(initialData.items.map((i) => i.id));
    for (const v of customVideos) {
      ids.add(v.id);
    }
    return ids;
  }, [initialData.items, customVideos]);

  // Combined item map for playlist lookup and details
  const combinedItemMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        title: string;
        categoryId?: string;
        language?: string;
        ageRange?: string;
        type?: string;
        embedUrl?: string | null;
        canonicalUrl?: string | null;
        searchQuery?: string;
        isCustom: boolean;
      }
    >();

    for (const item of initialData.items) {
      const att = attachedVideos[item.id];
      const hasDirectYt = isValidYoutubeId(item.youtubeId);
      const embedUrl = att ? att.embedUrl : hasDirectYt ? buildEmbedUrl(item.youtubeId) : null;
      const canonicalUrl = att
        ? att.canonicalUrl
        : hasDirectYt
        ? `https://www.youtube.com/watch?v=${item.youtubeId}`
        : null;

      map.set(item.id, {
        id: item.id,
        title: item.title,
        categoryId: item.categoryId,
        language: item.language,
        ageRange: item.ageRange,
        type: item.type,
        embedUrl,
        canonicalUrl,
        searchQuery: item.searchQuery,
        isCustom: false,
      });
    }

    for (const v of customVideos) {
      map.set(v.id, {
        id: v.id,
        title: v.title,
        categoryId: v.categoryId,
        language: "Filipino / English",
        ageRange: v.ageRange || "All",
        type: v.kind === "playlist" ? "playlist" : "educational-video",
        embedUrl: v.embedUrl,
        canonicalUrl: v.canonicalUrl,
        isCustom: true,
      });
    }

    return map;
  }, [initialData.items, attachedVideos, customVideos]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // 1. Favorites
      const storedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (storedFavs) {
        const parsed = JSON.parse(storedFavs);
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed.filter((id) => typeof id === "string")));
        }
      }

      // 2. Custom Videos
      let loadedCustomVideos: CustomNurseryVideo[] = [];
      const storedVideos = localStorage.getItem(STORAGE_KEY_CUSTOM_VIDEOS);
      if (storedVideos) {
        loadedCustomVideos = deserializeCustomVideos(storedVideos);
        setCustomVideos(loadedCustomVideos);
      }

      // 3. Attached Videos
      const storedAttached = localStorage.getItem(STORAGE_KEY_ATTACHED_VIDEOS);
      if (storedAttached) {
        const deserializedAttached = deserializeAttachedVideos(storedAttached);
        setAttachedVideos(deserializedAttached);
      }

      // 4. Playlists
      const storedPlaylists = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      if (storedPlaylists) {
        const initialValidIds = new Set(initialData.items.map((i) => i.id));
        for (const v of loadedCustomVideos) {
          initialValidIds.add(v.id);
        }
        const deserialized = deserializePlaylists(storedPlaylists, initialValidIds);
        setPlaylists(deserialized);
        if (deserialized.length > 0) {
          setActivePlaylistId(deserialized[0].id);
        }
      }
    } catch {
      // Graceful fallback if localStorage is disabled or restricted
    }
  }, [initialData.items]);

  // Keyboard accessibility for modals: Escape key closes modal & focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (playingMedia) {
          setPlayingMedia(null);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (deletingCustomVideo) {
          setDeletingCustomVideo(null);
        } else if (popoverItemId) {
          setPopoverItemId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playingMedia, isAddModalOpen, deletingCustomVideo, popoverItemId]);

  // Auto-focus input when Add/Edit modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 50);
    }
  }, [isAddModalOpen]);

  // Persist favorites
  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      try {
        localStorage.setItem(
          STORAGE_KEY_FAVORITES,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Storage failed
      }
      return next;
    });
  };

  // Persist playlists
  const updatePlaylists = (newPlaylists: Playlist[]) => {
    setPlaylists(newPlaylists);
    try {
      localStorage.setItem(
        STORAGE_KEY_PLAYLISTS,
        serializePlaylists(newPlaylists)
      );
    } catch {
      // Storage failed
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setPlaylistError(null);
    const result = createPlaylist(newPlaylistName, playlists);
    if (!result.ok) {
      setPlaylistError(result.error);
      return;
    }
    const updated = [...playlists, result.playlist];
    updatePlaylists(updated);
    setActivePlaylistId(result.playlist.id);
    setNewPlaylistName("");
  };

  const handleRenamePlaylist = (playlistId: string) => {
    if (!editPlaylistName.trim()) return;
    const updated = renamePlaylist(playlistId, editPlaylistName, playlists);
    updatePlaylists(updated);
    setEditingPlaylistId(null);
    setEditPlaylistName("");
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = deletePlaylist(playlistId, playlists);
    updatePlaylists(updated);
    if (activePlaylistId === playlistId) {
      setActivePlaylistId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleAddToPlaylist = (playlistId: string, itemId: string) => {
    const updated = addToPlaylist(playlistId, itemId, playlists);
    updatePlaylists(updated);
    setPopoverItemId(null);
  };

  const handleRemoveFromPlaylist = (playlistId: string, itemId: string) => {
    const updated = removeFromPlaylist(playlistId, itemId, playlists);
    updatePlaylists(updated);
  };

  const handleMoveInPlaylist = (
    playlistId: string,
    itemId: string,
    direction: "up" | "down"
  ) => {
    const updated = moveInPlaylist(playlistId, itemId, direction, playlists);
    updatePlaylists(updated);
  };

  // ── CUSTOM VIDEO ACTIONS ──

  // Live parsed YouTube link preview
  const parsedPreview: YouTubeParsed | null = useMemo(() => {
    if (!formUrl.trim()) return null;
    return parseYouTubeUrl(formUrl);
  }, [formUrl]);

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingVideoId(null);
    setAttachingCuratedId(null);
    setFormUrl("");
    setFormTitle("");
    setFormCategory("all");
    setFormAgeRange("all");
    setFormNotes("");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (video: CustomNurseryVideo) => {
    setModalMode("edit");
    setEditingVideoId(video.id);
    setAttachingCuratedId(null);
    setFormUrl(video.youtubeUrl);
    setFormTitle(video.title);
    setFormCategory(video.categoryId || "all");
    setFormAgeRange(video.ageRange || "all");
    setFormNotes(video.notes || "");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenAttachModal = (item: NurseryLibraryItem) => {
    setModalMode("attach");
    setEditingVideoId(null);
    setAttachingCuratedId(item.id);
    const existing = attachedVideos[item.id];
    setFormUrl(existing?.youtubeUrl || "");
    setFormTitle(item.title);
    setFormCategory(item.categoryId);
    setFormAgeRange(item.ageRange);
    setFormNotes("");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = sanitizeCustomTitle(formTitle);
    if (!cleanTitle) {
      setFormError("Title is required (max 80 characters).");
      return;
    }

    const parsed = parseYouTubeUrl(formUrl);
    if (!parsed) {
      setFormError("That doesn't look like a valid YouTube link.");
      return;
    }

    const cleanNotes = sanitizeCustomNotes(formNotes);
    const categoryId = formCategory !== "all" ? formCategory : undefined;
    const ageRange = formAgeRange !== "all" ? (formAgeRange as NurseryAgeRange) : undefined;
    const dedupeKey = parsed.kind === "video" ? parsed.videoId : parsed.playlistId;

    if (modalMode === "attach") {
      if (!attachingCuratedId) return;
      const record: AttachedVideoRecord = {
        youtubeUrl: formUrl.trim(),
        kind: parsed.kind,
        videoId: parsed.kind === "video" ? parsed.videoId : null,
        playlistId: parsed.kind === "playlist" ? parsed.playlistId : null,
        embedUrl: parsed.embedUrl,
        canonicalUrl: parsed.canonicalUrl,
        updatedAt: new Date().toISOString(),
      };
      const updatedAttached = { ...attachedVideos, [attachingCuratedId]: record };
      setAttachedVideos(updatedAttached);
      try {
        localStorage.setItem(STORAGE_KEY_ATTACHED_VIDEOS, serializeAttachedVideos(updatedAttached));
      } catch {
        // storage failed
      }
      setIsAddModalOpen(false);
      return;
    }

    if (modalMode === "add") {
      if (customVideos.length >= MAX_CUSTOM_VIDEOS) {
        setFormError(`Maximum limit of ${MAX_CUSTOM_VIDEOS} saved videos reached.`);
        return;
      }

      // Check duplicate
      const isDuplicate = customVideos.some(
        (v) => (v.kind === "video" ? v.videoId : v.playlistId) === dedupeKey
      );
      if (isDuplicate) {
        setFormError("This video is already in your saved videos.");
        return;
      }

      const now = new Date().toISOString();
      const newVideo: CustomNurseryVideo = {
        id: `custom-yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        youtubeUrl: formUrl.trim(),
        kind: parsed.kind,
        videoId: parsed.kind === "video" ? parsed.videoId : null,
        playlistId: parsed.kind === "playlist" ? parsed.playlistId : null,
        startSeconds: parsed.kind === "video" ? parsed.startSeconds : undefined,
        embedUrl: parsed.embedUrl,
        canonicalUrl: parsed.canonicalUrl,
        categoryId,
        ageRange,
        notes: cleanNotes || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newVideo, ...customVideos];
      setCustomVideos(updated);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_VIDEOS, serializeCustomVideos(updated));
      } catch {
        // storage failed
      }
      setActiveTab("videos");
      setIsAddModalOpen(false);
      return;
    }

    if (modalMode === "edit") {
      if (!editingVideoId) return;

      // Check duplicate if video id changed
      const isDuplicate = customVideos.some(
        (v) => v.id !== editingVideoId && (v.kind === "video" ? v.videoId : v.playlistId) === dedupeKey
      );
      if (isDuplicate) {
        setFormError("This video is already in your saved videos.");
        return;
      }

      const updated = customVideos.map((v) => {
        if (v.id !== editingVideoId) return v;
        return {
          ...v,
          title: cleanTitle,
          youtubeUrl: formUrl.trim(),
          kind: parsed.kind,
          videoId: parsed.kind === "video" ? parsed.videoId : null,
          playlistId: parsed.kind === "playlist" ? parsed.playlistId : null,
          startSeconds: parsed.kind === "video" ? parsed.startSeconds : undefined,
          embedUrl: parsed.embedUrl,
          canonicalUrl: parsed.canonicalUrl,
          categoryId,
          ageRange,
          notes: cleanNotes || undefined,
          updatedAt: new Date().toISOString(),
        };
      });

      setCustomVideos(updated);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_VIDEOS, serializeCustomVideos(updated));
      } catch {
        // storage failed
      }
      setActiveTab("videos");
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteCustomVideo = (video: CustomNurseryVideo) => {
    setDeletingCustomVideo(video);
  };

  const confirmDeleteCustomVideo = () => {
    if (!deletingCustomVideo) return;
    const videoId = deletingCustomVideo.id;
    const updated = customVideos.filter((v) => v.id !== videoId);
    setCustomVideos(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_VIDEOS, serializeCustomVideos(updated));
    } catch {
      // storage failed
    }

    // Also remove from any playlists that contained it
    const updatedPlaylists = playlists.map((pl) => ({
      ...pl,
      itemIds: pl.itemIds.filter((id) => id !== videoId),
    }));
    updatePlaylists(updatedPlaylists);

    setDeletingCustomVideo(null);
  };

  const handleDetachVideo = (itemId: string) => {
    const updated = { ...attachedVideos };
    delete updated[itemId];
    setAttachedVideos(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ATTACHED_VIDEOS, serializeAttachedVideos(updated));
    } catch {
      // storage failed
    }
  };

  // Trigger inline / overlay player
  const handleWatch = (item: {
    title: string;
    embedUrl: string;
    canonicalUrl: string;
  }) => {
    setPlayingMedia(item);
  };

  // Filter curated library items
  const filteredItems = useMemo(() => {
    return filterItems(
      initialData.items,
      {
        query: searchQuery,
        categoryId: selectedCategory,
        language: selectedLanguage,
        ageRange: selectedAgeRange,
        type: selectedType,
        onlyFavorites,
        favoriteIds: favorites,
      },
      initialData.categories
    );
  }, [
    initialData.items,
    initialData.categories,
    searchQuery,
    selectedCategory,
    selectedLanguage,
    selectedAgeRange,
    selectedType,
    onlyFavorites,
    favorites,
  ]);

  // Filter custom videos
  const filteredCustomVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customVideos.filter((v) => {
      if (onlyFavorites && !favorites.has(v.id)) return false;
      if (selectedCategory !== "all" && v.categoryId !== selectedCategory) return false;
      if (selectedAgeRange !== "all" && v.ageRange !== selectedAgeRange) return false;
      if (q) {
        const titleMatch = v.title.toLowerCase().includes(q);
        const notesMatch = (v.notes || "").toLowerCase().includes(q);
        if (!titleMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [customVideos, searchQuery, onlyFavorites, favorites, selectedCategory, selectedAgeRange]);

  const activePlaylist = useMemo(() => {
    return playlists.find((p) => p.id === activePlaylistId) || null;
  }, [playlists, activePlaylistId]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== "all" ||
    selectedLanguage !== "all" ||
    selectedAgeRange !== "all" ||
    selectedType !== "all" ||
    onlyFavorites;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedLanguage("all");
    setSelectedAgeRange("all");
    setSelectedType("all");
    setOnlyFavorites(false);
  };

  const getCategoryTint = (categoryId?: string | null) => {
    switch (categoryId) {
      case "filipino-folk-songs":
        return {
          bg: "bg-rose-100/90 dark:bg-rose-950/60",
          text: "text-rose-800 dark:text-rose-300",
          border: "border-rose-200/80 dark:border-rose-700/40",
        };
      case "counting-and-numbers":
        return {
          bg: "bg-sky-100/90 dark:bg-sky-950/60",
          text: "text-sky-800 dark:text-sky-300",
          border: "border-sky-200/80 dark:border-sky-700/40",
        };
      case "alphabet-and-letters":
        return {
          bg: "bg-teal-100/90 dark:bg-teal-950/60",
          text: "text-teal-800 dark:text-teal-300",
          border: "border-teal-200/80 dark:border-teal-700/40",
        };
      case "animals-and-nature":
        return {
          bg: "bg-amber-100/90 dark:bg-amber-950/60",
          text: "text-amber-900 dark:text-amber-300",
          border: "border-amber-200/80 dark:border-amber-700/40",
        };
      case "body-parts-and-movement":
        return {
          bg: "bg-violet-100/90 dark:bg-violet-950/60",
          text: "text-violet-800 dark:text-violet-300",
          border: "border-violet-200/80 dark:border-violet-700/40",
        };
      case "daily-routines-and-good-habits":
        return {
          bg: "bg-teal-100/90 dark:bg-teal-950/60",
          text: "text-teal-800 dark:text-teal-300",
          border: "border-teal-200/80 dark:border-teal-700/40",
        };
      case "lullabies-and-bedtime":
        return {
          bg: "bg-violet-100/90 dark:bg-violet-950/60",
          text: "text-violet-800 dark:text-violet-300",
          border: "border-violet-200/80 dark:border-violet-700/40",
        };
      case "educational-videos":
      default:
        return {
          bg: "bg-sky-100/90 dark:bg-sky-950/60",
          text: "text-sky-800 dark:text-sky-300",
          border: "border-sky-200/80 dark:border-sky-700/40",
        };
    }
  };

  const getItemTypeBadge = (type: NurseryItemType) => {
    switch (type) {
      case "song":
        return { label: "Song", icon: Music, color: "bg-pink-100/90 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border border-pink-200/80 dark:border-pink-700/40" };
      case "rhyme":
        return { label: "Rhyme", icon: Volume2, color: "bg-violet-100/90 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-700/40" };
      case "lullaby":
        return { label: "Lullaby", icon: Moon, color: "bg-indigo-100/90 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-700/40" };
      case "educational-video":
        return { label: "Educational Video", icon: Film, color: "bg-sky-100/90 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-700/40" };
    }
  };

  const categoryMap = useMemo(() => {
    return new Map(initialData.categories.map((c) => [c.id, c.name]));
  }, [initialData.categories]);

  return (
    <div className="space-y-6">
      {/* ── Nursery Library Scoped Motion & Animation Styles (honors prefers-reduced-motion) ── */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          /* Noticeable yet gentle idle animations for Tab Icons */
          @keyframes nurseryIconSway {
            0%, 100% {
              transform: translateY(0px) rotate(-8deg);
            }
            50% {
              transform: translateY(-3px) rotate(8deg);
            }
          }
          @keyframes nurseryIconPulse {
            0%, 100% {
              transform: scale(1) translateY(0px);
              opacity: 0.9;
            }
            50% {
              transform: scale(1.15) translateY(-2px);
              opacity: 1;
            }
          }
          @keyframes nurseryIconFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-3px);
            }
          }

          /* Interactive Card Hover Keyframes (Single trigger on hover, 150-400ms) */
          @keyframes nurseryCardIconWiggle {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(-9deg) scale(1.08); }
            75% { transform: rotate(9deg) scale(1.08); }
            100% { transform: rotate(0deg) scale(1); }
          }
          @keyframes nurseryHeartPop {
            0% { transform: scale(1); }
            40% { transform: scale(1.28); }
            70% { transform: scale(0.92); }
            100% { transform: scale(1); }
          }
          @keyframes nurseryPlaylistSlide {
            0% { transform: translateX(0); }
            50% { transform: translateX(3px); }
            100% { transform: translateX(0); }
          }
          @keyframes nurseryPlayGlow {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
            }
            50% {
              transform: scale(1.08);
              box-shadow: 0 0 16px 3px rgba(245, 158, 11, 0.45);
            }
            100% {
              transform: scale(1.05);
              box-shadow: 0 0 8px 1px rgba(245, 158, 11, 0.3);
            }
          }

          /* Applied utility classes for tab & card icons */
          .nursery-idle-sway {
            display: inline-block;
            animation: nurseryIconSway 2.8s ease-in-out infinite;
            transform-origin: center bottom;
            will-change: transform;
          }
          .nursery-idle-pulse {
            display: inline-block;
            animation: nurseryIconPulse 2.6s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }
          .nursery-idle-float {
            display: inline-block;
            animation: nurseryIconFloat 2.4s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform;
          }

          .group:hover .nursery-hover-wiggle {
            animation: nurseryCardIconWiggle 400ms ease-in-out;
          }
          .group:hover .nursery-hover-slide {
            animation: nurseryPlaylistSlide 300ms ease-in-out;
          }
          .group:hover .nursery-hover-playglow {
            animation: nurseryPlayGlow 400ms ease-in-out forwards;
          }
          .nursery-heart-pop {
            animation: nurseryHeartPop 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          /* Hero Decorative Music Scene Keyframes */
          @keyframes nurseryVinylSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .nursery-vinyl-disc {
            animation: nurseryVinylSpin 8s linear infinite;
            transform-origin: 60px 60px;
            will-change: transform;
          }

          @keyframes nurseryNoteFloat1 {
            0% { transform: translateY(0px) scale(0.85); opacity: 0; }
            20% { opacity: 0.95; }
            75% { opacity: 0.85; }
            100% { transform: translateY(-26px) scale(1.05); opacity: 0; }
          }
          @keyframes nurseryNoteFloat2 {
            0% { transform: translateY(0px) scale(0.85); opacity: 0; }
            20% { opacity: 0.95; }
            75% { opacity: 0.85; }
            100% { transform: translateY(-30px) scale(1.08); opacity: 0; }
          }
          @keyframes nurseryNoteFloat3 {
            0% { transform: translateY(0px) scale(0.85); opacity: 0; }
            20% { opacity: 0.95; }
            75% { opacity: 0.85; }
            100% { transform: translateY(-24px) scale(1.04); opacity: 0; }
          }
          @keyframes nurseryNoteFloat4 {
            0% { transform: translateY(0px) scale(0.85); opacity: 0; }
            20% { opacity: 0.95; }
            75% { opacity: 0.85; }
            100% { transform: translateY(-26px) scale(1.06); opacity: 0; }
          }
          .nursery-music-note-1 { animation: nurseryNoteFloat1 3.2s ease-out infinite; will-change: transform, opacity; }
          .nursery-music-note-2 { animation: nurseryNoteFloat2 3.4s ease-out 0.85s infinite; will-change: transform, opacity; }
          .nursery-music-note-3 { animation: nurseryNoteFloat3 3.0s ease-out 1.7s infinite; will-change: transform, opacity; }
          .nursery-music-note-4 { animation: nurseryNoteFloat4 3.2s ease-out 2.5s infinite; will-change: transform, opacity; }

          @keyframes nurseryEqBounce1 {
            0% { transform: scaleY(0.35); }
            100% { transform: scaleY(0.95); }
          }
          @keyframes nurseryEqBounce2 {
            0% { transform: scaleY(0.20); }
            100% { transform: scaleY(1.00); }
          }
          @keyframes nurseryEqBounce3 {
            0% { transform: scaleY(0.40); }
            100% { transform: scaleY(0.85); }
          }
          @keyframes nurseryEqBounce4 {
            0% { transform: scaleY(0.25); }
            100% { transform: scaleY(0.92); }
          }
          @keyframes nurseryEqBounce5 {
            0% { transform: scaleY(0.30); }
            100% { transform: scaleY(0.80); }
          }
          .nursery-eq-bar-1 { animation: nurseryEqBounce1 0.85s ease-in-out infinite alternate; will-change: transform; }
          .nursery-eq-bar-2 { animation: nurseryEqBounce2 1.15s ease-in-out infinite alternate; will-change: transform; }
          .nursery-eq-bar-3 { animation: nurseryEqBounce3 0.70s ease-in-out infinite alternate; will-change: transform; }
          .nursery-eq-bar-4 { animation: nurseryEqBounce4 0.95s ease-in-out infinite alternate; will-change: transform; }
          .nursery-eq-bar-5 { animation: nurseryEqBounce5 1.25s ease-in-out infinite alternate; will-change: transform; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nursery-idle-sway,
          .nursery-idle-pulse,
          .nursery-idle-float,
          .nursery-hover-wiggle,
          .nursery-hover-slide,
          .nursery-hover-playglow,
          .nursery-heart-pop,
          .nursery-vinyl-disc,
          .nursery-music-note-1,
          .nursery-music-note-2,
          .nursery-music-note-3,
          .nursery-music-note-4,
          .nursery-eq-bar-1,
          .nursery-eq-bar-2,
          .nursery-eq-bar-3,
          .nursery-eq-bar-4,
          .nursery-eq-bar-5 {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── HERO BANNER (Violet-Sky gentle gradient) ── */}
      <section
        aria-labelledby="nursery-library-heading"
        className="relative overflow-hidden rounded-2xl border border-violet-200/80 dark:border-violet-500/25 bg-gradient-to-br from-[#ede9fe]/80 via-[#f5f3ff]/70 to-[#e0f2fe]/80 dark:from-[#1e1b4b]/60 dark:via-[#172554]/40 dark:to-[#0c4a6e]/50 p-6 sm:p-8 shadow-xs"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left Text / Info Content */}
          <div className="space-y-4 max-w-2xl min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-sky-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 nursery-idle-float inline-block" aria-hidden="true" />
                <span>{programCode}</span>
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {programName || "Bachelor of Early Childhood Education"}
              </span>
            </div>

            <div>
              <h1
                id="nursery-library-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                Nursery Song &amp; Educational Media Library
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                Curated public-domain traditional folk songs, fingerplays, rhymes, and educational
                media resources curated for early childhood pre-service teachers.
              </p>
            </div>

            {/* Hero Note */}
            <div
              role="note"
              className="flex items-start sm:items-center gap-2.5 rounded-xl border border-violet-300/70 dark:border-violet-500/30 bg-violet-50/80 dark:bg-violet-950/40 p-3.5 text-xs text-violet-950 dark:text-violet-200"
            >
              <Info className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-violet-600 dark:text-violet-400" />
              <span className="font-medium">
                Teaching resources for early childhood lessons. Add YouTube videos or attach them to curated rhymes to stream directly inside the LMS.
              </span>
            </div>
          </div>

          {/* Right Music Scene Illustration (hidden on <640px to prevent title cramping; 170-210px on md/lg) */}
          <div
            className="hidden sm:flex shrink-0 items-center justify-center self-center md:self-auto pointer-events-none select-none"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 210 120"
              className="w-40 sm:w-48 md:w-52 h-auto max-h-28 overflow-visible select-none"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <linearGradient id="nurseryVinylGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="nurserySheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                </linearGradient>
              </defs>

              {/* VINYL RECORD (center 60, 60, radius 44) */}
              <g className="nursery-vinyl-disc" style={{ transformOrigin: "60px 60px" }}>
                {/* Outer Vinyl Body */}
                <circle cx="60" cy="60" r="44" className="fill-slate-900 dark:fill-slate-950 stroke-violet-300/40 dark:stroke-violet-500/30" strokeWidth="1.5" />
                {/* Sound Grooves */}
                <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" className="text-white/10 dark:text-white/15" strokeWidth="0.75" />
                <circle cx="60" cy="60" r="32" fill="none" stroke="currentColor" className="text-white/10 dark:text-white/15" strokeWidth="0.75" />
                <circle cx="60" cy="60" r="26" fill="none" stroke="currentColor" className="text-white/10 dark:text-white/15" strokeWidth="0.75" />
                {/* Light reflection wedge / sheen */}
                <path d="M 60 60 L 29 29 A 44 44 0 0 1 91 29 Z" fill="url(#nurserySheenGrad)" />
                <path d="M 60 60 L 91 91 A 44 44 0 0 1 29 91 Z" fill="url(#nurserySheenGrad)" />
                {/* Center Label */}
                <circle cx="60" cy="60" r="16" fill="url(#nurseryVinylGrad)" />
                {/* Label concentric accent */}
                <circle cx="60" cy="60" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                {/* Spindle hole */}
                <circle cx="60" cy="60" r="3.5" className="fill-slate-950 dark:fill-slate-900" />
                {/* Music Note on label (visualizes continuous spinning) */}
                <path
                  d="M 63 53 L 63 64 A 2.5 2.5 0 1 1 60.5 61.5 L 63 61.5 L 63 53 Z"
                  fill="#ffffff"
                />
              </g>

              {/* FLOATING NOTES (staggered upward motion) */}
              <g className="nursery-music-note-1" transform="translate(108, 62)" style={{ opacity: 0.85 }}>
                <path d="M 4 2 L 4 13 A 3 2.5 0 1 1 1 10.5 L 4 10.5 L 4 2 L 10 0 L 10 3 Z" className="fill-violet-600 dark:fill-violet-400" />
              </g>
              <g className="nursery-music-note-2" transform="translate(86, 38)" style={{ opacity: 0.85 }}>
                <path d="M 3 4 L 3 14 A 2.5 2 0 1 1 0.5 12 L 3 12 L 3 4 L 11 1 L 11 11 A 2.5 2 0 1 1 8.5 9 L 11 9 L 11 3 Z" className="fill-sky-500 dark:fill-sky-400" />
              </g>
              <g className="nursery-music-note-3" transform="translate(122, 42)" style={{ opacity: 0.85 }}>
                <path d="M 3 2 L 3 13 A 3 2.5 0 1 1 0 10.5 L 3 10.5 L 3 2 Z" className="fill-amber-500 dark:fill-amber-400" />
              </g>
              <g className="nursery-music-note-4" transform="translate(98, 18)" style={{ opacity: 0.85 }}>
                <path d="M 3 2 L 3 11 A 2.5 2 0 1 1 0.5 9 L 3 9 L 3 2 L 8 0.5 L 8 3 Z" className="fill-rose-500 dark:fill-rose-400" />
              </g>

              {/* 5-BAR EQUALIZER (desynchronized bouncy scaleY) */}
              <rect x="142" y="52" width="7" height="42" rx="3.5" className="fill-violet-600 dark:fill-violet-400 nursery-eq-bar-1" style={{ transformOrigin: "145.5px 94px" }} />
              <rect x="154" y="44" width="7" height="50" rx="3.5" className="fill-sky-600 dark:fill-sky-400 nursery-eq-bar-2" style={{ transformOrigin: "157.5px 94px" }} />
              <rect x="166" y="58" width="7" height="36" rx="3.5" className="fill-amber-500 dark:fill-amber-400 nursery-eq-bar-3" style={{ transformOrigin: "169.5px 94px" }} />
              <rect x="178" y="48" width="7" height="46" rx="3.5" className="fill-teal-600 dark:fill-teal-400 nursery-eq-bar-4" style={{ transformOrigin: "181.5px 94px" }} />
              <rect x="190" y="62" width="7" height="32" rx="3.5" className="fill-blue-600 dark:fill-sky-300 nursery-eq-bar-5" style={{ transformOrigin: "193.5px 94px" }} />
            </svg>
          </div>
        </div>
      </section>

      {/* ── ACTION BUTTONS ROW (Directly Below Hero Box, left-aligned desktop, full-width mobile) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 cursor-pointer"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:rotate-90 motion-reduce:transform-none" aria-hidden="true" />
          <span>Add YouTube video</span>
        </button>

        <Link
          href={`/${institute}/lesson-plans`}
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200/80 dark:border-violet-500/30 bg-surface/80 hover:bg-violet-50/70 dark:hover:bg-violet-950/40 px-4 py-2.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme shadow-xs transition focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400 transition-transform duration-300 group-hover:scale-125 motion-reduce:transform-none" aria-hidden="true" />
          <span>Plan a lesson</span>
        </Link>
      </div>

      {/* ── TABS ── */}
      <div
        className="flex items-center overflow-x-auto no-scrollbar sm:overflow-visible border-b border-theme gap-1 sm:gap-2 pb-px"
        role="tablist"
        aria-label="Library Navigation"
      >
        {/* Tab 1: Curated Library */}
        <button
          type="button"
          role="tab"
          id="tab-library"
          aria-selected={activeTab === "library"}
          aria-controls="panel-library"
          tabIndex={activeTab === "library" ? 0 : -1}
          onClick={() => setActiveTab("library")}
          className={`relative shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "library"
              ? "text-violet-700 dark:text-sky-300"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <Music className="h-4 w-4 nursery-idle-sway text-violet-600 dark:text-sky-400" />
          <span>Library</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "library"
                ? "bg-violet-100 text-violet-800 dark:bg-sky-950/60 dark:text-sky-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {filteredItems.length}
          </span>
          {activeTab === "library" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-sky-500 rounded-t-full" />
          )}
        </button>

        {/* Tab 2: My Videos */}
        <button
          type="button"
          role="tab"
          id="tab-my-videos"
          aria-selected={activeTab === "videos"}
          aria-controls="panel-my-videos"
          tabIndex={activeTab === "videos" ? 0 : -1}
          onClick={() => setActiveTab("videos")}
          className={`relative shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "videos"
              ? "text-violet-700 dark:text-sky-300"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <Tv className="h-4 w-4 nursery-idle-pulse text-sky-600 dark:text-sky-400" />
          <span>My Videos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "videos"
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {customVideos.length}
          </span>
          {activeTab === "videos" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-sky-500 rounded-t-full" />
          )}
        </button>

        {/* Tab 3: My Playlists */}
        <button
          type="button"
          role="tab"
          id="tab-playlists"
          aria-selected={activeTab === "playlists"}
          aria-controls="panel-playlists"
          tabIndex={activeTab === "playlists" ? 0 : -1}
          onClick={() => setActiveTab("playlists")}
          className={`relative shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "playlists"
              ? "text-violet-700 dark:text-sky-300"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <ListPlus className="h-4 w-4 nursery-idle-float text-violet-600 dark:text-sky-400" />
          <span>My Playlists</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "playlists"
                ? "bg-violet-100 text-violet-800 dark:bg-sky-950/60 dark:text-sky-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {playlists.length}
          </span>
          {activeTab === "playlists" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-sky-500 rounded-t-full" />
          )}
        </button>
      </div>

      {/* ── TAB 1: CURATED LIBRARY ── */}
      {activeTab === "library" && (
        <div id="panel-library" role="tabpanel" aria-labelledby="tab-library" className="space-y-6">
          {/* Controls & Filter Bar */}
          <section
            aria-label="Library filters"
            className="rounded-2xl border border-theme bg-surface p-4 sm:p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-theme pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-theme">
                <Filter className="h-4 w-4" aria-hidden="true" />
                <span>Search and filter resources</span>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:text-violet-700 dark:hover:text-violet-300 hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Category */}
              <div className="space-y-1.5">
                <label htmlFor={categorySelectId} className="block text-xs font-semibold text-primary-theme">
                  Category
                </label>
                <select
                  id={categorySelectId}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Categories</option>
                  {initialData.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label htmlFor={languageSelectId} className="block text-xs font-semibold text-primary-theme">
                  Language
                </label>
                <select
                  id={languageSelectId}
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Languages</option>
                  <option value="Filipino">Filipino</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* Age Range */}
              <div className="space-y-1.5">
                <label htmlFor={ageSelectId} className="block text-xs font-semibold text-primary-theme">
                  Target Age
                </label>
                <select
                  id={ageSelectId}
                  value={selectedAgeRange}
                  onChange={(e) => setSelectedAgeRange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Ages</option>
                  <option value="2-3">Ages 2-3</option>
                  <option value="3-4">Ages 3-4</option>
                  <option value="4-5">Ages 4-5</option>
                  <option value="5-6">Ages 5-6</option>
                </select>
              </div>

              {/* Resource Type */}
              <div className="space-y-1.5">
                <label htmlFor={typeSelectId} className="block text-xs font-semibold text-primary-theme">
                  Format
                </label>
                <select
                  id={typeSelectId}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Formats</option>
                  <option value="song">Song</option>
                  <option value="rhyme">Rhyme</option>
                  <option value="lullaby">Lullaby</option>
                  <option value="educational-video">Educational Video</option>
                </select>
              </div>

              {/* Favorites Only toggle */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setOnlyFavorites((prev) => !prev)}
                  className={`w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    onlyFavorites
                      ? "border-amber-400/80 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                      : "border-theme bg-elevated text-secondary-theme hover:text-primary-theme"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${onlyFavorites ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 nursery-heart-pop" : ""}`} />
                  <span>Favorites Only</span>
                </button>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="relative pt-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-theme" />
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by song title, learning concept (e.g. counting, body parts)..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-theme bg-elevated text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </section>

          {/* Results Grid */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center space-y-3">
              <Music className="h-10 w-10 text-muted-theme" />
              <h3 className="text-base font-bold text-primary-theme">No resources matched your criteria</h3>
              <p className="text-xs sm:text-sm text-secondary-theme max-w-md">
                Try clearing your search keyword, adjusting age/language filters, or reset all filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredItems.map((item) => {
                const isFavorite = favorites.has(item.id);
                const attached = attachedVideos[item.id];
                const hasValidYoutube = isValidYoutubeId(item.youtubeId) || Boolean(attached);
                const embedUrl = attached ? attached.embedUrl : buildEmbedUrl(item.youtubeId);
                const canonicalUrl = attached
                  ? attached.canonicalUrl
                  : isValidYoutubeId(item.youtubeId)
                  ? `https://www.youtube.com/watch?v=${item.youtubeId}`
                  : null;
                const searchUrl = buildSearchUrl(item.searchQuery);
                const typeBadge = getItemTypeBadge(item.type);
                const TypeIcon = typeBadge.icon;
                const categoryTint = getCategoryTint(item.categoryId);
                const categoryName = categoryMap.get(item.categoryId) || item.categoryId;

                return (
                  <article
                    key={item.id}
                    className="group flex flex-col justify-between rounded-2xl border border-theme bg-surface hover:border-violet-400/60 dark:hover:border-sky-500/40 p-5 shadow-xs transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top badges and Favorite button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${typeBadge.color}`}
                          >
                            <TypeIcon className="h-3 w-3 nursery-hover-wiggle" />
                            <span>{typeBadge.label}</span>
                          </span>

                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryTint.bg} ${categoryTint.text} ${categoryTint.border}`}>
                            {categoryName}
                          </span>

                          <span className="inline-flex items-center rounded-md border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
                            {item.language}
                          </span>

                          <span className="inline-flex items-center rounded-md border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
                            Ages {item.ageRange}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Heart favorite button */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(item.id)}
                            aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                            aria-pressed={isFavorite}
                            className={`group/heart rounded-lg p-1.5 transition cursor-pointer ${
                              isFavorite
                                ? "text-amber-500 dark:text-amber-400 bg-amber-500/10"
                                : "text-secondary-theme hover:text-amber-500 hover:bg-elevated"
                            }`}
                          >
                            <Heart className={`h-4 w-4 transition-transform duration-200 ${isFavorite ? "fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400 nursery-heart-pop" : "group-hover/heart:scale-110"}`} />
                          </button>

                          {/* Add to playlist popover button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setPopoverItemId((curr) => (curr === item.id ? null : item.id))
                              }
                              aria-label={`Add ${item.title} to playlist`}
                              className="rounded-lg p-1.5 text-secondary-theme hover:text-sky-600 hover:bg-elevated transition cursor-pointer"
                            >
                              <ListPlus className="h-4 w-4 nursery-hover-slide" />
                            </button>

                            {popoverItemId === item.id && (
                              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-theme bg-elevated p-2 shadow-lg z-20 space-y-1 text-xs">
                                <div className="px-2 py-1 font-bold text-primary-theme border-b border-theme pb-1 mb-1">
                                  Add to playlist
                                </div>
                                {playlists.length === 0 ? (
                                  <div className="px-2 py-2 text-secondary-theme text-[11px]">
                                    No playlists yet. Create one under "My Playlists".
                                  </div>
                                ) : (
                                  playlists.map((pl) => {
                                    const inPlaylist = pl.itemIds.includes(item.id);
                                    return (
                                      <button
                                        key={pl.id}
                                        type="button"
                                        onClick={() =>
                                          inPlaylist
                                            ? handleRemoveFromPlaylist(pl.id, item.id)
                                            : handleAddToPlaylist(pl.id, item.id)
                                        }
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left hover:bg-surface transition cursor-pointer text-primary-theme"
                                      >
                                        <span className="truncate">{pl.name}</span>
                                        {inPlaylist && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 ml-1" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-bold text-primary-theme leading-snug">
                        {item.title}
                      </h2>

                      {/* Learning focus chips (rotated soft tints) */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {item.learningFocus.map((focus, idx) => {
                          const focusTints = [
                            "bg-violet-100/90 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/40",
                            "bg-sky-100/90 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/40",
                            "bg-teal-100/90 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/40",
                            "bg-rose-100/90 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/40",
                            "bg-amber-100/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/40",
                          ];
                          const tint = focusTints[idx % focusTints.length];
                          return (
                            <span
                              key={focus}
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tint}`}
                            >
                              {focus}
                            </span>
                          );
                        })}
                      </div>

                      {/* Teaching tip line */}
                      <div className="rounded-xl border border-theme bg-elevated/70 p-3 text-xs text-secondary-theme leading-relaxed">
                        <span className="font-bold text-primary-theme">Teaching tip: </span>
                        {item.suggestedActivity}
                      </div>

                      {/* Attached video indicator */}
                      {attached && (
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-violet-200/80 dark:border-violet-800/40 bg-violet-100/80 dark:bg-violet-950/50 text-[11px] text-violet-900 dark:text-violet-300">
                          <span className="inline-flex items-center gap-1 font-semibold truncate">
                            <LinkIcon className="h-3 w-3 shrink-0 text-violet-600 dark:text-violet-400" />
                            <span>YouTube attached</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDetachVideo(item.id)}
                            className="text-secondary-theme hover:text-red-600 transition cursor-pointer"
                            title="Detach video"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Media action: Watch here OR Attach video + Find on YouTube */}
                    <div className="pt-3 border-t border-theme space-y-2">
                      {embedUrl && canonicalUrl ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleWatch({
                                title: item.title,
                                embedUrl,
                                canonicalUrl,
                              })
                            }
                            className="group/btn flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-amber-300 text-amber-300 transition-transform duration-200 group-hover/btn:scale-110" />
                            <span>Watch here</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenAttachModal(item)}
                            className="rounded-xl border border-theme bg-elevated p-2 text-secondary-theme hover:text-primary-theme transition cursor-pointer"
                            title="Change attached YouTube link"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAttachModal(item)}
                            className="group/btn w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 cursor-pointer"
                          >
                            <LinkIcon className="h-3 w-3 transition-transform duration-200 group-hover/btn:scale-110" />
                            <span>Attach video</span>
                          </button>

                          <a
                            href={searchUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl border border-theme bg-elevated px-3 py-2 text-xs font-semibold text-secondary-theme hover:text-primary-theme transition"
                          >
                            <span>Search</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY VIDEOS ── */}
      {activeTab === "videos" && (
        <div id="panel-my-videos" role="tabpanel" aria-labelledby="tab-my-videos" className="space-y-6">
          {/* Header banner inside My Videos */}
          <div className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-primary-theme">My Custom Educational Videos</h2>
              <p className="text-xs text-secondary-theme mt-0.5">
                Saved YouTube songs and learning playlists stored on this device ({customVideos.length} / {MAX_CUSTOM_VIDEOS}).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out group-hover:rotate-90 motion-reduce:transform-none" />
              <span>Add YouTube link</span>
            </button>
          </div>

          {/* Videos Grid */}
          {customVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center space-y-3">
              <Tv className="h-10 w-10 text-muted-theme" />
              <h3 className="text-base font-bold text-primary-theme">No custom videos added yet</h3>
              <p className="text-xs sm:text-sm text-secondary-theme max-w-md">
                Paste any educational YouTube song, fingerplay, or nursery playlist to watch it here and organize it into lesson playlists.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:shadow transition cursor-pointer"
              >
                Add your first YouTube video
              </button>
            </div>
          ) : filteredCustomVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-10 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-theme" />
              <h3 className="text-sm font-bold text-primary-theme">No videos match current filters</h3>
              <p className="text-xs text-secondary-theme">Try resetting your keyword or category filter.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredCustomVideos.map((video) => {
                const isFavorite = favorites.has(video.id);
                const categoryName = video.categoryId ? categoryMap.get(video.categoryId) : null;
                const categoryTint = getCategoryTint(video.categoryId);

                return (
                  <article
                    key={video.id}
                    className="group flex flex-col justify-between rounded-2xl border border-theme bg-surface hover:border-sky-400/60 dark:hover:border-violet-500/40 p-5 shadow-xs transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Thumbnail or Placeholder */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center group/thumb">
                        {video.kind === "video" && video.videoId ? (
                          <img
                            src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105 duration-200"
                            onError={(e) => {
                              // If image fails to load, hide img and show fallback icon
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : null}

                        {/* Centered Play Button overlay with warm amber accent */}
                        <button
                          type="button"
                          onClick={() => handleWatch(video)}
                          aria-label={`Watch ${video.title}`}
                          className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/50 transition-colors cursor-pointer"
                        >
                          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover/thumb:scale-110 nursery-hover-playglow">
                            <Play className="h-5 w-5 fill-slate-950 ml-0.5" />
                          </div>
                        </button>

                        {/* Top-right Kind Badge */}
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                            {video.kind === "playlist" ? <ListPlus className="h-3 w-3 nursery-hover-slide" /> : <Film className="h-3 w-3 nursery-hover-wiggle" />}
                            <span>{video.kind === "playlist" ? "Playlist" : "Video"}</span>
                          </span>
                        </div>
                      </div>

                      {/* Header row: Categories & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {categoryName && (
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryTint.bg} ${categoryTint.text} ${categoryTint.border}`}>
                              {categoryName}
                            </span>
                          )}

                          {video.ageRange && (
                            <span className="inline-flex items-center rounded-md border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
                              Ages {video.ageRange}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Heart favorite button */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(video.id)}
                            aria-label={isFavorite ? `Remove ${video.title} from favorites` : `Add ${video.title} to favorites`}
                            aria-pressed={isFavorite}
                            className={`group/heart rounded-lg p-1.5 transition cursor-pointer ${
                              isFavorite
                                ? "text-amber-500 dark:text-amber-400 bg-amber-500/10"
                                : "text-secondary-theme hover:text-amber-500 hover:bg-elevated"
                            }`}
                          >
                            <Heart className={`h-4 w-4 transition-transform duration-200 ${isFavorite ? "fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400 nursery-heart-pop" : "group-hover/heart:scale-110"}`} />
                          </button>

                          {/* Add to playlist popover button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setPopoverItemId((curr) => (curr === video.id ? null : video.id))
                              }
                              aria-label={`Add ${video.title} to playlist`}
                              className="rounded-lg p-1.5 text-secondary-theme hover:text-sky-600 hover:bg-elevated transition cursor-pointer"
                            >
                              <ListPlus className="h-4 w-4 nursery-hover-slide" />
                            </button>

                            {popoverItemId === video.id && (
                              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-theme bg-elevated p-2 shadow-lg z-20 space-y-1 text-xs">
                                <div className="px-2 py-1 font-bold text-primary-theme border-b border-theme pb-1 mb-1">
                                  Add to playlist
                                </div>
                                {playlists.length === 0 ? (
                                  <div className="px-2 py-2 text-secondary-theme text-[11px]">
                                    No playlists yet. Create one under "My Playlists".
                                  </div>
                                ) : (
                                  playlists.map((pl) => {
                                    const inPlaylist = pl.itemIds.includes(video.id);
                                    return (
                                      <button
                                        key={pl.id}
                                        type="button"
                                        onClick={() =>
                                          inPlaylist
                                            ? handleRemoveFromPlaylist(pl.id, video.id)
                                            : handleAddToPlaylist(pl.id, video.id)
                                        }
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left hover:bg-surface transition cursor-pointer text-primary-theme"
                                      >
                                        <span className="truncate">{pl.name}</span>
                                        {inPlaylist && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 ml-1" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(video)}
                            aria-label={`Edit ${video.title}`}
                            className="rounded-lg p-1.5 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomVideo(video)}
                            aria-label={`Delete ${video.title}`}
                            className="rounded-lg p-1.5 text-secondary-theme hover:text-red-600 hover:bg-elevated transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-base font-bold text-primary-theme leading-snug">
                        {video.title}
                      </h2>

                      {/* Notes / Tips */}
                      {video.notes && (
                        <div className="rounded-xl border border-theme bg-elevated/70 p-3 text-xs text-secondary-theme leading-relaxed">
                          <span className="font-bold text-primary-theme">Notes: </span>
                          {video.notes}
                        </div>
                      )}
                    </div>

                    {/* Media action: Watch here button with warm amber icon */}
                    <div className="pt-3 border-t border-theme">
                      <button
                        type="button"
                        onClick={() => handleWatch(video)}
                        className="group/btn w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-amber-300 text-amber-300 transition-transform duration-200 group-hover/btn:scale-110" />
                        <span>Watch here</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MY PLAYLISTS ── */}
      {activeTab === "playlists" && (
        <div id="panel-playlists" role="tabpanel" aria-labelledby="tab-playlists" className="space-y-6">
          {/* Create new playlist form */}
          <section
            aria-label="Create playlist"
            className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme pb-3">
              <div>
                <h2 className="text-base font-bold text-primary-theme">Create Lesson Playlist</h2>
                <p className="text-xs text-secondary-theme">
                  Organize song sequences and media for your early childhood circle times. Saved on this device only.
                </p>
              </div>
              <span className="text-xs text-muted-theme">
                {playlists.length} / {MAX_PLAYLISTS} playlists
              </span>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-1.5">
              <label htmlFor="nursery-playlist-name" className="block text-xs font-bold text-primary-theme">
                Playlist Name <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input
                  id="nursery-playlist-name"
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => {
                    setNewPlaylistName(e.target.value);
                    setPlaylistError(null);
                  }}
                  maxLength={40}
                  placeholder="e.g., Circle Time Greetings, Transition Rhymes..."
                  required
                  aria-required="true"
                  disabled={playlists.length >= MAX_PLAYLISTS}
                  className="flex-1 h-11 rounded-xl border border-theme bg-elevated px-3.5 text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="submit"
                  disabled={playlists.length >= MAX_PLAYLISTS || !newPlaylistName.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-5 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Playlist</span>
                </button>
              </div>
            </form>

            {playlistError && (
              <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                {playlistError}
              </p>
            )}
          </section>

          {/* Playlist selector and manager */}
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center space-y-3">
              <ListPlus className="h-10 w-10 text-muted-theme" />
              <h3 className="text-base font-bold text-primary-theme">No playlists created yet</h3>
              <p className="text-xs sm:text-sm text-secondary-theme max-w-md">
                Create a playlist above, then browse the Library or My Videos tabs to add songs and learning media.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Playlist picker pills */}
              <div className="flex flex-wrap items-center gap-2 border-b border-theme pb-4">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setActivePlaylistId(pl.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                      activePlaylistId === pl.id
                        ? "bg-gradient-to-r from-violet-600 to-sky-700 text-white shadow-xs"
                        : "bg-surface border border-theme text-secondary-theme hover:text-primary-theme hover:bg-elevated"
                    }`}
                  >
                    <span>{pl.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        activePlaylistId === pl.id
                          ? "bg-white/20 text-white"
                          : "bg-elevated text-secondary-theme"
                      }`}
                    >
                      {pl.itemIds.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Playlist Details */}
              {activePlaylist && (
                <section
                  aria-labelledby="active-playlist-heading"
                  className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4">
                    <div className="space-y-1">
                      {editingPlaylistId === activePlaylist.id ? (
                        <div className="space-y-1">
                          <label htmlFor="nursery-rename-playlist" className="block text-xs font-bold text-primary-theme">
                            Playlist Name <span className="text-rose-500" aria-hidden="true">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="nursery-rename-playlist"
                              type="text"
                              value={editPlaylistName}
                              onChange={(e) => setEditPlaylistName(e.target.value)}
                              maxLength={40}
                              required
                              aria-required="true"
                              className="h-9 rounded-lg border border-theme bg-elevated px-2.5 text-sm font-bold text-primary-theme outline-none focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenamePlaylist(activePlaylist.id)}
                              className="rounded-lg bg-gradient-to-r from-violet-600 to-sky-700 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlaylistId(null)}
                              className="rounded-lg border border-theme px-3 py-1.5 text-xs font-semibold text-secondary-theme cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 id="active-playlist-heading" className="text-lg font-bold text-primary-theme">
                            {activePlaylist.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlaylistId(activePlaylist.id);
                              setEditPlaylistName(activePlaylist.name);
                            }}
                            className="text-xs text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                          >
                            Rename
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-secondary-theme">
                        {activePlaylist.itemIds.length} sequence items • Saved on this device only.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(activePlaylist.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer self-start sm:self-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete playlist</span>
                    </button>
                  </div>

                  {/* Playlist Items / Sequence List */}
                  {activePlaylist.itemIds.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-theme bg-elevated/50 p-8 text-center space-y-2">
                      <p className="text-sm font-semibold text-primary-theme">This playlist is empty</p>
                      <p className="text-xs text-secondary-theme">
                        Switch to the Library or My Videos tab and click the "Add to playlist" button on any card.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
                        Play next order:
                      </div>

                      {activePlaylist.itemIds.map((itemId, idx) => {
                        const item = combinedItemMap.get(itemId);
                        if (!item) return null;

                        const isFirst = idx === 0;
                        const isLast = idx === activePlaylist.itemIds.length - 1;

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-theme bg-elevated p-4 flex flex-col gap-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface border border-theme text-xs font-bold text-primary-theme">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-primary-theme truncate">
                                    {item.title}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-secondary-theme">
                                    {item.language && <span>{item.language}</span>}
                                    {item.ageRange && (
                                      <>
                                        <span>•</span>
                                        <span>Ages {item.ageRange}</span>
                                      </>
                                    )}
                                    {item.isCustom && (
                                      <span className="inline-flex items-center rounded border border-sky-200/80 dark:border-sky-700/40 bg-sky-100/90 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-1.5 py-0.2 text-[10px] font-bold">
                                        Custom Video
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                {/* Move up */}
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMoveInPlaylist(activePlaylist.id, item.id, "up")}
                                  aria-label={`Move ${item.title} up`}
                                  className="rounded-lg border border-theme bg-surface p-1.5 text-secondary-theme hover:text-primary-theme disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>

                                {/* Move down */}
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMoveInPlaylist(activePlaylist.id, item.id, "down")}
                                  aria-label={`Move ${item.title} down`}
                                  className="rounded-lg border border-theme bg-surface p-1.5 text-secondary-theme hover:text-primary-theme disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>

                                {/* Remove from playlist */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromPlaylist(activePlaylist.id, item.id)}
                                  aria-label={`Remove ${item.title} from playlist`}
                                  className="rounded-lg border border-theme bg-surface p-1.5 text-secondary-theme hover:text-red-600 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>

                                {/* Media action with warm amber play icon */}
                                {item.embedUrl && item.canonicalUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWatch({
                                        title: item.title,
                                        embedUrl: item.embedUrl!,
                                        canonicalUrl: item.canonicalUrl!,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs ml-1 cursor-pointer"
                                  >
                                    <Play className="h-3 w-3 fill-amber-300 text-amber-300" />
                                    <span>Watch</span>
                                  </button>
                                ) : item.searchQuery ? (
                                  <a
                                    href={buildSearchUrl(item.searchQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="inline-flex items-center gap-1 rounded-lg border border-theme bg-surface px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme ml-1"
                                  >
                                    <span>YouTube</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT VIDEO MODAL ── */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-video-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-lg sm:max-w-xl rounded-2xl border border-theme bg-surface p-5 sm:p-7 shadow-2xl space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b border-theme pb-3.5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Tv className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="add-video-modal-title" className="text-base font-bold text-primary-theme">
                    {modalMode === "attach"
                      ? "Attach YouTube Video"
                      : modalMode === "edit"
                      ? "Edit Video Link"
                      : "Add Educational YouTube Video"}
                  </h3>
                  <p className="text-xs text-secondary-theme">
                    {modalMode === "attach"
                      ? "Link an instructional video to stream directly from this song card."
                      : "Save a video or playlist link to watch inside the LMS."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="rounded-xl p-1.5 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* YouTube URL input */}
              <div className="space-y-1.5">
                <label htmlFor="modal-yt-url" className="block text-xs font-bold text-primary-theme">
                  YouTube Link <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={urlInputRef}
                    id="modal-yt-url"
                    type="text"
                    value={formUrl}
                    onChange={(e) => {
                      setFormUrl(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    required
                    aria-required="true"
                    className="w-full h-11 px-3.5 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {/* Validation Indicator */}
                {formUrl.trim() && (
                  <div>
                    {parsedPreview ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>Valid {parsedPreview.kind === "playlist" ? "playlist" : "video"} link detected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>That doesn't look like a valid YouTube link</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="modal-yt-title" className="block text-xs font-bold text-primary-theme">
                    Video Title <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <span className="text-[10px] text-muted-theme">
                    {formTitle.length}/{MAX_CUSTOM_VIDEO_TITLE_LENGTH}
                  </span>
                </div>
                <input
                  id="modal-yt-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    setFormError(null);
                  }}
                  maxLength={MAX_CUSTOM_VIDEO_TITLE_LENGTH}
                  placeholder="e.g., Bahay Kubo with Actions, Animal Sounds Song..."
                  required
                  aria-required="true"
                  className="w-full h-11 px-3.5 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Optional Category and Target Age Range */}
              {modalMode !== "attach" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="modal-yt-category" className="block text-xs font-semibold text-primary-theme">
                      Category (Optional)
                    </label>
                    <select
                      id="modal-yt-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="all">Uncategorized</option>
                      {initialData.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="modal-yt-age" className="block text-xs font-semibold text-primary-theme">
                      Target Age (Optional)
                    </label>
                    <select
                      id="modal-yt-age"
                      value={formAgeRange}
                      onChange={(e) => setFormAgeRange(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="all">All Preschool Ages</option>
                      <option value="2-3">Ages 2-3</option>
                      <option value="3-4">Ages 3-4</option>
                      <option value="4-5">Ages 4-5</option>
                      <option value="5-6">Ages 5-6</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              {modalMode !== "attach" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="modal-yt-notes" className="block text-xs font-semibold text-primary-theme">
                      Teaching Notes / Context (Optional)
                    </label>
                    <span className="text-[10px] text-muted-theme">
                      {formNotes.length}/{MAX_CUSTOM_VIDEO_NOTES_LENGTH}
                    </span>
                  </div>
                  <textarea
                    id="modal-yt-notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    maxLength={MAX_CUSTOM_VIDEO_NOTES_LENGTH}
                    rows={2}
                    placeholder="e.g. Great for transition from playtime to circle time; focus on gross motor gestures..."
                    className="w-full p-3 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 resize-none"
                  />
                </div>
              )}

              {/* Live Embed Preview if valid */}
              {parsedPreview && (
                <div className="space-y-2 pt-1 border-t border-theme">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-theme">
                    Live Player Preview
                  </span>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                    <iframe
                      src={parsedPreview.embedUrl}
                      title="Preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme bg-elevated text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim() || !parsedPreview}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-700 hover:from-violet-700 hover:to-sky-800 text-xs font-bold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {modalMode === "attach" ? "Attach to Song" : modalMode === "edit" ? "Update Video" : "Save Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN / OVERLAY PLAYER MODAL ── */}
      {playingMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            ref={playerModalRef}
            className="relative w-full max-w-3xl rounded-2xl border border-theme bg-surface p-4 sm:p-6 shadow-2xl space-y-4 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-theme pb-3">
              <div className="min-w-0 flex-1">
                <h3 id="player-modal-title" className="text-sm sm:text-base font-bold text-primary-theme truncate">
                  {playingMedia.title}
                </h3>
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                  Streamed via YouTube nocookie player
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPlayingMedia(null)}
                aria-label="Close player"
                className="rounded-xl p-2 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 16:9 Iframe Player */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
              <iframe
                src={playingMedia.embedUrl}
                title={playingMedia.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
              />
            </div>

            {/* Educational Streaming Disclaimer & Fallback */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-theme text-xs text-secondary-theme">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Educational streaming preview • Not stored on CDM LMS servers</span>
              </div>

              {playingMedia.canonicalUrl && (
                <a
                  href={playingMedia.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400 hover:text-violet-600 hover:underline"
                >
                  <span>Video not playing? Open on YouTube</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {deletingCustomVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div
            ref={deleteModalRef}
            className="w-full max-w-md rounded-2xl border border-theme bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-base font-bold text-primary-theme">
                  Delete Custom Video?
                </h3>
                <p className="text-xs text-secondary-theme">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-secondary-theme">
              Are you sure you want to delete <strong className="text-primary-theme font-semibold">"{deletingCustomVideo.title}"</strong> from your saved videos and any playlists?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomVideo(null)}
                className="px-4 py-2 rounded-xl border border-theme bg-elevated text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomVideo}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-bold text-white shadow-xs hover:bg-red-700 cursor-pointer"
              >
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
