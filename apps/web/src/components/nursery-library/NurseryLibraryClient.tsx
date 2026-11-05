"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  ExternalLink,
  Film,
  Filter,
  GraduationCap,
  Heart,
  Info,
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
  Volume2,
  X,
} from "lucide-react";
import type {
  NurseryCategory,
  NurseryItemType,
  NurseryLibraryData,
  NurseryLibraryItem,
  Playlist,
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
  const [activeTab, setActiveTab] = useState<"library" | "playlists">("library");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedAgeRange, setSelectedAgeRange] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Active embedded players (item IDs for which click-to-load was triggered)
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

  // Add to playlist dropdown popover
  const [popoverItemId, setPopoverItemId] = useState<string | null>(null);

  const categorySelectId = useId();
  const languageSelectId = useId();
  const ageSelectId = useId();
  const typeSelectId = useId();
  const searchInputId = useId();

  const validItemIds = useMemo(
    () => new Set(initialData.items.map((i) => i.id)),
    [initialData.items]
  );

  const itemMap = useMemo(
    () => new Map(initialData.items.map((i) => [i.id, i])),
    [initialData.items]
  );

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (storedFavs) {
        const parsed = JSON.parse(storedFavs);
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed.filter((id) => validItemIds.has(id))));
        }
      }

      const storedPlaylists = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      if (storedPlaylists) {
        const deserialized = deserializePlaylists(storedPlaylists, validItemIds);
        setPlaylists(deserialized);
        if (deserialized.length > 0) {
          setActivePlaylistId(deserialized[0].id);
        }
      }
    } catch {
      // Graceful fallback if localStorage is disabled or restricted
    }
  }, [validItemIds]);

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

  const filteredItems = useMemo(
    () =>
      filterItems(
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
      ),
    [
      initialData.items,
      initialData.categories,
      searchQuery,
      selectedCategory,
      selectedLanguage,
      selectedAgeRange,
      selectedType,
      onlyFavorites,
      favorites,
    ]
  );

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCategory !== "all" ||
      selectedLanguage !== "all" ||
      selectedAgeRange !== "all" ||
      selectedType !== "all" ||
      onlyFavorites
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedLanguage("all");
    setSelectedAgeRange("all");
    setSelectedType("all");
    setOnlyFavorites(false);
  };

  const triggerWatch = (itemId: string) => {
    setActivePlayerIds((prev) => new Set(prev).add(itemId));
  };

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const getItemTypeBadge = (type: NurseryItemType) => {
    switch (type) {
      case "song":
        return { label: "Song", icon: Music, color: "bg-pink-500/10 text-pink-700 dark:text-pink-300" };
      case "rhyme":
        return { label: "Rhyme", icon: Volume2, color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" };
      case "lullaby":
        return { label: "Lullaby", icon: Moon, color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" };
      case "educational-video":
        return { label: "Educational Video", icon: Film, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── HERO BANNER ── */}
      <section
        aria-labelledby="nursery-library-heading"
        className="relative overflow-hidden rounded-2xl border border-theme bg-surface p-6 sm:p-8 shadow-xs"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-surface pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{programCode}</span>
              </span>
              <span className="text-xs font-medium text-secondary-theme">
                {programName || "Bachelor of Early Childhood Education"}
              </span>
            </div>

            <Link
              href={`/${institute}/lesson-plans`}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Plan a lesson</span>
            </Link>
          </div>

          <div>
            <h1
              id="nursery-library-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-theme"
            >
              Nursery Song &amp; Educational Media Library
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm sm:text-base text-secondary-theme leading-relaxed">
              Curated public-domain traditional folk songs, fingerplays, rhymes, and educational
              media resources curated for early childhood pre-service teachers.
            </p>
          </div>

          {/* Hero Note */}
          <div
            role="note"
            className="flex items-start sm:items-center gap-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs text-purple-900 dark:text-purple-200"
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-purple-600 dark:text-purple-400" />
            <span className="font-medium">
              Teaching resources for early childhood lessons. Videos play from YouTube when linked.
            </span>
          </div>
        </div>
      </section>

      {/* ── TABS ── */}
      <div className="flex border-b border-theme" role="tablist" aria-label="Library Navigation">
        <button
          type="button"
          role="tab"
          id="tab-library"
          aria-selected={activeTab === "library"}
          aria-controls="panel-library"
          tabIndex={activeTab === "library" ? 0 : -1}
          onClick={() => setActiveTab("library")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "library"
              ? "text-purple-600 dark:text-purple-400"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <Music className="h-4 w-4" />
          <span>Library</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "library"
                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {filteredItems.length}
          </span>
          {activeTab === "library" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-playlists"
          aria-selected={activeTab === "playlists"}
          aria-controls="panel-playlists"
          tabIndex={activeTab === "playlists" ? 0 : -1}
          onClick={() => setActiveTab("playlists")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "playlists"
              ? "text-purple-600 dark:text-purple-400"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <ListPlus className="h-4 w-4" />
          <span>My Playlists</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "playlists"
                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {playlists.length}
          </span>
          {activeTab === "playlists" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
          )}
        </button>
      </div>

      {/* ── TAB 1: LIBRARY ── */}
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
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <X className="h-3 w-3" />
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
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
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
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">All Languages</option>
                  <option value="Filipino">Filipino</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* Age Range */}
              <div className="space-y-1.5">
                <label htmlFor={ageSelectId} className="block text-xs font-semibold text-primary-theme">
                  Age Range
                </label>
                <select
                  id={ageSelectId}
                  value={selectedAgeRange}
                  onChange={(e) => setSelectedAgeRange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">All Age Ranges</option>
                  <option value="2-3">Ages 2-3</option>
                  <option value="3-4">Ages 3-4</option>
                  <option value="4-5">Ages 4-5</option>
                  <option value="5-6">Ages 5-6</option>
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label htmlFor={typeSelectId} className="block text-xs font-semibold text-primary-theme">
                  Media Type
                </label>
                <select
                  id={typeSelectId}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">All Types</option>
                  <option value="song">Song</option>
                  <option value="rhyme">Rhyme</option>
                  <option value="lullaby">Lullaby</option>
                  <option value="educational-video">Educational Video</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label htmlFor={searchInputId} className="block text-xs font-semibold text-primary-theme">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-theme pointer-events-none" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles or focus..."
                    className="w-full h-10 rounded-xl border border-theme bg-elevated pl-9 pr-8 text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary-theme hover:text-primary-theme"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Favorites Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOnlyFavorites((prev) => !prev)}
                aria-pressed={onlyFavorites}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border cursor-pointer ${
                  onlyFavorites
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    : "bg-elevated border-theme text-secondary-theme hover:text-primary-theme"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    onlyFavorites ? "fill-rose-600 text-rose-600" : ""
                  }`}
                />
                <span>Favorites Only ({favorites.size})</span>
              </button>
            </div>
          </section>

          {/* Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center">
              <Music className="h-10 w-10 text-muted-theme mb-3" />
              <h2 className="text-base font-bold text-primary-theme">No learning resources found</h2>
              <p className="mt-1 text-xs sm:text-sm text-secondary-theme max-w-md">
                Try loosening your filter choices or search query.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-elevated border border-theme px-3.5 py-2 text-xs font-semibold text-primary-theme hover:bg-surface transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const isFavorite = favorites.has(item.id);
                const hasValidYoutube = isValidYoutubeId(item.youtubeId);
                const isPlaying = activePlayerIds.has(item.id);
                const embedUrl = hasValidYoutube ? buildEmbedUrl(item.youtubeId) : null;
                const searchUrl = buildSearchUrl(item.searchQuery);
                const typeBadge = getItemTypeBadge(item.type);
                const TypeIcon = typeBadge.icon;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-theme bg-surface p-5 shadow-xs hover:border-purple-500/40 transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top badges and Favorite button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${typeBadge.color}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeBadge.label}</span>
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
                            className={`rounded-lg p-1.5 transition cursor-pointer ${
                              isFavorite
                                ? "text-rose-600 bg-rose-500/10"
                                : "text-secondary-theme hover:text-rose-600 hover:bg-elevated"
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-600" : ""}`} />
                          </button>

                          {/* Add to playlist popover button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setPopoverItemId((curr) => (curr === item.id ? null : item.id))
                              }
                              aria-label={`Add ${item.title} to playlist`}
                              className="rounded-lg p-1.5 text-secondary-theme hover:text-purple-600 hover:bg-elevated transition cursor-pointer"
                            >
                              <ListPlus className="h-4 w-4" />
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

                      {/* Learning focus chips */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {item.learningFocus.map((focus) => (
                          <span
                            key={focus}
                            className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:text-purple-300"
                          >
                            {focus}
                          </span>
                        ))}
                      </div>

                      {/* Teaching tip line */}
                      <div className="rounded-xl border border-theme bg-elevated/70 p-3 text-xs text-secondary-theme leading-relaxed">
                        <span className="font-bold text-primary-theme">Teaching tip: </span>
                        {item.suggestedActivity}
                      </div>
                    </div>

                    {/* Media action: Click-to-load YouTube Player OR Find on YouTube */}
                    <div className="pt-3 border-t border-theme">
                      {hasValidYoutube && embedUrl ? (
                        isPlaying ? (
                          <div className="space-y-2">
                            <iframe
                              src={embedUrl}
                              title={item.title}
                              loading="lazy"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allow="encrypted-media; picture-in-picture"
                              allowFullScreen
                              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                              className="w-full aspect-video rounded-xl border border-theme"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setActivePlayerIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(item.id);
                                  return next;
                                })
                              }
                              className="text-[11px] text-secondary-theme hover:underline"
                            >
                              Close player
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerWatch(item.id)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" />
                            <span>Watch</span>
                          </button>
                        )
                      ) : (
                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-theme bg-elevated px-4 py-2 text-xs font-bold text-primary-theme hover:bg-surface transition"
                        >
                          <Search className="h-3.5 w-3.5 text-secondary-theme" />
                          <span>Find on YouTube</span>
                          <ExternalLink className="h-3 w-3 text-secondary-theme" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY PLAYLISTS ── */}
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

            <form onSubmit={handleCreatePlaylist} className="flex flex-col sm:flex-row items-stretch gap-3">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => {
                  setNewPlaylistName(e.target.value);
                  setPlaylistError(null);
                }}
                maxLength={40}
                placeholder="e.g., Circle Time Greetings, Transition Rhymes..."
                disabled={playlists.length >= MAX_PLAYLISTS}
                className="flex-1 h-11 rounded-xl border border-theme bg-elevated px-3.5 text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="submit"
                disabled={playlists.length >= MAX_PLAYLISTS || !newPlaylistName.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Create Playlist</span>
              </button>
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
                Create a playlist above, then browse the Library tab to add folk songs and learning videos.
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
                        ? "bg-purple-600 text-white shadow-xs"
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
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editPlaylistName}
                            onChange={(e) => setEditPlaylistName(e.target.value)}
                            maxLength={40}
                            className="h-9 rounded-lg border border-theme bg-elevated px-2.5 text-sm font-bold text-primary-theme outline-none focus:border-purple-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenamePlaylist(activePlaylist.id)}
                            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlaylistId(null)}
                            className="rounded-lg border border-theme px-3 py-1.5 text-xs font-semibold text-secondary-theme"
                          >
                            Cancel
                          </button>
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
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
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

                  {/* Playlist Items / Play Next View */}
                  {activePlaylist.itemIds.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-theme bg-elevated/50 p-8 text-center space-y-2">
                      <p className="text-sm font-semibold text-primary-theme">This playlist is empty</p>
                      <p className="text-xs text-secondary-theme">
                        Switch to the Library tab and use the "Add to playlist" button on any song card.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
                        Play next order:
                      </div>

                      {activePlaylist.itemIds.map((itemId, idx) => {
                        const item = itemMap.get(itemId);
                        if (!item) return null;

                        const hasValidYoutube = isValidYoutubeId(item.youtubeId);
                        const isPlaying = activePlayerIds.has(item.id);
                        const embedUrl = hasValidYoutube ? buildEmbedUrl(item.youtubeId) : null;
                        const searchUrl = buildSearchUrl(item.searchQuery);
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
                                    <span>{item.language}</span>
                                    <span>•</span>
                                    <span>Ages {item.ageRange}</span>
                                    <span>•</span>
                                    <span>{item.type}</span>
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

                                {/* Media action */}
                                {hasValidYoutube && embedUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActivePlayerIds((prev) => {
                                        const next = new Set(prev);
                                        if (isPlaying) {
                                          next.delete(item.id);
                                        } else {
                                          next.add(item.id);
                                        }
                                        return next;
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 ml-1 cursor-pointer"
                                  >
                                    <Play className="h-3 w-3 fill-white" />
                                    <span>{isPlaying ? "Hide" : "Watch"}</span>
                                  </button>
                                ) : (
                                  <a
                                    href={searchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="inline-flex items-center gap-1 rounded-lg border border-theme bg-surface px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme ml-1"
                                  >
                                    <span>YouTube</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Click-to-load video embed inside playlist row */}
                            {isPlaying && embedUrl && (
                              <div className="pt-2 border-t border-theme">
                                <iframe
                                  src={embedUrl}
                                  title={item.title}
                                  loading="lazy"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  allow="encrypted-media; picture-in-picture"
                                  allowFullScreen
                                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                                  className="w-full aspect-video rounded-xl border border-theme max-h-72"
                                />
                              </div>
                            )}
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
    </div>
  );
}

