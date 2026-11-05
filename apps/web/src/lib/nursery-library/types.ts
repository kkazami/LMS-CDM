export type NurseryItemType =
  | "song"
  | "rhyme"
  | "lullaby"
  | "educational-video";

export type NurseryLanguage = "Filipino" | "English";

export type NurseryAgeRange = "2-3" | "3-4" | "4-5" | "5-6";

export interface NurseryCategory {
  id: string;
  name: string;
  description: string;
}

export interface NurseryLibraryItem {
  id: string;
  title: string;
  type: NurseryItemType;
  language: NurseryLanguage;
  categoryId: string;
  ageRange: NurseryAgeRange;
  learningFocus: string[];
  suggestedActivity: string;
  durationHint?: string;
  youtubeId: string | null;
  searchQuery: string;
}

export interface NurseryLibraryData {
  categories: NurseryCategory[];
  items: NurseryLibraryItem[];
}

export interface Playlist {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SerializedPlaylistsPayload {
  version: number;
  playlists: Playlist[];
}

export interface NurseryFilterOptions {
  query?: string | null;
  categoryId?: string | null;
  language?: string | null;
  ageRange?: string | null;
  type?: string | null;
  onlyFavorites?: boolean;
  favoriteIds?: string[] | Set<string>;
}

