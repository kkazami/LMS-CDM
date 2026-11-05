import rawLibraryData from "./data/library.json";
import type {
  NurseryCategory,
  NurseryLibraryData,
  NurseryLibraryItem,
} from "./types";

export const NURSERY_LIBRARY_DATA: NurseryLibraryData =
  rawLibraryData as NurseryLibraryData;

export function getNurseryLibraryData(): NurseryLibraryData {
  return NURSERY_LIBRARY_DATA;
}

export function getNurseryCategories(): NurseryCategory[] {
  return NURSERY_LIBRARY_DATA.categories;
}

export function getNurseryItems(): NurseryLibraryItem[] {
  return NURSERY_LIBRARY_DATA.items;
}

